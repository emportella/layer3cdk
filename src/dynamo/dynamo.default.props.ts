import {
  Billing,
  Capacity,
  TableClass,
  TableEncryptionV2,
  TablePropsV2,
} from 'aws-cdk-lib/aws-dynamodb';
import { ABEnvProps } from '../common';
import { RemovalPolicy } from 'aws-cdk-lib';
import { OmittedTableConfigs, OmittedTableProps } from './dynamo.constants';

export type DynamoAlarmThresholds = {
  /**
   * Value for the alarm threshold for ConsumedReadCapacityUnits
   */
  alarmReadThreshold: number;
  /**
   * Value for the alarm threshold for ConsumedReadCapacityUnits
   */
  alarmWriteThreshold: number;
};
export type ABDynamoConfig = Omit<TablePropsV2, OmittedTableConfigs> &
  DynamoAlarmThresholds;
export type ABDynamoProps = Omit<TablePropsV2, OmittedTableProps>;

export const DYNAMO_ENVIRONMENTS_PROPS: ABEnvProps<ABDynamoConfig> = {
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
  dev: {
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
  preprod: {
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
  prod: {
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
