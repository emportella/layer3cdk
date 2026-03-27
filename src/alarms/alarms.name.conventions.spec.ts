import {
  slackConfigName,
  chatbotRoleName,
  alarmTopicName,
} from './alarms.name.conventions';

describe('Alarms Name Conventions', () => {
  describe('slackConfigName', () => {
    it('should return the correct Slack config name', () => {
      expect(slackConfigName('dev', 'rpj')).toEqual(
        'dev-rpj-chatBot-slack-alarm',
      );
    });
  });
  describe('chatbotRoleName', () => {
    it('should return the correct chatBot role name', () => {
      expect(chatbotRoleName('dev', 'rpj')).toEqual('dev-rpj-chatbot-role');
    });
  });
  describe('alarmTopicName', () => {
    it('should return the correct topic name', () => {
      expect(alarmTopicName({ env: 'dev', department: 'rpj' })).toEqual(
        'dev-rpj-alarm-action',
      );
    });
    it('should return the correct topic name with optional alarm action type', () => {
      expect(
        alarmTopicName({
          env: 'dev',
          department: 'rpj',
          alarmActionType: 'opsGenie',
        }),
      ).toEqual('dev-rpj-alarm-action-opsGenie');
    });
  });
});
