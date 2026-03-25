import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Role } from 'aws-cdk-lib/aws-iam';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { SSMContextLevel } from './ssm.contants';

import { BaseConfig, BaseConstruct, constructId, arnExportName } from '../core';
import { ssmParameterName } from './ssm.name.conventions';

class SSMStringParameter extends BaseConstruct<StringParameter> {
  protected readonly resource: StringParameter;

  constructor(
    scope: Construct,
    parameterName: string,
    parameterValue: string,
    config: BaseConfig,
    contextLevel: SSMContextLevel,
  ) {
    const ssmStringParameterName = ssmParameterName(
      parameterName,
      config.serviceName,
      config.domain,
      contextLevel,
      config.stackEnv,
    );

    super(scope, 'ssm-string-parameter', ssmStringParameterName, config);

    this.resource = new StringParameter(
      scope,
      constructId(config.stackName, 'ssm-string-parameter', parameterName),
      {
        parameterName: ssmStringParameterName,
        stringValue: parameterValue,
      },
    );
  }

  protected getArn(): string {
    return this.resource.parameterArn;
  }

  outputArn(): void {
    const exportName = arnExportName(this.resourceName);
    new CfnOutput(this, exportName + '-id', {
      value: this.resource.parameterArn,
      exportName: exportName,
      description: `The ARN of the StringParameter ${this.resourceName}`,
    });
  }

  grantPolicies(iamRole: Role): void {
    this.resource.grantRead(iamRole);
  }
  getStringParameter(): StringParameter {
    return this.resource;
  }
  resourceRemovalPolicy(
    removalPolicy: RemovalPolicy.DESTROY | RemovalPolicy.RETAIN,
  ): void {
    this.resource.applyRemovalPolicy(removalPolicy);
  }
}

/**
 * SSM String Parameter scoped at the global level (shared across all domains and services).
 * Parameter path: `/<env>/global/<parameterName>`
 */
export class GlobalSSMStringParameter extends SSMStringParameter {
  constructor(
    scope: Construct,
    parameterName: string,
    parameterValue: string,
    config: BaseConfig,
  ) {
    super(scope, parameterName, parameterValue, config, 'global');
  }
}

/**
 * SSM String Parameter scoped at the domain level (shared across services within a domain).
 * Parameter path: `/<env>/<domain>/<parameterName>`
 */
export class DomainSSMStringParameter extends SSMStringParameter {
  constructor(
    scope: Construct,
    parameterName: string,
    parameterValue: string,
    config: BaseConfig,
  ) {
    super(scope, parameterName, parameterValue, config, 'domain');
  }
}

/**
 * SSM String Parameter scoped at the service level (private to a single service).
 * Parameter path: `/<env>/<domain>/<serviceName>/<parameterName>`
 */
export class ServiceSSMStringParameter extends SSMStringParameter {
  constructor(
    scope: Construct,
    parameterName: string,
    parameterValue: string,
    config: BaseConfig,
  ) {
    super(scope, parameterName, parameterValue, config, 'service');
  }
}
