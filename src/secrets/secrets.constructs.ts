import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { BaseConfig, BaseConstruct } from '../core';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { SecretsContextLevel } from './secrets.constants';
import { GlobalSecretsProps } from './secrets.construct.props';

class BaseSecrets extends BaseConstruct<Secret> {
  private readonly secret: Secret;

  constructor(
    scope: Construct,
    parameterName: string,
    config: BaseConfig,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    contextLevel: SecretsContextLevel,
  ) {
    super(scope, 'secrets', parameterName, config);

    this.secret = new Secret(this, 'Secret');
  }

  /**
   * Retrieves the ARN (Amazon Resource Name) of the secret.
   * @returns The ARN of the secret.
   */
  protected getArn(): string {
    return this.secret.secretArn;
  }
  protected grantPolicies(iamRole: Role): void {
    this.secret.grantRead(iamRole);
  }
  protected resourceRemovalPolicy(
    removalPolicy: RemovalPolicy.RETAIN | RemovalPolicy.DESTROY,
  ): void {
    this.secret.applyRemovalPolicy(removalPolicy);
  }
}

/**
 * Secrets Manager secret scoped at the global level (shared across all domains and services).
 * Grants read-only access via {@link GlobalSecrets.grantPolicies}.
 */
export class GlobalSecrets extends BaseSecrets {
  constructor(scope: Construct, props: GlobalSecretsProps) {
    super(scope, props.parameterName, props.config, 'global');
  }
}
