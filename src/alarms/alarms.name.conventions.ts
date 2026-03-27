import { StackEnv, Domain } from '../core/constants';
import { AlarmTopicNameProps } from './alarms.construct.props';

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
 * @param props.env - The environment.
 * @param props.domain - The domain.
 * @param props.alarmActionType - An optional alarm action type to append to the topic name.
 * @returns The generated SNS action topic name.
 */
export const alarmTopicName = (props: AlarmTopicNameProps): string => {
  const { env, domain, alarmActionType } = props;
  return `${env}-${domain}-alarm-action${alarmActionType ? `-${alarmActionType}` : ''}`;
};
