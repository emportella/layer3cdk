import { BaseConfig } from '../core';

export const testconfig = new BaseConfig(
  'rpj',
  { account: '123456789012', region: 'us-east-1' },
  'rpj-test-stack',
  {
    'tag:tagSchemaVersion': '0.1',
    'tag:env': 'dev',
    'tag:ownership:department': 'productDevelopment',
    'tag:ownership:orgDomain': 'infra',
    'tag:ownership:team': 'testTeam',
    'tag:tech:application': 'testApp',
    'tag:tech:repository': 'testRepo',
    'tag:tech:managedBy': 'cdk',
  },
  'dev',
  'rpj-test-app',
  'My description',
);
