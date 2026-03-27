import { Environment, StackProps } from 'aws-cdk-lib';
import { BaseConfigProps } from './base.construct.props';
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

  constructor(props: BaseConfigProps) {
    this.domain = props.domain;
    this.env = props.env;
    this.stackName = props.stackName;
    this.tags = props.tags;
    this.stackEnv = props.stackEnv;
    this.serviceName = props.serviceName;
    this.description = props.description;
  }
}

/** Extends {@link BaseConfig} with additional stack-specific properties. */
export type BaseConfigExtended<T = unknown> = BaseConfig & T;
