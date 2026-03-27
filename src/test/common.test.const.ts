import { BaseConfig } from '../core';

export const testconfig = new BaseConfig({
  department: 'rpj',
  env: { account: '123456789012', region: 'us-east-1' },
  stackName: 'rpj-test-stack',
  tags: {
    'tag:tagSchemaVersion': '0.1',
    'tag:env': 'dev',
    'tag:ownership:department': 'productDevelopment',
    'tag:ownership:orgDomain': 'infra',
    'tag:ownership:team': 'testTeam',
    'tag:tech:application': 'testApp',
    'tag:tech:repository': 'testRepo',
    'tag:tech:managedBy': 'cdk',
  },
  stackEnv: 'dev',
  serviceName: 'rpj-test-app',
  description: 'My description',
});
