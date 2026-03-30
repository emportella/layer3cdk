import { kebabToPascalCase, trimDashes } from '../util';
import { AwsArnProps } from './base.construct.props';
import { StackEnv, ResourceType } from './constants';

const MAX_CFN_ID_LENGTH = 256;

const validateName = (name: string, context: string): string => {
  if (!name || name.trim().length === 0) {
    throw new Error(`${context}: name cannot be empty`);
  }
  if (name.length > MAX_CFN_ID_LENGTH) {
    throw new Error(
      `${context}: name exceeds ${MAX_CFN_ID_LENGTH} characters (got ${name.length}): ${name}`,
    );
  }
  return name;
};

/**
 * Naming Convention for CDK Stacks
 * @param env - dev, stg, prd
 * @param stackName
 * @returns `${env}-${stackName}`
 * @example dev-RPTasks
 */
export const stackName = <T extends string, U extends StackEnv>(
  env: U,
  name: T,
): string => {
  return validateName(`${env}-${kebabToPascalCase(name)}`, 'stackName');
};

/**
 * Defines the naming convention constructId for CDK Constructs
 * @param stackName
 * @param resourceType
 * @param resourceName
 * @returns `${stackName}-${resourceType}-${resourceName}`
 * @example dev-RPTasks-sqs-ApplicationStatusUpdated
 */
export const constructId = <
  T extends string,
  V extends ResourceType,
  W extends string,
>(
  stackName: T,
  resourceType: V,
  resourceName: W,
): string => {
  return validateName(
    `${stackName}-${resourceType}-${trimDashes(resourceName)}`,
    'constructId',
  );
};

/**
 * Defines the naming convention for constructId of alarms embedded into CDK Constructs
 * @param stackName
 * @param resourceName
 * @param alarmType
 * @returns `${stackName}-cw-alarm-${resourceName}-${AlarmType}`
 * @example dev-TacoProcessor-cw-alarm-st-OrderCreated-old-messages
 */
export const alarmConstructId = <
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
 * @param resourceName
 * @returns `output-${resourceName}-arn`
 * @example output-monolith-eks-service-account-stg-arn
 */
export const arnExportName = (resourceName: string): string => {
  return `output-${trimDashes(resourceName)}-arn`;
};

/**
 * Defines the naming convention for output values
 * @param paramType - type of parameter which is exported (e.g. 'arn', 'endpoint')
 * @param resourceName
 * @returns `output-${resourceName}-{paramType}`
 * @example output-monolith-eks-service-account-stg-arn
 */
export const outputExportName = (params: {
  resourceName: string;
  paramType: string;
}): string => {
  const { resourceName, paramType } = params;
  return `output-${resourceName}-${paramType}`;
};

/**
 * Helper function to generate AWS ARN
 * @param props.region can be obtained from `config.env.region`
 * @param props.accountId can be obtained from `config.env.account`
 * @param props.resourceType - aws resource namespace
 * @param props.resourceName - name of the resource
 * @returns `arn:aws:${resourceType}:${region}:${accountId}:${resourceName}`
 */
export const awsArn = (props: AwsArnProps): string => {
  const { region, accountId, resourceType, resourceName } = props;
  return `arn:aws:${resourceType}:${region}:${accountId}:${resourceName}`;
};
