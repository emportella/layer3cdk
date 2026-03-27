import { snsTopicName } from './sns.name.conventions';

describe('SNS Name Conventions', () => {
  describe('snsTopicName', () => {
    it('should return the correct topic name', () => {
      expect(snsTopicName({ env: 'dev', eventName: 'EventName' })).toEqual(
        'dev-EventName',
      );
    });
    it('should return the correct fifo topic name', () => {
      expect(
        snsTopicName({ env: 'dev', eventName: 'EventName', isFifo: true }),
      ).toEqual('dev-EventName.fifo');
    });
  });
});
