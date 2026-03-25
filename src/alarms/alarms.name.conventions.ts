import { StackEnv, Domain } from '../core/constants';
import { AlarmActionType } from './alarmAction/alarmActions.constants';

/**
 * Generates a Slack configuration name based on the provided environment and domain.
 * @param env - The environment for which the Slack configuration is being generated.
 * @param domain - The domain for which the Slack configuration is being generated.
 * @returns The generated Slack configuration name.
 */
export const slackConfigName = (env: StackEnv, domain: Domain): string => {
  return `${env}-${domain}-chatBot-slack-alarm`;
};

/**
 * Generates a chatbot role name based on the provided environment and domain.
 * @param env - The environment for which the chatbot role is being generated.
 * @param domain - The domain for which the chatbot role is being generated.
 * @returns The generated chatbot role name.
 */
export const chatbotRoleName = (env: StackEnv, domain: Domain): string => {
  return `${env}-${domain}-chatbot-role`;
};

/**
 * Generates the name for an SNS action topic.
 * @param env - The environment.
 * @param domain - The domain.
 * @param optionalAlarmActionType - An optional alarm action type to append to the topic name.
 * @returns The generated SNS action topic name.
 */
export const alarmTopicName = (
  env: StackEnv,
  domain: Domain,
  optionalAlarmActionType?: AlarmActionType,
): string => {
  return `${env}-${domain}-alarm-action${optionalAlarmActionType ? `-${optionalAlarmActionType}` : ''}`;
};
