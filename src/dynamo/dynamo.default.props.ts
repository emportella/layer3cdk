import {
  Billing,
  Capacity,
  TableClass,
  TableEncryptionV2,
  TablePropsV2,
} from 'aws-cdk-lib/aws-dynamodb';
import { BaseEnvProps } from '../core';
import { RemovalPolicy } from 'aws-cdk-lib';
import { OmittedTableConfigs, OmittedTableProps } from './dynamo.constants';

export type DynamoAlarmThresholds = {
  /**
   * Value for the alarm threshold for ConsumedReadCapacityUnits
   */
  alarmReadThreshold: number;
  /**
   * Value for the alarm threshold for ConsumedWriteCapacityUnits
   */
  alarmWriteThreshold: number;
};
export type DynamoConfig = Omit<TablePropsV2, OmittedTableConfigs> &
  DynamoAlarmThresholds;
export type DynamoProps = Omit<TablePropsV2, OmittedTableProps>;

export const DYNAMO_ENVIRONMENTS_PROPS: BaseEnvProps<DynamoConfig> = {
  default: {
    tableClass: TableClass.STANDARD,
    billing: Billing.provisioned({
      readCapacity: Capacity.autoscaled({ minCapacity: 5, maxCapacity: 25 }),
      writeCapacity: Capacity.autoscaled({ minCapacity: 5, maxCapacity: 25 }),
    }),
    alarmReadThreshold: 20,
    alarmWriteThreshold: 20,
    removalPolicy: RemovalPolicy.RETAIN,
    encryption: TableEncryptionV2.dynamoOwnedKey(),
    pointInTimeRecovery: false,
    contributorInsights: false,
  },
  prd: {
    tableClass: TableClass.STANDARD,
    billing: Billing.provisioned({
      readCapacity: Capacity.autoscaled({ minCapacity: 10, maxCapacity: 50 }),
      writeCapacity: Capacity.autoscaled({ minCapacity: 10, maxCapacity: 50 }),
    }),
    alarmReadThreshold: 40,
    alarmWriteThreshold: 40,
    removalPolicy: RemovalPolicy.RETAIN,
    encryption: TableEncryptionV2.dynamoOwnedKey(),
    pointInTimeRecovery: true,
    contributorInsights: true,
    deletionProtection: true,
  },
};
