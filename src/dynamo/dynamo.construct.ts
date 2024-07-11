import { CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  Alarm,
  ComparisonOperator,
  IAlarmAction,
  Stats,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { TablePropsV2, TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import {
  ABConfig,
  ABConstruct,
  ABEnvProps,
  ConstructProps,
  generateAlarmConstructId,
  generateConstructId,
  generateDynamoTableName,
} from '../common';
import {
  ABDynamoProps,
  ABDynamoConfig,
  DYNAMO_ENVIRONMENTS_PROPS,
  DynamoAlarmThresholds,
} from './dynamo.default.props';

export class ABDynamoTable extends ABConstruct<TableV2> {
  protected readonly resource: TableV2;
  readonly tableName: string;
  readonly tableProps: TablePropsV2;
  protected readonly alarmsThresholds: DynamoAlarmThresholds;

  constructor(
    scope: Construct,
    tableName: string,
    config: ABConfig,
    dynamoProps: ABEnvProps<ABDynamoProps>,
    dynamoConfig?: ABEnvProps<ABDynamoConfig>,
  ) {
    tableName = generateDynamoTableName(tableName, config);
    super(scope, 'dynamodb', tableName, config);
    this.tableName = tableName;
    const constructDynamoProps = ConstructProps.of(dynamoProps, config);
    const constructDynamoConfig = ConstructProps.of(
      DYNAMO_ENVIRONMENTS_PROPS,
      config,
    );
    this.tableProps = this.buildTableProps(
      constructDynamoProps.getProps(),
      constructDynamoConfig.getMergedPropsFromIfABEnvProps(dynamoConfig),
      this.tableName,
    );
    this.alarmsThresholds =
      constructDynamoConfig.getMergedPropsFromIfABEnvProps(dynamoConfig);
    this.validateProps();
    this.resource = new TableV2(
      this,
      generateConstructId(config.stackName, 'dynamodb', tableName),
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
    dynamoProps: ABDynamoProps,
    dynamoConfig: ABDynamoConfig,
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
   * If the environment is 'prod', it checks if Point in Time Recovery and Deletion Protection are enabled.
   * If any validation errors are found, they are added to the validationErrors array.
   */
  protected validateProps(): void {
    const validationErrors: string[] = [];
    if (this.config.abEnv === 'prod') {
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
    const exportName = this.config.stackName + '-' + this.tableName + '-id';
    new CfnOutput(this, exportName, {
      value: this.resource.tableArn,
      exportName: exportName,
      description: `The ARN of the DynamoDB table ${this.tableName}`,
    });
  }
  /**
   * Sets up CloudWatch alarms for the DynamoDB table.
   *
   * The default alarms created are for consumed read capacity units, consumed write capacity units, and throttled requests.
   * Both consumed read and write capacity units have a threshold defined in ABDynamoConfig.
   *
   * If you are not using the default capacity for given environment, you MUST set the alarm thresholds in the ABDynamoConfig. For Provisioned capacity mode, you should set the alarm thresholds to 80% of the provisioned capacity. For On-Demand capacity mode, you should set the alarm thresholds to a maximum capacity defined by your workflow.
   * You can always define custom alarms by calling the setCustomAlarms method.
   * @param alarmActions - The actions to be taken when an alarm is triggered (Optional).
   */
  public setCloudWatchAlarms(...alarmActions: IAlarmAction[]): void {
    const alarmReadCapacityUnits = new Alarm(
      this,
      generateAlarmConstructId(
        this.config.stackName,
        this.resourceName,
        'consumed-read-capacity',
      ),
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
        actionsEnabled: alarmActions.length > 0 ? true : false,
      },
    );
    this.setAlarmActions(alarmReadCapacityUnits, ...alarmActions);
    const alarmWriteCapacityUnits = new Alarm(
      this,
      generateAlarmConstructId(
        this.config.stackName,
        this.resourceName,
        'consumed-write-capacity',
      ),
      {
        metric: this.resource.metricConsumedWriteCapacityUnits({
          period: Duration.minutes(1),
          statistic: Stats.SUM,
        }),
        alarmName: `${this.resourceName} Consumed Write Capacity Units Alarm`,
        alarmDescription: `Alarm if ${this.resourceName} consumed write capacity units exceed exceed ${this.alarmsThresholds.alarmReadThreshold} units`,
        threshold: this.alarmsThresholds.alarmWriteThreshold,
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        evaluationPeriods: 3,
        datapointsToAlarm: 3,
        treatMissingData: TreatMissingData.IGNORE,
        actionsEnabled: alarmActions.length > 0 ? true : false,
      },
    );
    this.setAlarmActions(alarmWriteCapacityUnits, ...alarmActions);
    const alarmThrottledRequests = new Alarm(
      this,
      generateAlarmConstructId(
        this.config.stackName,
        this.resourceName,
        'throttled-requests',
      ),
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
        actionsEnabled: alarmActions.length > 0 ? true : false,
      },
    );
    this.setAlarmActions(alarmThrottledRequests, ...alarmActions);
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected addPolicyStatements(...statements: PolicyStatement[]): void {
    throw new Error('Method not implemented.');
  }
}
