import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { IAlarmAction } from 'aws-cdk-lib/aws-cloudwatch';
import { OpenIdConnectProvider } from 'aws-cdk-lib/aws-eks';
import {
  FederatedPrincipal,
  OpenIdConnectPrincipal,
  PolicyStatement,
  Role,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import {
  ABConfig,
  ABConstruct,
  generateOutputArnExportName,
  generateServiceAccountName,
  generateServiceAccountRoleName,
  generateConstructId,
} from '../common';
import { ABEksClusterConfig } from '../config/config.eks.cluster';

export class ServiceAccountRole extends ABConstruct<Role> {
  private readonly federatedPrincipal: FederatedPrincipal;
  protected readonly resource: Role;
  constructor(scope: Construct, config: ABConfig) {
    const roleName = generateServiceAccountRoleName(
      config.serviceName,
      config.abEnv,
    );
    super(scope, 'service-account-role', roleName, config);
    this.federatedPrincipal = new EksFederatedOIDCPrincipal(this, config);
    this.resource = new Role(
      scope,
      generateConstructId(config.stackName, 'role', roleName),
      {
        assumedBy: this.federatedPrincipal,
        roleName: roleName,
        path: '/eks-service-accounts/',
      },
    );
  }
  getArn(): string {
    return this.resource.roleArn;
  }
  outputArn(): void {
    const exportName = generateOutputArnExportName(this.resourceName);
    new CfnOutput(this, exportName + '-id', {
      value: this.resource.roleArn,
      exportName: exportName,
      description: `The ARN of the Role ${this.resourceName}`,
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected grantPolicies(iamRole: Role): void {
    throw new Error('Method not implemented.');
  }
  addPolicyStatements(...statements: PolicyStatement[]): void {
    statements.forEach((statement) => {
      this.resource.addToPolicy(statement);
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected setCloudWatchAlarms(...alarmActions: IAlarmAction[]): void {
    throw new Error('Method not implemented.');
  }
  addToPolicy(statement: any) {
    this.resource.addToPolicy(statement);
  }
  getRole(): Role {
    return this.resource;
  }
  resourceRemovalPolicy(
    removalPolicy: RemovalPolicy.DESTROY | RemovalPolicy.RETAIN,
  ): void {
    this.resource.applyRemovalPolicy(removalPolicy);
  }
}

class EksFederatedOIDCPrincipal extends OpenIdConnectPrincipal {
  protected readonly config: ABConfig;

  constructor(scope: Construct, config: ABConfig, serviceName?: string) {
    const serviceAccountName = generateServiceAccountName(
      serviceName || config.serviceName,
    );

    const aBEksClusterConfig = new ABEksClusterConfig(scope, config);

    const openIdConnectProvider =
      OpenIdConnectProvider.fromOpenIdConnectProviderArn(
        scope,
        generateConstructId(
          config.stackName,
          'oidc-provider',
          serviceAccountName,
        ),
        aBEksClusterConfig.getOidcProviderArn(),
      );

    const oidcUrl = openIdConnectProvider.openIdConnectProviderIssuer;
    const namespace = aBEksClusterConfig.getNameSpaceRule();

    super(openIdConnectProvider, {
      StringEquals: {
        [`${oidcUrl}:aud`]: 'sts.amazonaws.com',
      },
      StringLike: {
        [`${oidcUrl}:sub`]: `system:serviceaccount:${namespace}:${serviceAccountName}`,
      },
    });
    this.config = config;
  }
}
