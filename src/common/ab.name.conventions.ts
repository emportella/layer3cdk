import { AlarmActionType } from '../alarms/alarmAction/alarmActions.constants';
import { EDAQueueType } from '../sqs';
import { SSMContextLevel } from '../ssm/ssm.contants';
import { kebabToPascalCase, pascalCaseToKebabCase, trimDashes } from '../util';
import { ABConfig } from './ab.config';
import { ABEnvironment, Domain, ResourceType } from './ab.constant';

/**
 *  Provides the EDA queue naming convention for SQS queues
 * @param abEnv - dev, perf, preprod, prod
 * @param queueType - st, fifo, task, fanin
 * @param serviceName - PascalCaseServiceName
 * @param eventName - PascalCaseServiceName
 * * @param isFifo - true if the topic is a FIFO topic
 * @returns `${abEnv}-${queueType}-${serviceName}-${eventName}`
 */
export const generateEdaQueueName = (
  abEnv: ABEnvironment,
  queueType: EDAQueueType,
  serviceName: string,
  eventName: string,
  isFifo = false,
): string => {
  const pascalCaseServiceName = kebabToPascalCase(serviceName);
  return `${abEnv}-${queueType}-${pascalCaseServiceName}-${trimDashes(
    eventName,
  )}${isFifo ? '.fifo' : ''}`;
};

/**
 * Provides the EDA topic naming convention for SNS topic
 * @param abEnv - dev, perf, preprod, prod all lower cased
 * @param eventName - PascalCaseEventName only
 * @param isFifo - true if the topic is a FIFO topic
 * @returns `${env}-${eventName}`
 */
export const generateEdaTopicName = (
  abEnv: ABEnvironment,
  eventName: string,
  isFifo = false,
): string => {
  return `${abEnv}-${trimDashes(eventName)}${isFifo ? '.fifo' : ''}`;
};

/**
 * Provides the EDA DLQ naming convention for services that use SQS
 * @param abEnv - dev, perf, preprod, prod all lower cased
 * @param serviceName - names can be provided as kebab-case or PascalCase
 * * @param isFifo - true if the topic is a FIFO topic
 * @returns `${abEnv}-dlq-${serviceName}`
 */
export const generateEdaDlqName = (
  abEnv: ABEnvironment,
  serviceName: string,
  isFifo = false,
): string => {
  const pascalCaseServiceName = kebabToPascalCase(serviceName);
  return `${abEnv}-dlq-${pascalCaseServiceName}${isFifo ? '.fifo' : ''}`;
};

/**
 * IAM Role Name Conventions for Service Accounts
 * {@link https://applyboard.atlassian.net/wiki/spaces/PA/pages/2964324397/Kubernetes+Name+Convention+for+Service+Accounts+and+Associated+IAM+Role}
 * @param serviceName - kebab-case-service-name
 * @param abEnv - dev, perf, preprod, prod
 * @returns `${serviceName}-eks-service-account-${abEnv}`
 * @example `rptasks-eks-service-account-dev`
 */
export const generateServiceAccountRoleName = (
  serviceName: string,
  abEnv: ABEnvironment,
): string => {
  return `${pascalCaseToKebabCase(serviceName)}-eks-service-account-${abEnv}`;
};

/**
 *  Name Conventions for SSM String Parameter
 * @param parameterName - name of parameter
 * @param serviceName - kebab-case-service-name
 * @param domain - rpj, sch, mob
 * @param contextLevel - global, domain, service
 * @param abEnv - dev, perf, preprod, prod
 * @returns `/${abEnv}/${contextValue[contextLevel]}/${parameterName}`
 * @example `/dev/rpagency/sample`
 */
export const generateSSMStringParameterName = (
  parameterName: string,
  serviceName: string,
  domain: Domain,
  contextLevel: SSMContextLevel,
  abEnv: ABEnvironment,
): string => {
  const contextValue = {
    global: 'global',
    domain,
    service: pascalCaseToKebabCase(serviceName),
  };

  return `/${abEnv}/${contextValue[contextLevel]}/${trimDashes(parameterName)}`;
};

/**
 * Naming Convention for Kubernetes Service Accounts
 * {@link https://applyboard.atlassian.net/wiki/spaces/PA/pages/2964324397/Kubernetes+Name+Convention+for+Service+Accounts+and+Associated+IAM+Role}
 * @param serviceName - kebab-case-service-name
 * @returns ${serviceName}-service-account
 */
export const generateServiceAccountName = (serviceName: string): string => {
  return `${serviceName}-service-account`;
};

/**
 * Naming Convention for CDK Stacks
 * @param env - dev, perf, preprod, prod
 * @param stackName
 * @returns `${env}-${stackName}`
 * @example dev-RPTasks
 */
export const generateStackName = <T extends string, U extends ABEnvironment>(
  env: U,
  stackName: T,
): string => {
  return `${env}-${trimDashes(stackName)}`;
};

/**
 * Defines the naming convention constructId for CDK Constructs
 * @param stackName
 * @param resourceType
 * @param resourceName
 * @returns `${stackName}-${resourceType}-${resourceName}`
 * @example dev-RPTasks-sqs-ApplicationStatusUpdated
 */
export const generateConstructId = <
  T extends string,
  V extends ResourceType,
  W extends string,
>(
  stackName: T,
  resourceType: V,
  resourceName: W,
): string => {
  return `${stackName}-${resourceType}-${trimDashes(resourceName)}`;
};

