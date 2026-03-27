import { sqsQueueName, sqsDlqName } from './sqs.name.conventions';

describe('SQS Name Conventions', () => {
  describe('sqsQueueName', () => {
    it('should return the correct queue name when service comes kebabcased', () => {
      expect(
        sqsQueueName({
          env: 'dev',
          queueType: 'st',
          serviceName: 'service-name',
          eventName: 'EventName',
        }),
      ).toEqual('dev-st-ServiceName-EventName');
    });
    it('should return the correct queue name when service comes PascalCased', () => {
      expect(
        sqsQueueName({
          env: 'dev',
          queueType: 'st',
          serviceName: 'ServiceName',
          eventName: 'EventName',
        }),
      ).toEqual('dev-st-ServiceName-EventName');
    });
    it('should return the correct queue name when fifo is true', () => {
      expect(
        sqsQueueName({
          env: 'dev',
          queueType: 'st',
          serviceName: 'ServiceName',
          eventName: 'EventName',
          isFifo: true,
        }),
      ).toEqual('dev-st-ServiceName-EventName.fifo');
    });
  });
  describe('sqsDlqName', () => {
    it('should return the correct DLQ name', () => {
      expect(sqsDlqName({ env: 'dev', serviceName: 'service-name' })).toEqual(
        'dev-dlq-ServiceName',
      );
    });
    it('should return the correct DLQ name when fifo is true', () => {
      expect(
        sqsDlqName({ env: 'dev', serviceName: 'service-name', isFifo: true }),
      ).toEqual('dev-dlq-ServiceName.fifo');
    });
  });
});
