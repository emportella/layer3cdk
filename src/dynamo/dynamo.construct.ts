import { CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  ComparisonOperator,
  IAlarmAction,
  Stats,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { TablePropsV2, TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import {
  BaseConstruct,
  resolveEnvProps,
  resolveAndMergeEnvProps,
} from '../core';
import { DynamoTableProps as DynamoTableConstructProps } from './dynamo.construct.props';
import { dynamoTableName } from './dynamo.name.conventions';
import {
  DynamoProps,
  DynamoConfig,
  DYNAMO_ENVIRONMENTS_PROPS,
  DynamoAlarmThresholds,
} from './dynamo.default.props';

/**
 * DynamoDB table construct with built-in CloudWatch alarms, IAM grants, and production
 * validations (point-in-time recovery, deletion protection).
 *
 * @example
 * ```typescript
 * const table = new DynamoTable(this, 'orders', config, {
 *   default: { partitionKey: { name: 'pk', type: AttributeType.STRING } },
 * });
 * table.grantPolicies(serviceAccountRole.getRole());
 * table.setCloudWatchAlarms(alarmAction);
 * ```
 */
export class DynamoTable extends BaseConstruct<TableV2> {
  protected readonly resource: TableV2;
  readonly tableName: string;
  readonly tableProps: TablePropsV2;
  protected readonly alarmsThresholds: DynamoAlarmThresholds;

  constructor(scope: Construct, props: DynamoTableConstructProps) {
    const { config, tableName, dynamoProps, dynamoConfig } = props;
    super(scope, 'dynamodb', tableName, config);
    this.tableName = dynamoTableName(tableName, config);
    const resolvedProps = resolveEnvProps(dynamoProps, config);
    const resolvedConfig = resolveAndMergeEnvProps(
      DYNAMO_ENVIRONMENTS_PROPS,
      config,
      dynamoConfig,
    );
    this.tableProps = this.buildTableProps(
      resolvedProps,
      resolvedConfig,
      this.tableName,
    );
    this.alarmsThresholds = resolvedConfig;
    this.validateProps();
    this.resource = new TableV2(
      this,
      this.resolver.childId('dynamodb'),
      this.tableProps,
    );
  }

  /**
   * Builds the TablePropsV2 object for a DynamoDB table.
   *
   * @param dynamoProps - The properties for the DynamoDB table.
   * @param dynamoConfig - The configuration for the DynamoDB table.
   * @param tableName - The name of the DynamoDB table.
   * @returns The TablePropsV2 object.
   */
  private buildTableProps(
    dynamoProps: DynamoProps,
    dynamoConfig: DynamoConfig,
    tableName: string,
  ): TablePropsV2 {
    return {
      tableName: tableName,
      ...dynamoProps,
      ...dynamoConfig,
    };
  }

  /**
   * Validates the properties of the Dynamo construct.
   * If the environment is 'prd', it checks if Point in Time Recovery and Deletion Protection are enabled.
   * If any validation errors are found, they are added to the validationErrors array.
   */
  protected validateProps(): void {
    const validationErrors: string[] = [];
    if (this.config.stackEnv === 'prd') {
      if (
        this.tableProps.pointInTimeRecovery === false ||
        this.tableProps.pointInTimeRecovery === undefined
      ) {
        validationErrors.push(
          'Point in Time Recovery must be enabled in production environment',
        );
      }
      if (
        this.tableProps.deletionProtection === false ||
        this.tableProps.deletionProtection === undefined
      ) {
        validationErrors.push(
          'Deletion Protection must be enabled in production environment',
        );
      }
    }
    if (validationErrors.length > 0) {
      this.node.addValidation({
        validate: () => validationErrors,
      });
    }
  }

  /**
   * Retrieves the ARN (Amazon Resource Name) of the DynamoDB table.
   * @returns The ARN of the DynamoDB table.
   */
  public getArn(): string {
    return this.resource.tableArn;
  }

  /**
   * Outputs the ARN of the DynamoDB table.
   */
  public outputArn(): void {
    const exportName = this.resolver.arnExportName();
    new CfnOutput(this, exportName, {
      value: this.resource.tableArn,
      exportName,
      description: `The ARN of the DynamoDB table ${this.tableName}`,
    });
  }
  /**
   * Sets up CloudWatch alarms for the DynamoDB table.
   *
   * The default alarms created are for consumed read capacity units, consumed write capacity units, and throttled requests.
   * Both consumed read and write capacity units have a threshold defined in DynamoConfig.
   *
   * If you are not using the default capacity for given environment, you MUST set the alarm thresholds in the DynamoConfig. For Provisioned capacity mode, you should set the alarm thresholds to 80% of the provisioned capacity. For On-Demand capacity mode, you should set the alarm thresholds to a maximum capacity defined by your workflow.
   * You can always define custom alarms by calling the setCustomAlarms method.
   * @param alarmActions - The actions to be taken when an alarm is triggered (Optional).
   */
  public setCloudWatchAlarms(...alarmActions: IAlarmAction[]): void {
    this.createAlarm(
      'consumed-read-capacity',
      {
        metric: this.resource.metricConsumedReadCapacityUnits({
          period: Duration.minutes(1),
          statistic: Stats.SUM,
        }),
        alarmName: `${this.resourceName} Consumed Read Capacity Units Alarm`,
        alarmDescription: `Alarm if ${this.resourceName} consumed read capacity units exceed ${this.alarmsThresholds.alarmReadThreshold} units`,
        threshold: this.alarmsThresholds.alarmReadThreshold,
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        evaluationPeriods: 3,
        datapointsToAlarm: 3,
        treatMissingData: TreatMissingData.IGNORE,
      },
      ...alarmActions,
    );
    this.createAlarm(
      'consumed-write-capacity',
      {
        metric: this.resource.metricConsumedWriteCapacityUnits({
          period: Duration.minutes(1),
          statistic: Stats.SUM,
        }),
        alarmName: `${this.resourceName} Consumed Write Capacity Units Alarm`,
        alarmDescription: `Alarm if ${this.resourceName} consumed write capacity units exceed ${this.alarmsThresholds.alarmWriteThreshold} units`,
        threshold: this.alarmsThresholds.alarmWriteThreshold,
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        evaluationPeriods: 3,
        datapointsToAlarm: 3,
        treatMissingData: TreatMissingData.IGNORE,
      },
      ...alarmActions,
    );
    this.createAlarm(
      'throttled-requests',
      {
        metric: this.resource.metricThrottledRequestsForOperation(
          'ThrottledRequests',
          {
            period: Duration.minutes(1),
            statistic: Stats.SUM,
          },
        ),
        alarmName: `${this.resourceName} Throttled Requests`,
        alarmDescription: `Alarm if ${this.resourceName} has throttled requests`,
        threshold: 1,
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        evaluationPeriods: 2,
        datapointsToAlarm: 1,
        treatMissingData: TreatMissingData.IGNORE,
      },
      ...alarmActions,
    );
  }
  /**
   * Grants read and write access to the DynamoDB table to the specified IAM role.
   *
   * The following actions are granted:
   * - BatchGetItem,
   * - GetRecords,
   * - GetShardIterator,
   * - Query,
   * - GetItem,
   * - Scan,
   * - ConditionCheckItem,
   * - BatchWriteItem,
   * - PutItem,
   * - UpdateItem,
   * - DeleteItem,
   * - DescribeTable,
   * @param iamRole The IAM role to grant access to.
   */
  public grantPolicies(iamRole: Role): void {
    this.resource.grantReadWriteData(iamRole);
  }
  /**
   * Grants read access to the DynamoDB table to the specified IAM role.
   *
   * The following actions are granted:
   * - BatchGetItem,
   * - GetRecords,
   * - GetShardIterator,
   * - Query,
   * - GetItem,
   * - Scan,
   * - DescribeTable,
   * @param iamRole The IAM role to grant access to.
   */
  public grantReadOnlyPolicies(iamRole: Role): void {
    this.resource.grantReadData(iamRole);
  }
  /**
   *
   * @param iamRole
   * @param actions
   */
  /**
   * Grants custom policies to an IAM role.
   * @param iamRole The IAM role to grant the policies to.
   * @param actions The actions to grant.
   */
  public grantCustomPolicies(iamRole: Role, ...actions: string[]): void {
    this.resource.grant(iamRole, ...actions);
  }
  public resourceRemovalPolicy(
    removalPolicy: RemovalPolicy.DESTROY | RemovalPolicy.RETAIN,
  ): void {
    this.resource.applyRemovalPolicy(removalPolicy);
  }
}
