import { Stack, App } from 'aws-cdk-lib';
import { ABConfig } from './ab.config';
import { generateConstructId } from './ab.name.conventions';

export abstract class ABStack extends Stack {
  constructor(scope: App, config: ABConfig) {
    super(scope, generateConstructId(config.stackName, 'stack', 'id'), config);
  }
}
