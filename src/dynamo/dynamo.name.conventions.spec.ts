import { BaseConfig } from '../core/base.config';
import { dynamoTableName } from './dynamo.name.conventions';

describe('Dynamo Name Conventions', () => {
  describe('dynamoTableName', () => {
    it('should return the correct table name', () => {
      const config = new BaseConfig({
        department: 'pltf',
        env: { account: '123456789012', region: 'us-east-1' },
        stackName: 'pltf-banana-stack',
        tags: {
          TagSchemaVersion: '0.1',
          'Eng:Env': 'dev',
          'Ownership:Department': 'pltf',
          'Ownership:Organization': 'Layer3CDK',
          'Ownership:Team': 'Layer3',
          'Eng:Application': 'bananaLauncher',
          'Eng:Repository': 'banana-launcher-repo',
          'Eng:ManagedBy': 'cdk',
        },
        stackEnv: 'dev',
        serviceName: 'banana-launcher',
        description: 'My description',
      });
      expect(dynamoTableName('tableName', config)).toEqual(
        'dev-BananaLauncher-TableName',
      );
    });
  });
});
