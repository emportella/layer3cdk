import { sqsQueueName, sqsDlqName } from './sqs.name.conventions';

describe('SQS Name Conventions', () => {
  describe('sqsQueueName', () => {
    it('should return the correct queue name when service comes kebabcased', () => {
      expect(
        sqsQueueName({
          env: 'dev',
          queueType: 'st',
          serviceName: 'pizza-cannon',
          eventName: 'EventName',
        }),
      ).toEqual('dev-st-PizzaCannon-EventName');
    });
    it('should return the correct queue name when service comes PascalCased', () => {
      expect(
        sqsQueueName({
          env: 'dev',
          queueType: 'st',
          serviceName: 'PizzaCannon',
          eventName: 'EventName',
        }),
      ).toEqual('dev-st-PizzaCannon-EventName');
    });
    it('should return the correct queue name when fifo is true', () => {
      expect(
        sqsQueueName({
          env: 'dev',
          queueType: 'st',
          serviceName: 'PizzaCannon',
          eventName: 'EventName',
          isFifo: true,
        }),
      ).toEqual('dev-st-PizzaCannon-EventName.fifo');
    });
  });
  describe('sqsDlqName', () => {
    it('should return the correct DLQ name', () => {
      expect(sqsDlqName({ env: 'dev', serviceName: 'pizza-cannon' })).toEqual(
        'dev-dlq-PizzaCannon',
      );
    });
    it('should return the correct DLQ name when fifo is true', () => {
      expect(
        sqsDlqName({ env: 'dev', serviceName: 'pizza-cannon', isFifo: true }),
      ).toEqual('dev-dlq-PizzaCannon.fifo');
    });
  });
});
