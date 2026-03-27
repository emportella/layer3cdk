import { Environment } from 'aws-cdk-lib';
import { BaseConfig } from './base.config';
import { ResourceTags } from './tags';

/**
 * Base props shared by all Layer3CDK constructs via composition.
 * Every construct-specific props interface extends this.
 */
export interface BaseConstructProps {
  config: BaseConfig;
}

/**
 * Props for constructing a {@link BaseConfig} instance.
 */
export interface BaseConfigProps {
  department: string;
  env: Environment;
  stackName: string;
  tags: ResourceTags;
  stackEnv: string;
  serviceName: string;
  team?: string;
  description?: string;
}

/**
 * Props for {@link awsArn} helper function.
 */
export interface AwsArnProps {
  region: string;
  accountId: string;
  resourceType: string;
  resourceName: string;
}
