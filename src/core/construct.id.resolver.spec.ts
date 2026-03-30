import { ConstructIdResolver } from './construct.id.resolver';

describe('ConstructIdResolver', () => {
  const resolver = new ConstructIdResolver({
    stackName: 'dev-TacoLauncher',
    resourceType: 'dynamodb',
    resourceName: 'ProcessedEvents',
  });

  describe('constructId', () => {
    it('should produce <stackName>-<resourceType>-<resourceName>', () => {
      expect(resolver.constructId).toEqual(
        'dev-TacoLauncher-dynamodb-ProcessedEvents',
      );
    });

    it('should trim dashes from resourceName', () => {
      const r = new ConstructIdResolver({
        stackName: 'dev-TacoLauncher',
        resourceType: 'sqs',
        resourceName: '-OrderCreated-',
      });
      expect(r.constructId).toEqual('dev-TacoLauncher-sqs-OrderCreated');
    });
  });

  describe('childId', () => {
    it('should produce <stackName>-<childType>-<resourceName>', () => {
      expect(resolver.childId('dynamodb')).toEqual(
        'dev-TacoLauncher-dynamodb-ProcessedEvents',
      );
    });

    it('should append suffix when provided', () => {
      const r = new ConstructIdResolver({
        stackName: 'dev-TacoLauncher',
        resourceType: 's3-static-site',
        resourceName: 'admin-portal',
      });
      expect(r.childId('s3-static-site', 'bucket')).toEqual(
        'dev-TacoLauncher-s3-static-site-admin-portal-bucket',
      );
      expect(r.childId('s3-static-site', 'dist')).toEqual(
        'dev-TacoLauncher-s3-static-site-admin-portal-dist',
      );
    });
  });

  describe('alarmId', () => {
    it('should produce <stackName>-cw-alarm-<resourceName>-<alarmType>', () => {
      expect(resolver.alarmId('consumed-read-capacity')).toEqual(
        'dev-TacoLauncher-cw-alarm-ProcessedEvents-consumed-read-capacity',
      );
    });

    it('should trim dashes from alarmType', () => {
      expect(resolver.alarmId('-old-messages-')).toEqual(
        'dev-TacoLauncher-cw-alarm-ProcessedEvents-old-messages',
      );
    });
  });

  describe('arnExportName', () => {
    it('should produce output-<stackName>-<resourceName>-arn', () => {
      expect(resolver.arnExportName()).toEqual(
        'output-dev-TacoLauncher-ProcessedEvents-arn',
      );
    });
  });

  describe('outputExportName', () => {
    it('should produce output-<stackName>-<resourceName>-<paramType>', () => {
      expect(resolver.outputExportName('host')).toEqual(
        'output-dev-TacoLauncher-ProcessedEvents-host',
      );
    });
  });

  describe('validation', () => {
    it('should throw if resourceName is empty', () => {
      expect(
        () =>
          new ConstructIdResolver({
            stackName: 'dev-TacoLauncher',
            resourceType: 'sqs',
            resourceName: '',
          }),
      ).toThrow('resourceName cannot be empty');
    });

    it('should throw if resourceName is only dashes', () => {
      expect(
        () =>
          new ConstructIdResolver({
            stackName: 'dev-TacoLauncher',
            resourceType: 'sqs',
            resourceName: '---',
          }),
      ).toThrow('resourceName cannot be empty');
    });

    it('should throw if constructId exceeds 256 characters', () => {
      expect(
        () =>
          new ConstructIdResolver({
            stackName: 'dev-TacoLauncher',
            resourceType: 'sqs',
            resourceName: 'a'.repeat(250),
          }).constructId,
      ).toThrow('exceeds 256 characters');
    });
  });

  describe('no redundancy in IDs', () => {
    it('SQS construct ID should not repeat env or service', () => {
      const sqs = new ConstructIdResolver({
        stackName: 'dev-TacoLauncher',
        resourceType: 'sqs',
        resourceName: 'st-OrderCreated',
      });
      const id = sqs.constructId;
      expect(id).toEqual('dev-TacoLauncher-sqs-st-OrderCreated');
      // env should appear only once
      expect(id.match(/dev/g)?.length).toBe(1);
      // service should appear only once
      expect(id.match(/TacoLauncher/g)?.length).toBe(1);
    });

    it('DynamoDB construct ID should not repeat env or service', () => {
      const id = resolver.constructId;
      expect(id.match(/dev/g)?.length).toBe(1);
      expect(id.match(/TacoLauncher/g)?.length).toBe(1);
    });

    it('Redis construct ID should not repeat env or service', () => {
      const redis = new ConstructIdResolver({
        stackName: 'dev-TacoLauncher',
        resourceType: 'redis-replication-group',
        resourceName: 'TacoLauncher',
      });
      const id = redis.constructId;
      expect(id).toEqual(
        'dev-TacoLauncher-redis-replication-group-TacoLauncher',
      );
      expect(id.match(/dev/g)?.length).toBe(1);
    });

    it('SNS construct ID should not repeat env', () => {
      const sns = new ConstructIdResolver({
        stackName: 'dev-TacoLauncher',
        resourceType: 'sns',
        resourceName: 'OrderCreated',
      });
      const id = sns.constructId;
      expect(id).toEqual('dev-TacoLauncher-sns-OrderCreated');
      expect(id.match(/dev/g)?.length).toBe(1);
    });
  });
});
