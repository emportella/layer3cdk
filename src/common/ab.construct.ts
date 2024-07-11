import { Alarm, AlarmProps, IAlarmAction } from 'aws-cdk-lib/aws-cloudwatch';
import { PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { ABConfig } from './ab.config';
import { ResourceType } from './ab.constant';
import {
  generateAlarmConstructId,
  generateConstructId,
} from './ab.name.conventions';
import { RemovalPolicy } from 'aws-cdk-lib';
import { pascalCaseToKebabCase, trimDashes } from '../util';

/**
 * Represents an abstract class for ABConstruct.
 * @template T The type of the resource.
 */
export abstract class ABConstruct<T> extends Construct {
  readonly resourceType: ResourceType;
  readonly resourceName: string;
  protected resource: T | undefined;
  protected readonly config: ABConfig;

  constructor(
    scope: Construct,
    resourceType: ResourceType,
    resourceName: string,
    config: ABConfig,
  ) {
    const id = generateConstructId(
      config.stackName,
      resourceType,
      resourceName,
    );
    super(scope, id);
    this.resourceType = resourceType;
    this.resourceName = resourceName;
    this.config = config;
  }
  protected abstract getArn(): string;
  protected abstract outputArn(): void;
  protected abstract grantPolicies(iamRole: Role): void;
  protected abstract addPolicyStatements(
    ...statements: PolicyStatement[]
  ): void;
  protected abstract setCloudWatchAlarms(...alarmActions: IAlarmAction[]): void;

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
    const props: AlarmProps = consumer(this.resource as T, this.resourceName);
    const alarm = new Alarm(
      this,
      generateAlarmConstructId(
        this.config.stackName,
        this.resourceName,
        trimDashes(pascalCaseToKebabCase(shortKebabCasedMetricName)),
      ),
      {
        ...props,
        actionsEnabled: alarmActions ? true : false,
      },
    );
    this.setAlarmActions(alarm, ...alarmActions);
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
  /**
     *This method is used to set the resource policy to retain the queue when the stack is deleted.
     default is DESTROY don't use this method unless you want to retain the queue when the stack is to be deleted.
     */
  protected abstract resourceRemovalPolicy(
    removalPolicy: RemovalPolicy.RETAIN | RemovalPolicy.DESTROY,
  ): void;
}
