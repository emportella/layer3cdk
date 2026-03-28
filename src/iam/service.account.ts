import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { OpenIdConnectProvider } from 'aws-cdk-lib/aws-eks';
import {
  FederatedPrincipal,
  OpenIdConnectPrincipal,
  PolicyStatement,
  Role,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { BaseConfig, BaseConstruct, ConstructIdResolver } from '../core';
import { ServiceAccountRoleProps } from './iam.construct.props';
import {
  serviceAccountName,
  serviceAccountRoleName,
} from './iam.name.conventions';
import { EksClusterConfig } from '../config/config.eks.cluster';
import { EnvConfig } from '../config/config.interfaces';

/**
 * IAM role assumed by a Kubernetes service account via EKS OIDC federation.
 * Automatically wires the OIDC trust policy so pods running under the service
 * account name derived from `config.serviceName` can assume this role.
 *
 * @param scope - The construct scope.
 * @param config - The BaseConfig object.
 * @param oidcProviderArns - Per-environment OIDC provider ARNs for EKS cluster federation.
 */
export class ServiceAccountRole extends BaseConstruct<Role> {
  private readonly federatedPrincipal: FederatedPrincipal;
  protected readonly resource: Role;
  constructor(scope: Construct, props: ServiceAccountRoleProps) {
    const { config, oidcProviderArns } = props;
    const roleName = serviceAccountRoleName(
      config.serviceName,
      config.stackEnv,
    );
    super(scope, 'service-account-role', 'eks-sa', config);
    this.federatedPrincipal = new EksFederatedOIDCPrincipal(
      this,
      config,
      oidcProviderArns,
    );
    this.resource = new Role(scope, this.resolver.childId('role'), {
      assumedBy: this.federatedPrincipal,
      roleName: roleName,
      path: '/eks-service-accounts/',
    });
  }
  getArn(): string {
    return this.resource.roleArn;
  }
  outputArn(): void {
    const exportName = this.resolver.arnExportName();
    new CfnOutput(this, exportName + '-id', {
      value: this.resource.roleArn,
      exportName: exportName,
      description: `The ARN of the Role ${this.resourceName}`,
    });
  }
  addPolicyStatements(...statements: PolicyStatement[]): void {
    statements.forEach((statement) => {
      this.resource.addToPolicy(statement);
    });
  }
  addToPolicy(statement: PolicyStatement) {
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
  protected readonly config: BaseConfig;

  constructor(
    scope: Construct,
    config: BaseConfig,
    oidcProviderArns: EnvConfig,
    serviceName?: string,
  ) {
    const saName = serviceAccountName(serviceName || config.serviceName);

    const oidcResolver = new ConstructIdResolver({
      stackName: config.stackName,
      resourceType: 'oidc-provider',
      resourceName: saName,
    });

    const eksClusterConfig = new EksClusterConfig(scope, {
      config,
      oidcProviderArns,
    });

    const openIdConnectProvider =
      OpenIdConnectProvider.fromOpenIdConnectProviderArn(
        scope,
        oidcResolver.constructId,
        eksClusterConfig.getOidcProviderArn(),
      );

    const oidcUrl = openIdConnectProvider.openIdConnectProviderIssuer;
    const namespace = eksClusterConfig.getNameSpaceRule();

    super(openIdConnectProvider, {
      StringEquals: {
        [`${oidcUrl}:aud`]: 'sts.amazonaws.com',
      },
      StringLike: {
        [`${oidcUrl}:sub`]: `system:serviceaccount:${namespace}:${saName}`,
      },
    });
    this.config = config;
  }
}
