import { sqsQueueName, sqsDlqName } from './sqs.name.conventions';

describe('SQS Name Conventions', () => {
  describe('sqsQueueName', () => {
    it('should return the correct queue name when service comes kebabcased', () => {
      expect(sqsQueueName('dev', 'st', 'service-name', 'EventName')).toEqual(
        'dev-st-ServiceName-EventName',
      );
    });
    it('should return the correct queue name when service comes PascalCased', () => {
      expect(sqsQueueName('dev', 'st', 'ServiceName', 'EventName')).toEqual(
        'dev-st-ServiceName-EventName',
      );
    });
    it('should return the correct queue name when fifo is true', () => {
      expect(
        sqsQueueName('dev', 'st', 'ServiceName', 'EventName', true),
      ).toEqual('dev-st-ServiceName-EventName.fifo');
    });
  });
  describe('sqsDlqName', () => {
    it('should return the correct DLQ name', () => {
      expect(sqsDlqName('dev', 'service-name')).toEqual('dev-dlq-ServiceName');
    });
    it('should return the correct DLQ name when fifo is true', () => {
      expect(sqsDlqName('dev', 'service-name', true)).toEqual(
        'dev-dlq-ServiceName.fifo',
      );
    });
  });
});
