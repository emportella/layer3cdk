import { AlarmTopicNameProps } from './alarms.construct.props';

/**
 * Generates a Slack configuration name based on the provided environment and department.
 * @param env - The environment.
 * @param department - The department (business unit).
 * @returns The generated Slack configuration name.
 */
export const slackConfigName = (env: string, department: string): string => {
  return `${env}-${department}-chatBot-slack-alarm`;
};

/**
 * Generates a chatbot role name based on the provided environment and department.
 * @param env - The environment.
 * @param department - The department (business unit).
 * @returns The generated chatbot role name.
 */
export const chatbotRoleName = (env: string, department: string): string => {
  return `${env}-${department}-chatbot-role`;
};

/**
 * Generates the name for an SNS action topic.
 * @param props.env - The environment.
 * @param props.department - The department (business unit).
 * @param props.alarmActionType - An optional alarm action type to append to the topic name.
 * @returns The generated SNS action topic name.
 */
export const alarmTopicName = (props: AlarmTopicNameProps): string => {
  const { env, department, alarmActionType } = props;
  return `${env}-${department}-alarm-action${alarmActionType ? `-${alarmActionType}` : ''}`;
};
