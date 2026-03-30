export type OmittedTableProps =
  | 'tableClass'
  | 'billing'
  | 'removalPolicy'
  | 'encryption'
  | 'pointInTimeRecoverySpecification'
  | 'contributorInsightsSpecification'
  | 'deletionProtection'
  | 'replicas'
  | 'dynamoStream'
  | 'kinesisStream'
  | 'tableName'
  | 'tags';
export type OmittedTableConfigs =
  | 'tableName'
  | 'partitionKey'
  | 'sortKey'
  | 'timeToLiveAttribute'
  | 'globalSecondaryIndexes'
  | 'localSecondaryIndexes';
