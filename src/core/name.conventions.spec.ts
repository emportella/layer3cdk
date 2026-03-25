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
      expect(stackName('dev', 'service-name')).toEqual('dev-service-name');
    });
  });
  describe('constructId', () => {
    it('should return the correct construct id', () => {
      expect(constructId('dev-stack-name', 'sns', 'construct-name')).toEqual(
        'dev-stack-name-sns-construct-name',
      );
    });
  });
  describe('alarmConstructId', () => {
    it('should return the correct Alarm construct id', () => {
      expect(
        alarmConstructId('dev-stack-name', 'construct-name', 'alarm-type'),
      ).toEqual('dev-stack-name-cw-alarm-construct-name-alarm-type');
    });
  });
  describe('arnExportName', () => {
    it('should return the correct output arn value name', () => {
      expect(arnExportName('resourceName')).toEqual('output-resourceName-arn');
    });
  });
  describe('awsArn', () => {
    it('should return the correct output arn value name', () => {
      expect(awsArn('us-east-1', '123456789012', 'sqs', 'queueName')).toEqual(
        'arn:aws:sqs:us-east-1:123456789012:queueName',
      );
    });
  });
});
