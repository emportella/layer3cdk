import { CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  ComparisonOperator,
  IAlarmAction,
  Stats,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { BaseConstruct } from '../core/base.construct';
import { BaseConfig } from '../core/base.config';
import { LambdaAlarmThresholds } from './lambda.default.props';

/**
 * Abstract base for all Layer3CDK Lambda construct variants.
 *
 * Provides the shared behaviour that every Lambda construct inherits:
 * - **Naming** — Consistent `<env>-<ServiceName>-<FunctionName>` convention.
 * - **CloudWatch Alarms** — Three built-in alarms (errors, duration, throttles)
 *   with environment-aware thresholds from {@link LAMBDA_ENVIRONMENTS_PROPS}.
 * - **IAM** — `grantPolicies()` for invoke access, `addPermissions()` to attach
 *   statements to the Lambda's own execution role.
 * - **Outputs** — `outputArn()` exports the function ARN as a CloudFormation output.
 * - **Lifecycle** — `resourceRemovalPolicy()` to control retain/destroy behaviour.
 *
 * ### Subclassing contract
 * Concrete subclasses must:
 * 1. Assign `this.resource` to the underlying CDK `Function` or `NodejsFunction`.
 * 2. Assign `this.alarmThresholds` from the resolved environment config.
 *
 * ### Built-in subclasses
 * - {@link LambdaFunction} — Generic, any runtime. Code via `codeProvider` callback.
 * - {@link NodejsLambdaFunction} — Node.js/TypeScript with automatic esbuild bundling.
 *
 * @see {@link LambdaFunction} for the generic variant
 * @see {@link NodejsLambdaFunction} for the Node.js/TypeScript variant
 */
export abstract class LambdaBase extends BaseConstruct<IFunction> {
  abstract readonly resource: IFunction;

  /**
   * The fully-qualified AWS Lambda function name.
   * Format: `<env>-<ServiceName>-<FunctionName>` (e.g. `dev-BananaLauncher-ProcessOrders`).
   * Also used as the CloudWatch LogGroup name: `/aws/lambda/<lambdaName>`.
   */
  readonly lambdaName: string;

  protected abstract readonly alarmThresholds: LambdaAlarmThresholds;

  constructor(
    scope: Construct,
    functionName: string,
    config: BaseConfig,
    lambdaName: string,
  ) {
    super(scope, 'lambda', functionName, config);
    this.lambdaName = lambdaName;
  }

  /**
   * Returns the ARN of the Lambda function.
   */
  public getArn(): string {
    return this.resource.functionArn;
  }

  /**
   * Creates a CloudFormation `CfnOutput` that exports the function ARN.
   *
   * Export name follows the standard Layer3CDK convention:
   * `output-<stackName>-<functionName>-arn`
   */
  public outputArn(): void {
    const exportName = this.resolver.arnExportName();
    new CfnOutput(this, exportName, {
      value: this.resource.functionArn,
      exportName,
      description: `The ARN of the Lambda function ${this.lambdaName}`,
    });
  }

  /**
   * Grants `lambda:InvokeFunction` permission on this function to the given IAM role.
   *
   * Use this when another service (ECS task, Step Functions, another Lambda) needs
   * to invoke this function.
   *
   * @param iamRole - The IAM role to grant invoke permissions to.
   */
  public grantPolicies(iamRole: Role): void {
    this.resource.grantInvoke(iamRole);
  }

  /**
   * Creates three CloudWatch alarms for common Lambda failure modes:
   *
   * | Alarm | Metric | Default threshold (dev / prd) |
   * |-------|--------|------------------------------|
   * | **Errors** | `Errors` (SUM, 1 min) | 5 / 1 |
   * | **Duration** | `Duration` (AVG, 1 min) | 25 000 ms / 25 000 ms |
   * | **Throttles** | `Throttles` (SUM, 1 min) | 3 / 1 |
   *
   * Thresholds are resolved from {@link LAMBDA_ENVIRONMENTS_PROPS} and can be
   * overridden per-environment via `lambdaConfig` on the construct props.
   *
   * All alarms use `TreatMissingData.NOT_BREACHING` because Lambdas may not
   * be invoked continuously — missing data points should not trigger alerts.
   *
   * @param alarmActions - Optional alarm actions (e.g. SNS topic for OpsGenie/PagerDuty).
   *   When omitted, alarms are created with `actionsEnabled: false`.
   */
  public setCloudWatchAlarms(...alarmActions: IAlarmAction[]): void {
    this.createAlarm(
      'errors',
      {
        metric: this.resource.metricErrors({
          period: Duration.minutes(1),
          statistic: Stats.SUM,
        }),
        alarmName: `${this.resourceName} Lambda Errors`,
        alarmDescription: `Alarm if ${this.resourceName} error count exceeds ${this.alarmThresholds.alarmErrorThreshold}`,
        threshold: this.alarmThresholds.alarmErrorThreshold,
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      },
      ...alarmActions,
    );

    this.createAlarm(
      'duration',
      {
        metric: this.resource.metricDuration({
          period: Duration.minutes(1),
          statistic: Stats.AVERAGE,
        }),
        alarmName: `${this.resourceName} Lambda Duration`,
        alarmDescription: `Alarm if ${this.resourceName} average duration exceeds ${this.alarmThresholds.alarmDurationThresholdMs}ms`,
        threshold: this.alarmThresholds.alarmDurationThresholdMs,
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      },
      ...alarmActions,
    );

    this.createAlarm(
      'throttles',
      {
        metric: this.resource.metricThrottles({
          period: Duration.minutes(1),
          statistic: Stats.SUM,
        }),
        alarmName: `${this.resourceName} Lambda Throttles`,
        alarmDescription: `Alarm if ${this.resourceName} throttle count exceeds ${this.alarmThresholds.alarmThrottleThreshold}`,
        threshold: this.alarmThresholds.alarmThrottleThreshold,
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        evaluationPeriods: 2,
        datapointsToAlarm: 1,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      },
      ...alarmActions,
    );
  }

  /**
   * Sets the removal policy for the Lambda function.
   *
   * - `RemovalPolicy.DESTROY` — deletes the function when the stack is destroyed.
   * - `RemovalPolicy.RETAIN` — keeps the function after stack deletion (recommended for prd).
   *
   * @param removalPolicy - The removal policy to apply.
   */
  public resourceRemovalPolicy(
    removalPolicy: RemovalPolicy.DESTROY | RemovalPolicy.RETAIN,
  ): void {
    this.resource.applyRemovalPolicy(removalPolicy);
  }

  /**
   * Adds IAM policy statements to the Lambda function's **execution role**.
   *
   * Use this to grant the Lambda itself permissions to access other AWS resources
   * (S3, DynamoDB, SQS, etc.) at runtime.
   *
   * @param statements - One or more IAM policy statements.
   *
   * @example
   * ```typescript
   * lambdaFn.addPermissions(
   *   new PolicyStatement({ actions: ['s3:GetObject'], resources: ['arn:aws:s3:::my-bucket/*'] }),
   *   new PolicyStatement({ actions: ['dynamodb:Query'], resources: [tableArn] }),
   * );
   * ```
   */
  public addPermissions(...statements: PolicyStatement[]): void {
    for (const statement of statements) {
      this.resource.addToRolePolicy(statement);
    }
  }

  /**
   * Returns the underlying CDK `IFunction` for advanced use cases
   * not covered by the Layer3CDK API (e.g. event source mappings, layers, VPC config).
   */
  public getFunction(): IFunction {
    return this.resource;
  }
}