/**
 * Defines the naming convention for constructId of alarms enbeded into CDK Constructs
 * @param stackName
 * @param resourceName
 * @param alarmType
 * @returns `${stackName}-cw-alarm-${resourceName}-${AlarmType}`
 * @example dev-rp-tasks-cw-alarm-dev-st-RpTasks-ApplicationEventCreated-old-messages
 */
export const generateAlarmConstructId = <
  T extends string,
  V extends string,
  W extends string,
>(
  stackName: T,
  resourceName: V,
  alarmType: W,
): string => {
  const resourceType: ResourceType = 'cw-alarm';
  return `${stackName}-${resourceType}-${trimDashes(resourceName)}-${trimDashes(
    alarmType,
  )}`;
};

/**
 * Defines the naming convention for output values
 * @param stackName
 * @param resourceType
 * @param resourceName
 * @returns `output-${resourceName}-arn`
 * @example output-monolith-eks-service-account-preprod-arn
 */
export const generateOutputArnExportName = (resourceName: string): string => {
  return `output-${trimDashes(resourceName)}-arn`;
};

/**
 * Generates a Slack configuration name based on the provided environment and domain.
 * @param env - The environment for which the Slack configuration is being generated.
 * @param domain - The domain for which the Slack configuration is being generated.
 * @returns The generated Slack configuration name.
 */
export const generateSlackConfigurationName = (
  env: ABEnvironment,
  domain: Domain,
): string => {
  return `${env}-${domain}-chatBot-slack-alarm`;
};

/**
 * Generates a chatbot role name based on the provided environment and domain.
 * @param env - The environment for which the chatbot role is being generated.
 * @param domain - The domain for which the chatbot role is being generated.
 * @returns The generated chatbot role name.
 */
export const generateChatBotRoleName = (
  env: ABEnvironment,
  domain: Domain,
): string => {
  return `${env}-${domain}-chatbot-role`;
};

/**
 * Generates the name for an SNS action topic.
 *
 * @param env - The environment.
 * @param domain - The domain.
 * @param optionalName - An optional name to append to the topic name.
 * @returns The generated SNS action topic name.
 */
export const generateSnsActionTopicName = (
  env: ABEnvironment,
  domain: Domain,
  optionalAlarmActionType?: AlarmActionType,
): string => {
  return `${env}-${domain}-alarm-action${optionalAlarmActionType ? `-${optionalAlarmActionType}` : ''}`;
};

/**
 * Provides the naming convention for Redis cluster
 * @param abEnv - dev, perf, preprod, prod all lower cased
 * @param serviceName - names can be provided as kebab-case or PascalCase, 'shared' is the default
 * @param domain - rpj, sch, mob
 * @returns `${abEnv}-${domain}-${serviceName || 'shared'}`
 */
export const generateRedisClusterName = (params: {
  abEnv: ABEnvironment;
  domain: Domain;
  serviceName?: string;
}): string => {
  const { abEnv, domain, serviceName } = params;

  return `${abEnv}-${domain}-${kebabToPascalCase(serviceName || 'shared')}`;
};

/**
 * Provides the naming convention for Redis cluster
 * @param abEnv - dev, perf, preprod, prod all lower cased
 * @param serviceName - names can be provided as kebab-case or PascalCase, 'shared' is the default
 * @param domain - rpj, sch, mob
 * @returns `${abEnv}-${domain}-${serviceName || 'shared'}`
 */
export const generateRedisSubnetGroupName = (params: {
  abEnv: ABEnvironment;
  domain: Domain;
  serviceName?: string;
}): string => {
  const { abEnv, domain, serviceName } = params;

  return `${abEnv}-${domain}-${kebabToPascalCase(
    serviceName || 'shared',
  )}-subnet`;
};

/**
 * Defines the naming convention for output values
 * @param paramType - type of parameter which is exported (e.g. 'arn', 'endpoint')
 * @param resourceName
 * @returns `output-${resourceName}-{paramType}`
 * @example output-monolith-eks-service-account-preprod-arn
 */
export const generateOutputExportName = (params: {
  resourceName: string;
  paramType: string;
}): string => {
  const { resourceName, paramType } = params;
  return `output-${resourceName}-${paramType}`;
};

/**
 * Helper function to generate AWS ARN
 * @param region can be obtained from `abConfig.env.region`
 * @param accountId can be obtained from `abConfig.env.account`
 * @param resourceType - aws resource namespace
 * @param resourceName - name of the resource
 * @returns `arn:aws:${resourceType}:${region}:${accountId}:${resourceName}`
 */
export const generateAWSArn = (
  region: string,
  accountId: string,
  resourceType: string,
  resourceName: string,
): string => {
  return `arn:aws:${resourceType}:${region}:${accountId}:${resourceName}`;
};

/**
 * Generates a DynamoDB table name based on the provided environment, service name, and table name.
 * @param tableName - The name of the table (PascalCaseTableName).
 * @param config - The ABConfig object.
 * @returns The generated DynamoDB table name. For example, "dev-rptasks.ProcessedApplicationDomainEvents".
 */
export const generateDynamoTableName = (
  tableName: string,
  config: ABConfig,
): string => {
  return `${config.abEnv}-${kebabToPascalCase(config.serviceName)}-${kebabToPascalCase(tableName)}`;
};
