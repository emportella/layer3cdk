import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { ABConfig, ABConstruct } from '../common';
import { RemovalPolicy } from 'aws-cdk-lib';
import { IAlarmAction } from 'aws-cdk-lib/aws-cloudwatch';
import { Role, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { SecretsContextLevel } from './secrets.constants';

class ABSecrets extends ABConstruct<Secret> {
  private readonly secret: Secret;

  constructor(
    scope: Construct,
    parameterName: string,
    config: ABConfig,
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
  protected outputArn(): void {
    throw new Error('Method not implemented.');
  }

  protected grantPolicies(iamRole: Role): void {
    this.secret.grantRead(iamRole);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected addPolicyStatements(...statements: PolicyStatement[]): void {
    throw new Error('Method not implemented.');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected setCloudWatchAlarms(...alarmActions: IAlarmAction[]): void {
    throw new Error('Method not implemented.');
  }

  protected resourceRemovalPolicy(
    removalPolicy: RemovalPolicy.RETAIN | RemovalPolicy.DESTROY,
  ): void {
    this.secret.applyRemovalPolicy(removalPolicy);
  }
}

export class GlobalSecrets extends ABSecrets {
  constructor(scope: Construct, parameterName: string, config: ABConfig) {
    super(scope, parameterName, config, 'global');
  }
}
