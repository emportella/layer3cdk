import { ABConfig } from './ab.config';
import {
  generateChatBotRoleName,
  generateConstructId,
  generateEdaDlqName,
  generateEdaQueueName,
  generateEdaTopicName,
  generateOutputArnExportName,
  generateServiceAccountName,
  generateServiceAccountRoleName,
  generateSlackConfigurationName,
  generateSnsActionTopicName,
  generateStackName,
  generateSSMStringParameterName,
  generateAlarmConstructId,
  generateAWSArn,
  generateDynamoTableName,
} from './ab.name.conventions';

describe('Name Conventions', () => {
  describe('generateEdaQueueName', () => {
    it('should return the correct queue name when service comes kebabcased', () => {
      expect(
        generateEdaQueueName('dev', 'st', 'service-name', 'EventName'),
      ).toEqual('dev-st-ServiceName-EventName');
    });
    it('should return the correct queue name when service comes kebabcased', () => {
      expect(
        generateEdaQueueName('dev', 'st', 'ServiceName', 'EventName'),
      ).toEqual('dev-st-ServiceName-EventName');
    });
    it('should return the correct queue name fifo is true', () => {
      expect(
        generateEdaQueueName('dev', 'st', 'ServiceName', 'EventName', true),
      ).toEqual('dev-st-ServiceName-EventName.fifo');
    });
  });
  describe('generateEdaTopicName', () => {
    it('should return the correct topic name', () => {
      expect(generateEdaTopicName('dev', 'EventName')).toEqual('dev-EventName');
    });
    it('should return the correct fifo topic name', () => {
      expect(generateEdaTopicName('dev', 'EventName', true)).toEqual(
        'dev-EventName.fifo',
      );
    });
  });
  describe('generateEdaDlqName', () => {
    it('should return the correct DLQ name', () => {
      expect(generateEdaDlqName('dev', 'service-name')).toEqual(
        'dev-dlq-ServiceName',
      );
    });
    it('should return the correct DLQ name when fifo is true', () => {
      expect(generateEdaDlqName('dev', 'service-name', true)).toEqual(
        'dev-dlq-ServiceName.fifo',
      );
    });
  });
  describe('generateServiceAccountRoleName', () => {
    it('should return the correct service account role name', () => {
      expect(generateServiceAccountRoleName('service-name', 'dev')).toEqual(
        'service-name-eks-service-account-dev',
      );
    });
  });
  describe('generateServiceAccountName', () => {
    it('should return the correct service account role name', () => {
      expect(generateServiceAccountName('service-name')).toEqual(
        'service-name-service-account',
      );
    });
  });
  describe('generateSSMStringParameterName', () => {
    describe('given context is global', () => {
      it('should return the correct ssm string parameter name', () => {
        expect(
          generateSSMStringParameterName(
            'sample',
            'ServiceName',
            'rpj',
            'global',
            'dev',
          ),
        ).toEqual('/dev/global/sample');
      });
    });
    describe('given context is domain', () => {
      it('should return the correct ssm string parameter name', () => {
        expect(
          generateSSMStringParameterName(
            'sample',
            'ServiceName',
            'rpj',
            'domain',
            'dev',
          ),
        ).toEqual('/dev/rpj/sample');
      });
    });
    describe('given context is service', () => {
      it('should return the correct ssm string parameter name', () => {
        expect(
          generateSSMStringParameterName(
            'sample',
            'ServiceName',
            'rpj',
            'service',
            'dev',
          ),
        ).toEqual('/dev/service-name/sample');
      });
    });
  });
  describe('generateStackName', () => {
    it('should return the correct stack name', () => {
      expect(generateStackName('dev', 'service-name')).toEqual(
        'dev-service-name',
      );
    });
  });
  describe('generateConstructId', () => {
    it('should return the correct construct id', () => {
      expect(
        generateConstructId('dev-stack-name', 'sns', 'construct-name'),
      ).toEqual('dev-stack-name-sns-construct-name');
    });
  });
  describe('generateAlarmConstructId', () => {
    it('should return the correct Alarm construct id', () => {
      expect(
        generateAlarmConstructId(
          'dev-stack-name',
          'construct-name',
          'alarm-type',
        ),
      ).toEqual('dev-stack-name-cw-alarm-construct-name-alarm-type');
    });
  });
  describe('generateOutputArnExportName', () => {
    it('should return the correct output arn value name', () => {
      expect(generateOutputArnExportName('resourceName')).toEqual(
        'output-resourceName-arn',
      );
    });
  });
  describe('generateSlackConfigurationName', () => {
    it('should return the correct Slack config name', () => {
      expect(generateSlackConfigurationName('dev', 'rpj')).toEqual(
        'dev-rpj-chatBot-slack-alarm',
      );
    });
  });
  describe('generateChatBotRoleName', () => {
    it('should return the correct chatBot role name', () => {
      expect(generateChatBotRoleName('dev', 'rpj')).toEqual(
        'dev-rpj-chatbot-role',
      );
    });
  });
  describe('generateSnsActionTopicName', () => {
    it('should return the correct topic name', () => {
      expect(generateSnsActionTopicName('dev', 'rpj')).toEqual(
        'dev-rpj-alarm-action',
      );
    });
  });
  describe('generateSnsActionTopicName with optional name', () => {
    it('should return the correct topic name', () => {
      expect(generateSnsActionTopicName('dev', 'rpj', 'opsGenie')).toEqual(
        'dev-rpj-alarm-action-opsGenie',
      );
    });
  });
  describe('generateAWSArn', () => {
    it('should return the correct output arn value name', () => {
      expect(
        generateAWSArn('us-east-1', '123456789012', 'sqs', 'queueName'),
      ).toEqual('arn:aws:sqs:us-east-1:123456789012:queueName');
    });
  });
  describe('generateDynamoTableName', () => {
    it('should return the correct table name', () => {
      const config = new ABConfig(
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
      expect(generateDynamoTableName('tableName', config)).toEqual(
        'dev-RpjTestApp-TableName',
      );
    });
  });
});
