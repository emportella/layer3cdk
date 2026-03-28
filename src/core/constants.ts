/**
 * Represents a stack environment.
 * Any string is accepted; use {@link DEFAULT_ENVS} for the built-in defaults.
 */
export type StackEnv = string;

/**
 * Built-in environment values shipped with Layer3CDK.
 */
export const DEFAULT_ENVS = ['dev', 'stg', 'prd'] as const;

/**
 * Convenience alias for the built-in environment literals.
 */
export type DefaultStackEnv = (typeof DEFAULT_ENVS)[number];

/**
 * Represents the available AWS regions.
 */
export type AWSRegion =
  | 'ap-northeast-1'
  | 'ap-northeast-2'
  | 'ap-south-1'
  | 'ap-southeast-1'
  | 'ap-southeast-2'
  | 'ca-central-1'
  | 'eu-central-1'
  | 'eu-north-1'
  | 'eu-west-1'
  | 'eu-west-2'
  | 'eu-west-3'
  | 'sa-east-1'
  | 'us-east-1'
  | 'us-east-2'
  | 'us-west-1'
  | 'us-west-2';

/**
 * Represents the types of resources.
 */
export type ResourceType =
  | 'cw-alarm'
  | 'dynamodb'
  | 'eda-sns'
  | 'eda-sqs'
  | 'oidc-provider'
  | 'role'
  | 'service-account-role'
  | 'chatbot'
  | 'chatbot-slack'
  | 'secrets'
  | 'sns-cwaction'
  | 'sns'
  | 'sqs-dlq'
  | 'sqs'
  | 'stack'
  | 'ssm-str-param'
  | 'ecr'
  | 'ecr-app'
  | 'lambda'
  | 'redis-replication-group'
  | 's3-static-site';

/**
 * Represents a department (business unit).
 * Any string is accepted; use {@link DEFAULT_DEPARTMENTS} for the built-in defaults.
 */
export type Department = string;

/**
 * Built-in department values shipped with Layer3CDK.
 */
export const DEFAULT_DEPARTMENTS = [
  'ops',
  'fe',
  'be',
  'infra',
  'it',
  'pltf',
  'qa',
] as const;

/**
 * Convenience alias for the built-in department literals.
 */
export type DefaultDepartment = (typeof DEFAULT_DEPARTMENTS)[number];

/**
 * Built-in tag keys shipped with Layer3CDK.
 * Uses PascalCase colon-namespaced convention:
 * - `Ownership:*` — team and organizational ownership
 * - `Eng:*` — engineering/technical metadata
 *
 * Values are empty strings — meant to be filled in by the consumer.
 * Users can extend or override via the `tags` section in `layer3cdk` config.
 */
export const DEFAULT_TAGS: Record<string, string> = {
  'Eng:Env': '',
  'Ownership:Department': '',
  'Ownership:Organization': '',
  'Ownership:Team': '',
  'Eng:Application': '',
  'Eng:Repository': '',
  'Eng:ManagedBy': 'cdk',
};
