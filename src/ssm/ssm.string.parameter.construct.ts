import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Role } from 'aws-cdk-lib/aws-iam';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { SSMContextLevel } from './ssm.contants';

import { BaseConfig, BaseConstruct } from '../core';
import { SSMStringParameterProps } from './ssm.construct.props';
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
    const ssmStringParameterName = ssmParameterName({
      parameterName,
      serviceName: config.serviceName,
      department: config.department,
      contextLevel,
      env: config.stackEnv,
    });

    super(scope, 'ssm-str-param', parameterName, config);

    this.resource = new StringParameter(this, 'Resource', {
      parameterName: ssmStringParameterName,
      stringValue: parameterValue,
    });
  }

  protected getArn(): string {
    return this.resource.parameterArn;
  }

  outputArn(): void {
    const exportName = this.resolver.arnExportName();
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
 * SSM String Parameter scoped at the global level (shared across all departments and services).
 * Parameter path: `/<env>/global/<parameterName>`
 */
export class GlobalSSMStringParameter extends SSMStringParameter {
  constructor(scope: Construct, props: SSMStringParameterProps) {
    super(
      scope,
      props.parameterName,
      props.parameterValue,
      props.config,
      'global',
    );
  }
}

/**
 * SSM String Parameter scoped at the department level (shared across services within a department).
 * Parameter path: `/<env>/<department>/<parameterName>`
 */
export class DepartmentSSMStringParameter extends SSMStringParameter {
  constructor(scope: Construct, props: SSMStringParameterProps) {
    super(
      scope,
      props.parameterName,
      props.parameterValue,
      props.config,
      'department',
    );
  }
}

/**
 * SSM String Parameter scoped at the service level (private to a single service).
 * Parameter path: `/<env>/<department>/<serviceName>/<parameterName>`
 */
export class ServiceSSMStringParameter extends SSMStringParameter {
  constructor(scope: Construct, props: SSMStringParameterProps) {
    super(
      scope,
      props.parameterName,
      props.parameterValue,
      props.config,
      'service',
    );
  }
}
