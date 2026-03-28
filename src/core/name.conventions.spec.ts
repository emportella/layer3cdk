import {
  constructId,
  arnExportName,
  stackName,
  alarmConstructId,
  awsArn,
} from './name.conventions';

describe('Core Name Conventions', () => {
  describe('stackName', () => {
    it('should return the correct stack name', () => {
      expect(stackName('dev', 'pizza-cannon')).toEqual('dev-PizzaCannon');
    });
  });
  describe('constructId', () => {
    it('should return the correct construct id', () => {
      expect(constructId('dev-waffle-stack', 'sns', 'construct-name')).toEqual(
        'dev-waffle-stack-sns-construct-name',
      );
    });
  });
  describe('alarmConstructId', () => {
    it('should return the correct Alarm construct id', () => {
      expect(
        alarmConstructId('dev-waffle-stack', 'construct-name', 'alarm-type'),
      ).toEqual('dev-waffle-stack-cw-alarm-construct-name-alarm-type');
    });
  });
  describe('arnExportName', () => {
    it('should return the correct output arn value name', () => {
      expect(arnExportName('resourceName')).toEqual('output-resourceName-arn');
    });
  });
  describe('awsArn', () => {
    it('should return the correct output arn value name', () => {
      expect(
        awsArn({
          region: 'us-east-1',
          accountId: '123456789012',
          resourceType: 'sqs',
          resourceName: 'queueName',
        }),
      ).toEqual('arn:aws:sqs:us-east-1:123456789012:queueName');
    });
  });
});
