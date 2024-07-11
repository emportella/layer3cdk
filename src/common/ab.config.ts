import { Environment, StackProps } from 'aws-cdk-lib';
import { ABEnvironment, Domain } from './ab.constant';
import { ABTags } from './ab.tags';

export class ABConfig implements StackProps {
  readonly domain: Domain;
  readonly env: Environment;
  readonly stackName: string;
  readonly tags: ABTags;
  readonly abEnv: ABEnvironment;
  readonly serviceName: string;
  readonly description?: string;

  constructor(
    domain: Domain,
    env: Environment,
    stackName: string,
    tags: ABTags,
    abEnv: ABEnvironment,
    serviceName: string,
    description?: string,
  ) {
    this.domain = domain;
    this.env = env;
    this.stackName = stackName;
    this.tags = tags;
    this.abEnv = abEnv;
    this.serviceName = serviceName;
    this.description = description;
  }
}

export type ABConfigExtended<T = unknown> = ABConfig & T;
