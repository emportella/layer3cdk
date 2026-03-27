import { CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  Distribution,
  ViewerProtocolPolicy,
  AllowedMethods,
  CachePolicy,
  SecurityPolicyProtocol,
  HttpVersion,
  ErrorResponse,
  ResponseHeadersPolicy,
  HeadersFrameOption,
  HeadersReferrerPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import {
  Bucket,
  BlockPublicAccess,
  BucketEncryption,
  ObjectOwnership,
} from 'aws-cdk-lib/aws-s3';
import {
  Certificate,
  CertificateValidation,
  ICertificate,
} from 'aws-cdk-lib/aws-certificatemanager';
import { ARecord, AaaaRecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { PolicyStatement, Effect, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import {
  BaseConstruct,
  constructId,
  arnExportName,
  outputExportName,
  resolveAndMergeEnvProps,
} from '../core';
import { SSS3Props, CertificateConfig } from './sss3.construct.props';
import { SSS3Config, SSS3_ENVIRONMENTS_PROPS } from './sss3.default.props';
import {
  sss3BucketName,
  sss3DistributionComment,
} from './sss3.name.conventions';

/**
 * Static Site S3 (SSS3) — all-in-one static website / SPA hosting construct.
 * Creates a private S3 bucket served via CloudFront with HTTPS, custom domain,
 * security headers, and optional WAF protection.
 *
 * @example
 * ```typescript
 * const site = new SSS3(this, {
 *   config,
 *   siteName: 'admin-portal',
 *   domainName: 'admin.example.com',
 *   hostedZone: HostedZone.fromHostedZoneAttributes(this, 'Zone', {
 *     hostedZoneId: 'Z1234',
 *     zoneName: 'example.com',
 *   }),
 * });
 * site.grantDeploy(serviceAccountRole.getRole());
 * ```
 */
export class SSS3 extends BaseConstruct<Distribution> {
  protected readonly resource: Distribution;
  /** The private S3 bucket holding the site assets. Use for deployment pipelines. */
  readonly bucket: Bucket;
  /** The CloudFront distribution serving the site. */
  readonly distribution: Distribution;
  /** The full domain name for the site. */
  readonly domainName: string;
  private readonly resolvedConfig: SSS3Config;

  constructor(scope: Construct, props: SSS3Props) {
    const {
      config,
      siteName,
      domainName,
      hostedZone,
      certificate: certificateConfig,
      wafWebAclArn,
      additionalBehaviors,
      siteConfig,
    } = props;

    super(scope, 's3-static-site', siteName, config);
    this.domainName = domainName;

    // 1. Resolve environment-aware config
    this.resolvedConfig = resolveAndMergeEnvProps(
      SSS3_ENVIRONMENTS_PROPS,
      config,
      siteConfig as Parameters<typeof resolveAndMergeEnvProps<SSS3Config>>[2],
    );

    // 2. Create private S3 bucket
    const bucketName = sss3BucketName(siteName, config);
    this.bucket = new Bucket(
      this,
      constructId(config.stackName, 's3-static-site', `${siteName}-bucket`),
      {
        bucketName,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        encryption: BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        removalPolicy: this.resolvedConfig.removalPolicy,
        autoDeleteObjects: this.resolvedConfig.autoDeleteObjects,
        versioned: this.resolvedConfig.versioned,
        objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      },
    );

    // 3. Create or import ACM certificate
    const cert = this.resolveCertificate(certificateConfig, hostedZone);

    // 4. Security headers policy
    const responseHeadersPolicy = new ResponseHeadersPolicy(
      this,
      'SecurityHeaders',
      {
        securityHeadersBehavior: {
          strictTransportSecurity: {
            accessControlMaxAge: Duration.seconds(63072000),
            includeSubdomains: true,
            override: true,
          },
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: HeadersFrameOption.DENY,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy:
              HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
        },
      },
    );

    // 5. Create CloudFront Distribution
    this.distribution = new Distribution(
      this,
      constructId(config.stackName, 's3-static-site', `${siteName}-dist`),
      {
        defaultBehavior: {
          origin: S3BucketOrigin.withOriginAccessControl(this.bucket),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
          responseHeadersPolicy,
        },
        domainNames: [domainName],
        certificate: cert,
        defaultRootObject: this.resolvedConfig.defaultRootObject,
        errorResponses: this.buildErrorResponses(),
        minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
        httpVersion: HttpVersion.HTTP2_AND_3,
        additionalBehaviors,
        webAclId: wafWebAclArn,
        comment: sss3DistributionComment(siteName, config),
      },
    );
    this.resource = this.distribution;

    // 6. Route 53 A + AAAA records
    const target = RecordTarget.fromAlias(
      new CloudFrontTarget(this.distribution),
    );
    new ARecord(
      this,
      constructId(config.stackName, 's3-static-site', `${siteName}-a`),
      {
        zone: hostedZone,
        recordName: domainName,
        target,
      },
    );
    new AaaaRecord(
      this,
      constructId(config.stackName, 's3-static-site', `${siteName}-aaaa`),
      {
        zone: hostedZone,
        recordName: domainName,
        target,
      },
    );

    // 7. Validate
    this.validateProps();

    // 8. Outputs
    this.createOutputs();
  }

  private resolveCertificate(
    certificateConfig: CertificateConfig | undefined,
    hostedZone: SSS3Props['hostedZone'],
  ): ICertificate {
    const certConfig = certificateConfig ?? { type: 'create' as const };

    if (certConfig.type === 'import') {
      return Certificate.fromCertificateArn(
        this,
        'ImportedCertificate',
        certConfig.certificateArn,
      );
    }

    return new Certificate(this, 'Certificate', {
      domainName: this.domainName,
      validation: CertificateValidation.fromDns(hostedZone),
    });
  }

  private buildErrorResponses(): ErrorResponse[] {
    if (this.resolvedConfig.siteType !== 'spa') {
      return [];
    }
    return [
      {
        httpStatus: 403,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: Duration.seconds(60),
      },
      {
        httpStatus: 404,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: Duration.seconds(60),
      },
    ];
  }

  private validateProps(): void {
    const validationErrors: string[] = [];
    if (this.config.stackEnv === 'prd') {
      if (this.resolvedConfig.removalPolicy === RemovalPolicy.DESTROY) {
        validationErrors.push(
          'SSS3 S3 bucket must not use RemovalPolicy.DESTROY in production',
        );
      }
      if (this.resolvedConfig.autoDeleteObjects) {
        validationErrors.push(
          'SSS3 S3 bucket must not use autoDeleteObjects in production',
        );
      }
    }
    if (validationErrors.length > 0) {
      this.node.addValidation({
        validate: () => validationErrors,
      });
    }
  }

  private createOutputs(): void {
    new CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      exportName: outputExportName({
        resourceName: this.resourceName,
        paramType: 'distribution-id',
      }),
      description: `CloudFront distribution ID for ${this.domainName}`,
    });

    new CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      exportName: outputExportName({
        resourceName: this.resourceName,
        paramType: 'distribution-domain',
      }),
      description: `CloudFront domain name for ${this.domainName}`,
    });

    new CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      exportName: outputExportName({
        resourceName: this.resourceName,
        paramType: 'bucket-name',
      }),
      description: `S3 bucket name for ${this.domainName}`,
    });
  }

  /** Returns the CloudFront distribution ARN. */
  public getArn(): string {
    return `arn:aws:cloudfront::${this.config.env.account}:distribution/${this.distribution.distributionId}`;
  }

  /** Returns the CloudFront distribution ID. */
  public getDistributionId(): string {
    return this.distribution.distributionId;
  }

  /** Exports the distribution ARN as a CloudFormation output. */
  public outputArn(): void {
    const exportName = arnExportName(this.resourceName);
    new CfnOutput(this, exportName + '-id', {
      value: this.getArn(),
      exportName,
      description: `The ARN of the CloudFront distribution for ${this.domainName}`,
    });
  }

  /**
   * Grants an IAM role permissions to deploy to this static site:
   * - S3: PutObject, DeleteObject, ListBucket on the bucket
   * - CloudFront: CreateInvalidation on the distribution
   */
  public grantDeploy(iamRole: Role): void {
    this.bucket.grantReadWrite(iamRole);
    iamRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['cloudfront:CreateInvalidation'],
        resources: [this.getArn()],
      }),
    );
  }

  /** Alias for {@link grantDeploy}. */
  public grantPolicies(iamRole: Role): void {
    this.grantDeploy(iamRole);
  }

  public resourceRemovalPolicy(
    removalPolicy: RemovalPolicy.DESTROY | RemovalPolicy.RETAIN,
  ): void {
    this.bucket.applyRemovalPolicy(removalPolicy);
  }
}
