import { Environment, StackProps } from 'aws-cdk-lib';
import { BaseConfigProps } from './base.construct.props';
import { ResourceTags } from './tags';

/**
 * Configuration object passed to every Layer3CDK construct.
 * Carries environment, department, team, service name, tags, and CDK environment.
 */
export class BaseConfig implements StackProps {
  readonly department: string;
  readonly env: Environment;
  readonly stackName: string;
  readonly tags: ResourceTags;
  readonly stackEnv: string;
  readonly serviceName: string;
  readonly team?: string;
  readonly description?: string;

  constructor(props: BaseConfigProps) {
    this.department = props.department;
    this.env = props.env;
    this.stackName = props.stackName;
    this.tags = props.tags;
    this.stackEnv = props.stackEnv;
    this.serviceName = props.serviceName;
    this.team = props.team;
    this.description = props.description;
  }
}

/** Extends {@link BaseConfig} with additional stack-specific properties. */
export type BaseConfigExtended<T = unknown> = BaseConfig & T;
