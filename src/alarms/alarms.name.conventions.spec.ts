import {
  slackConfigName,
  chatbotRoleName,
  alarmTopicName,
} from './alarms.name.conventions';

describe('Alarms Name Conventions', () => {
  describe('slackConfigName', () => {
    it('should return the correct Slack config name', () => {
      expect(slackConfigName('dev', 'pltf')).toEqual(
        'dev-pltf-chatBot-slack-alarm',
      );
    });
  });
  describe('chatbotRoleName', () => {
    it('should return the correct chatBot role name', () => {
      expect(chatbotRoleName('dev', 'pltf')).toEqual('dev-pltf-chatbot-role');
    });
  });
  describe('alarmTopicName', () => {
    it('should return the correct topic name', () => {
      expect(alarmTopicName({ env: 'dev', department: 'pltf' })).toEqual(
        'dev-pltf-alarm-action',
      );
    });
    it('should return the correct topic name with optional alarm action type', () => {
      expect(
        alarmTopicName({
          env: 'dev',
          department: 'pltf',
          alarmActionType: 'opsGenie',
        }),
      ).toEqual('dev-pltf-alarm-action-opsGenie');
    });
  });
});
