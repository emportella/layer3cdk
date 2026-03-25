import { Environment, StackProps } from 'aws-cdk-lib';
import { StackEnv, Domain } from './constants';
import { ResourceTags } from './tags';

/**
 * Core configuration for all Layer3CDK stacks. Holds environment, naming, and tagging metadata
 * used by constructs to generate consistent resource names and apply standard tags.
 */
export class BaseConfig implements StackProps {
  readonly domain: Domain;
  readonly env: Environment;
  readonly stackName: string;
  readonly tags: ResourceTags;
  readonly stackEnv: StackEnv;
  readonly serviceName: string;
  readonly description?: string;

  constructor(
    domain: Domain,
    env: Environment,
    stackName: string,
    tags: ResourceTags,
    stackEnv: StackEnv,
    serviceName: string,
    description?: string,
  ) {
    this.domain = domain;
    this.env = env;
    this.stackName = stackName;
    this.tags = tags;
    this.stackEnv = stackEnv;
    this.serviceName = serviceName;
    this.description = description;
  }
}

/** Extends {@link BaseConfig} with additional stack-specific properties. */
export type BaseConfigExtended<T = unknown> = BaseConfig & T;
