import { ABConfig } from '../common';

export const testAbConfig = new ABConfig(
  'rpj',
  { account: '123456789012', region: 'us-east-1' },
  'rpj-test-stack',
  {
    'ab:tagSchemaVersion': '0.1',
    'ab:env': 'dev',
    'ab:ownership:department': 'productDevelopment',
    'ab:ownership:orgDomain': 'infra',
    'ab:ownership:team': 'testTeam',
    'ab:tech:application': 'testApp',
    'ab:tech:repository': 'testRepo',
    'ab:tech:managedBy': 'cdk',
  },
  'dev',
  'rpj-test-app',
  'My description',
);
