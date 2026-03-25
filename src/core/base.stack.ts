import { Stack, App } from 'aws-cdk-lib';
import { BaseConfig } from './base.config';
import { constructId } from './name.conventions';

/**
 * Abstract base stack that derives its construct ID from the {@link BaseConfig} stack name.
 * Extend this for every Layer3CDK CloudFormation stack.
 */
export abstract class BaseStack extends Stack {
  constructor(scope: App, config: BaseConfig) {
    super(scope, constructId(config.stackName, 'stack', 'id'), config);
  }
}
