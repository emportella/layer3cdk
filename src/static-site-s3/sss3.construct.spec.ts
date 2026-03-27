import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
  AllowedMethods,
  CachePolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { BaseConfig } from '../core';
import { testconfig } from '../test/common.test.const';
import { SSS3 } from './sss3.construct';
import { SSS3Props } from './sss3.construct.props';
import { sss3BucketName } from './sss3.name.conventions';

describe('SSS3', () => {
  let stack: Stack;
  let config: BaseConfig;
  const siteName = 'admin-portal';
  const domainName = 'admin.example.com';

  const createHostedZone = (s: Stack) =>
    HostedZone.fromHostedZoneAttributes(s, 'Zone', {
      hostedZoneId: 'Z1234567890',
      zoneName: 'example.com',
    });

  const createSite = (
    s: Stack,
    c: BaseConfig,
    overrides?: Partial<
      Omit<SSS3Props, 'config' | 'siteName' | 'domainName' | 'hostedZone'>
    >,
  ) => {
    const hostedZone = createHostedZone(s);
    return new SSS3(s, {
      config: c,
      siteName,
      domainName,
      hostedZone,
      ...overrides,
    });
  };

  beforeEach(() => {
    stack = new Stack(undefined, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    config = testconfig;
  });

  // --- S3 Bucket ---

  it('should create a private S3 bucket with BlockPublicAccess', () => {
    createSite(stack, config);
    Template.fromStack(stack).hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  it('should create bucket with S3 managed encryption', () => {
    createSite(stack, config);
    Template.fromStack(stack).hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      },
    });
  });

  it('should create bucket with the correct name', () => {
    createSite(stack, config);
    const expectedName = sss3BucketName(siteName, config);
    Template.fromStack(stack).hasResourceProperties('AWS::S3::Bucket', {
      BucketName: expectedName,
    });
  });

  it('should have DESTROY removal policy in dev', () => {
    createSite(stack, config);
    Template.fromStack(stack).hasResource('AWS::S3::Bucket', {
      DeletionPolicy: 'Delete',
    });
  });

  it('should have RETAIN removal policy and versioning in prd', () => {
    const prdConfig = new BaseConfig({
      domain: config.domain,
      env: config.env,
      stackName: config.stackName,
      tags: config.tags,
      stackEnv: 'prd',
      serviceName: config.serviceName,
    });
    stack = new Stack(undefined, 'ProdStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    createSite(stack, prdConfig);
    Template.fromStack(stack).hasResource('AWS::S3::Bucket', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
    Template.fromStack(stack).hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: { Status: 'Enabled' },
    });
  });

  // --- CloudFront Distribution ---

  it('should create a CloudFront distribution', () => {
    createSite(stack, config);
    Template.fromStack(stack).resourceCountIs(
      'AWS::CloudFront::Distribution',
      1,
    );
  });

  it('should configure HTTPS redirect', () => {
    createSite(stack, config);
    Template.fromStack(stack).hasResourceProperties(
      'AWS::CloudFront::Distribution',
      {
        DistributionConfig: Match.objectLike({
          DefaultCacheBehavior: Match.objectLike({
            ViewerProtocolPolicy: 'redirect-to-https',
          }),
        }),
      },
    );
  });

  it('should set custom domain alias', () => {
    createSite(stack, config);
    Template.fromStack(stack).hasResourceProperties(
      'AWS::CloudFront::Distribution',
      {
        DistributionConfig: Match.objectLike({
          Aliases: [domainName],
        }),
      },
    );
  });

  it('should use TLS 1.2 minimum', () => {
    createSite(stack, config);
    Template.fromStack(stack).hasResourceProperties(
      'AWS::CloudFront::Distribution',
      {
        DistributionConfig: Match.objectLike({
          ViewerCertificate: Match.objectLike({
            MinimumProtocolVersion: 'TLSv1.2_2021',
          }),
        }),
      },
    );
  });

  it('should configure SPA error responses by default', () => {
    createSite(stack, config);
    Template.fromStack(stack).hasResourceProperties(
      'AWS::CloudFront::Distribution',
      {
        DistributionConfig: Match.objectLike({
          CustomErrorResponses: Match.arrayWith([
            Match.objectLike({
              ErrorCode: 403,
              ResponseCode: 200,
              ResponsePagePath: '/index.html',
            }),
            Match.objectLike({
              ErrorCode: 404,
              ResponseCode: 200,
              ResponsePagePath: '/index.html',
            }),
          ]),
        }),
      },
    );
  });

  it('should not configure error responses in static mode', () => {
    createSite(stack, config, {
      siteConfig: { default: { siteType: 'static' } },
    });
    const template = Template.fromStack(stack);
    const distributions = template.findResources(
      'AWS::CloudFront::Distribution',
    );
    const distKey = Object.keys(distributions)[0];
    const distConfig = distributions[distKey].Properties.DistributionConfig;
    expect(distConfig.CustomErrorResponses).toBeUndefined();
  });

  it('should create OAC for S3 origin', () => {
    createSite(stack, config);
    Template.fromStack(stack).resourceCountIs(
      'AWS::CloudFront::OriginAccessControl',
      1,
    );
  });

  it('should set default root object to index.html', () => {
    createSite(stack, config);
    Template.fromStack(stack).hasResourceProperties(
      'AWS::CloudFront::Distribution',
      {
        DistributionConfig: Match.objectLike({
          DefaultRootObject: 'index.html',
        }),
      },
    );
  });

  // --- WAF ---

  it('should associate WAF WebACL when provided', () => {
    const wafArn =
      'arn:aws:wafv2:us-east-1:123456789012:global/webacl/my-acl/abc123';
    createSite(stack, config, { wafWebAclArn: wafArn });
    Template.fromStack(stack).hasResourceProperties(
      'AWS::CloudFront::Distribution',
      {
        DistributionConfig: Match.objectLike({
          WebACLId: wafArn,
        }),
      },
    );
  });

  it('should not associate WAF when not provided', () => {
    createSite(stack, config);
    const template = Template.fromStack(stack);
    const distributions = template.findResources(
      'AWS::CloudFront::Distribution',
    );
    const distKey = Object.keys(distributions)[0];
    expect(
      distributions[distKey].Properties.DistributionConfig.WebACLId,
    ).toBeUndefined();
  });

  // --- ACM Certificate ---

  it('should create ACM certificate with DNS validation by default', () => {
    createSite(stack, config);
    Template.fromStack(stack).hasResourceProperties(
      'AWS::CertificateManager::Certificate',
      {
        DomainName: domainName,
        ValidationMethod: 'DNS',
      },
    );
  });

  it('should use imported certificate when provided', () => {
    const certArn =
      'arn:aws:acm:us-east-1:123456789012:certificate/abc-123-def';
    createSite(stack, config, {
      certificate: { type: 'import', certificateArn: certArn },
    });
    Template.fromStack(stack).resourceCountIs(
      'AWS::CertificateManager::Certificate',
      0,
    );
    Template.fromStack(stack).hasResourceProperties(
      'AWS::CloudFront::Distribution',
      {
        DistributionConfig: Match.objectLike({
          ViewerCertificate: Match.objectLike({
            AcmCertificateArn: certArn,
          }),
        }),
      },
    );
  });

  // --- Route 53 ---

  it('should create A and AAAA records aliased to CloudFront', () => {
    createSite(stack, config);
    Template.fromStack(stack).hasResourceProperties('AWS::Route53::RecordSet', {
      Name: `${domainName}.`,
      Type: 'A',
      AliasTarget: Match.objectLike({
        DNSName: Match.anyValue(),
      }),
    });
    Template.fromStack(stack).hasResourceProperties('AWS::Route53::RecordSet', {
      Name: `${domainName}.`,
      Type: 'AAAA',
      AliasTarget: Match.objectLike({
        DNSName: Match.anyValue(),
      }),
    });
  });

  // --- Security Headers ---

  it('should create a response headers policy with security headers', () => {
    createSite(stack, config);
    Template.fromStack(stack).hasResourceProperties(
      'AWS::CloudFront::ResponseHeadersPolicy',
      {
        ResponseHeadersPolicyConfig: Match.objectLike({
          SecurityHeadersConfig: Match.objectLike({
            StrictTransportSecurity: Match.objectLike({
              Override: true,
              IncludeSubdomains: true,
            }),
            ContentTypeOptions: { Override: true },
            FrameOptions: Match.objectLike({
              FrameOption: 'DENY',
              Override: true,
            }),
          }),
        }),
      },
    );
  });

  // --- IAM Grants ---

  it('should grant deploy permissions', () => {
    const site = createSite(stack, config);
    const role = new Role(stack, 'DeployRole', {
      assumedBy: new ServicePrincipal('codebuild.amazonaws.com'),
    });
    site.grantDeploy(role);

    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'cloudfront:CreateInvalidation',
            Effect: 'Allow',
          }),
        ]),
      }),
    });
  });

  // --- Outputs ---

  it('should create CfnOutputs for distribution and bucket', () => {
    createSite(stack, config);
    const template = Template.fromStack(stack);

    const distIdOutputs = template.findOutputs(
      '*',
      Match.objectLike({
        Export: {
          Name: `output-${siteName}-distribution-id`,
        },
      }),
    );
    expect(Object.keys(distIdOutputs).length).toBe(1);

    const bucketOutputs = template.findOutputs(
      '*',
      Match.objectLike({
        Export: {
          Name: `output-${siteName}-bucket-name`,
        },
      }),
    );
    expect(Object.keys(bucketOutputs).length).toBe(1);
  });

  // --- Validation ---

  it('should add validation error when prd uses DESTROY removal policy', () => {
    const prdConfig = new BaseConfig({
      domain: config.domain,
      env: config.env,
      stackName: config.stackName,
      tags: config.tags,
      stackEnv: 'prd',
      serviceName: config.serviceName,
    });
    stack = new Stack(undefined, 'ProdStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    const site = createSite(stack, prdConfig, {
      siteConfig: {
        default: {
          removalPolicy: RemovalPolicy.DESTROY,
          autoDeleteObjects: true,
        },
        prd: {
          removalPolicy: RemovalPolicy.DESTROY,
          autoDeleteObjects: true,
        },
      },
    });
    const errors = site.node.validate();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('DESTROY');
  });

  // --- Additional Behaviors (API proxy) ---

  it('should add additional behaviors for API proxying', () => {
    createSite(stack, config, {
      additionalBehaviors: {
        '/api/*': {
          origin: new HttpOrigin('api.example.com'),
          viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          cachePolicy: CachePolicy.CACHING_DISABLED,
        },
      },
    });
    Template.fromStack(stack).hasResourceProperties(
      'AWS::CloudFront::Distribution',
      {
        DistributionConfig: Match.objectLike({
          CacheBehaviors: Match.arrayWith([
            Match.objectLike({
              PathPattern: '/api/*',
              ViewerProtocolPolicy: 'https-only',
            }),
          ]),
        }),
      },
    );
  });

  it('should not have additional behaviors when not provided', () => {
    createSite(stack, config);
    const template = Template.fromStack(stack);
    const distributions = template.findResources(
      'AWS::CloudFront::Distribution',
    );
    const distKey = Object.keys(distributions)[0];
    expect(
      distributions[distKey].Properties.DistributionConfig.CacheBehaviors,
    ).toBeUndefined();
  });

  // --- User config overrides ---

  it('should allow user to override siteConfig', () => {
    createSite(stack, config, {
      siteConfig: { default: { defaultRootObject: 'app.html' } },
    });
    Template.fromStack(stack).hasResourceProperties(
      'AWS::CloudFront::Distribution',
      {
        DistributionConfig: Match.objectLike({
          DefaultRootObject: 'app.html',
        }),
      },
    );
  });
});
