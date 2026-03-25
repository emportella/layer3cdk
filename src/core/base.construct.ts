import { Alarm, AlarmProps, IAlarmAction } from 'aws-cdk-lib/aws-cloudwatch';
import { PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { BaseConfig } from './base.config';
import { ResourceType } from './constants';
import { alarmConstructId, constructId } from './name.conventions';
import { RemovalPolicy } from 'aws-cdk-lib';
import { pascalCaseToKebabCase, trimDashes } from '../util';

/**
 * Abstract base for all Layer3CDK resource constructs. Provides standardized naming,
 * CloudWatch alarm wiring, IAM grant hooks, and removal-policy support.
 * @template T The underlying AWS CDK resource type (e.g. `Queue`, `TableV2`, `Topic`).
 */
export abstract class BaseConstruct<T> extends Construct {
  readonly resourceType: ResourceType;
  readonly resourceName: string;
  protected resource: T | undefined;
  protected readonly config: BaseConfig;

  constructor(
    scope: Construct,
    resourceType: ResourceType,
    resourceName: string,
    config: BaseConfig,
  ) {
    const id = constructId(config.stackName, resourceType, resourceName);
    super(scope, id);
    this.resourceType = resourceType;
    this.resourceName = resourceName;
    this.config = config;
  }

  protected getArn(): string {
    throw new Error(`getArn() not supported by ${this.constructor.name}`);
  }
  protected outputArn(): void {
    // no-op by default
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected grantPolicies(iamRole: Role): void {
    // no-op by default
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected addPolicyStatements(...statements: PolicyStatement[]): void {
    // no-op by default
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected setCloudWatchAlarms(...alarmActions: IAlarmAction[]): void {
    // no-op by default
  }

  /**
   * Sets custom alarms for the resource.
   *
   * @param consumer - A function that takes the resource and resource name as parameters and returns the AlarmProps.
   * @param shortKebabCasedMetricName - The short name of the metric kebab-cased.
   * @param alarmActions - Optional alarm actions to be associated with the alarm.
   * @returns void
   * @remarks This method is used to set custom alarms for the resource. The consumer function takes the resource and resource name as parameters and returns the AlarmProps.
   * The shortKebabCasedMetricName is the short name of the metric kebab-cased. The alarmActions are optional alarm actions to be associated with the alarm.
   * Although you can set the `actionsEnabled: true` on the AlarmProps, this method ensures that only if you pass alarmActions that the parameter will set to true, it is recommended to always provide alarm actions to the alarm.
   * @example
   * ```typescript
   * construct.setCustomAlarms((resource, resourceName) => {
   * return  {
   *    metric: resource.metricApproximateNumberOfMessagesVisible({
   *       period: Duration.minutes(1),
   *       statistic: Stats.MAXIMUM,
   *     }),
   *     threshold: 1,
   *     alarmName: `${resourceName} Dead Letter Queue Alarm`,
   *     evaluationPeriods: 2,
   *     alarmDescription: `Alarm if any message is in the dead letter queue for ${resourceName}`,
   *     comparisonOperator:
   *       ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
   *     treatMissingData: TreatMissingData.IGNORE,
   *     actionsEnabled: true,
   *   };
   * }, 'metrics-name', [alarmAction]);
   * ```
   */
  public setCustomAlarms(
    consumer: (resource: T, resourceName: string) => AlarmProps,
    shortKebabCasedMetricName: string,
    ...alarmActions: IAlarmAction[]
  ): void {
    if (this.resource === undefined) {
      throw new Error(
        `Resource not initialized for ${this.resourceName}. Cannot set custom alarms.`,
      );
    }
    const props: AlarmProps = consumer(this.resource, this.resourceName);
    const alarm = new Alarm(
      this,
      alarmConstructId(
        this.config.stackName,
        this.resourceName,
        trimDashes(pascalCaseToKebabCase(shortKebabCasedMetricName)),
      ),
      {
        ...props,
        actionsEnabled: alarmActions.length > 0,
      },
    );
    this.setAlarmActions(alarm, ...alarmActions);
  }
  /**
   * Creates an alarm with standardized construct ID and action wiring.
   *
   * @param metricName - Short kebab-cased metric name used in the alarm construct ID.
   * @param props - The alarm properties (excluding actionsEnabled, which is derived from alarmActions).
   * @param alarmActions - The alarm actions to wire up.
   * @returns The created Alarm.
   */
  protected createAlarm(
    metricName: string,
    props: Omit<AlarmProps, 'actionsEnabled'>,
    ...alarmActions: IAlarmAction[]
  ): Alarm {
    const alarm = new Alarm(
      this,
      alarmConstructId(this.config.stackName, this.resourceName, metricName),
      {
        ...props,
        actionsEnabled: alarmActions.length > 0,
      },
    );
    this.setAlarmActions(alarm, ...alarmActions);
    return alarm;
  }

  /**
   * Sets the alarm actions for the specified alarm.
   *
   * @param alarm - The alarm to set the actions for.
   * @param alarmActions - The alarm actions to set.
   */
  public setAlarmActions(alarm: Alarm, ...alarmActions: IAlarmAction[]) {
    if (alarmActions.length > 0) {
      alarm.addAlarmAction(...alarmActions);
      alarm.addOkAction(...alarmActions);
    }
  }

  protected resourceRemovalPolicy(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    removalPolicy: RemovalPolicy.RETAIN | RemovalPolicy.DESTROY,
  ): void {
    // no-op by default
  }
}
