import { BaseConfig } from '../core/base.config';
import { dynamoTableName } from './dynamo.name.conventions';

describe('Dynamo Name Conventions', () => {
  describe('dynamoTableName', () => {
    it('should return the correct table name', () => {
      const config = new BaseConfig({
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
      expect(dynamoTableName('tableName', config)).toEqual(
        'dev-RpjTestApp-TableName',
      );
    });
  });
});
