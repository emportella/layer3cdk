import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { IAlarmAction } from 'aws-cdk-lib/aws-cloudwatch';
import { PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { SSMContextLevel } from './ssm.contants';

import {
  ABConfig,
  ABConstruct,
  generateConstructId,
  generateOutputArnExportName,
  generateSSMStringParameterName,
} from '../common';

class SSMStringParameter extends ABConstruct<StringParameter> {
  protected readonly resource: StringParameter;

  constructor(
    scope: Construct,
    parameterName: string,
    parameterValue: string,
    config: ABConfig,
    contextLevel: SSMContextLevel,
  ) {
    const ssmStringParameterName = generateSSMStringParameterName(
      parameterName,
      config.serviceName,
      config.domain,
      contextLevel,
      config.abEnv,
    );

    super(scope, 'ssm-string-parameter', ssmStringParameterName, config);

    this.resource = new StringParameter(
      scope,
      generateConstructId(
        config.stackName,
        'ssm-string-parameter',
        parameterName,
      ),
      {
        parameterName: ssmStringParameterName,
        stringValue: parameterValue,
      },
    );
  }

  protected getArn(): string {
    return this.resource.parameterArn;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected setCloudWatchAlarms(alarmAction?: IAlarmAction | undefined): void {
    throw new Error('Method not implemented.');
  }

  outputArn(): void {
    const exportName = generateOutputArnExportName(this.resourceName);
    new CfnOutput(this, exportName + '-id', {
      value: this.resource.parameterArn,
      exportName: exportName,
      description: `The ARN of the StringParameter ${this.resourceName}`,
    });
  }

  grantPolicies(iamRole: Role): void {
    this.resource.grantRead(iamRole);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected addPolicyStatements(...statements: PolicyStatement[]): void {
    throw new Error('Method not implemented.');
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

export class GlobalSSMStringParameter extends SSMStringParameter {
  constructor(
    scope: Construct,
    parameterName: string,
    parameterValue: string,
    config: ABConfig,
  ) {
    super(scope, parameterName, parameterValue, config, 'global');
  }
}

export class DomainSSMStringParameter extends SSMStringParameter {
  constructor(
    scope: Construct,
    parameterName: string,
    parameterValue: string,
    config: ABConfig,
  ) {
    super(scope, parameterName, parameterValue, config, 'domain');
  }
}

export class ServiceSSMStringParameter extends SSMStringParameter {
  constructor(
    scope: Construct,
    parameterName: string,
    parameterValue: string,
    config: ABConfig,
  ) {
    super(scope, parameterName, parameterValue, config, 'service');
  }
}
