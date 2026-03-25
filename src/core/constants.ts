/**
 * Represents the possible environments for Layer3CDK.
 */
export type StackEnv = 'dev' | 'prod' | 'perf' | 'preprod';

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
  | 'ssm-string-parameter'
  | 'ecr'
  | 'ecr-app'
  | 'redis-replication-group';

/**
 * Represents the available domains.
 */
export type Domain =
  | 'org' //Company wide
  | 'ap' //Application Team Domain (new)
  | 'awa' //Application domain (old)
  | 'csr' //Content Search and Recommendations domain
  | 'da' //Data architecture
  | 'ds' //Data science
  | 'dsj' //Direct Student Journey
  | 'fnt' //Fintech
  | 'infra' //DevOps
  | 'it' //it
  | 'mob' //mobile
  | 'pltf' //Platform
  | 'pm' //Program Management
  | 'qa' //Quality Assurance
  | 'rpj' //Recruitment Partner Journey
  | 'sch' //School
  | 'tss' //Technology Strategy & Standards
  | 'uie'; //User Interface Engineering
