import { CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  ComparisonOperator,
  IAlarmAction,
  Stats,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Topic, TopicProps } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { BaseConfig, BaseConstruct, arnExportName, constructId } from '../core';
import { EDASnsProps } from './sns.construct.props';
import { snsTopicName } from './sns.name.conventions';

const validateSnsFifoProps = (topicProps: TopicProps): void => {
  if (!topicProps.fifo) {
    throw new Error('EDA Standard SNS FIFO requires fifo=true');
  }
};

class SNSBase extends BaseConstruct<Topic> {
  protected readonly resource: Topic;
  readonly eventName: string;
  constructor(
    scope: Construct,
    eventName: string,
    topicName: string,
    config: BaseConfig,
    topicProps: TopicProps,
  ) {
    super(scope, 'eda-sns', topicName, config);
    this.eventName = eventName;
    this.resource = this.createTopic(scope, topicProps);
  }

  private createTopic(scope: Construct, topicProps: TopicProps): Topic {
    return new Topic(
      scope,
      constructId(
        this.config.stackName,
        'sns',
        this.eventName + `${topicProps.fifo ? '.fifo' : ''}`,
      ),
      topicProps,
    );
  }

  public getArn(): string {
    return this.resource.topicArn;
  }

  public outputArn(): void {
    const exportName = arnExportName(this.resourceName);
    new CfnOutput(this, exportName + '-id', {
      value: this.resource.topicArn,
      exportName: exportName,
      description: `The ARN of the EDA SNS topic ${this.resourceName} `,
    });
  }

  public grantPolicies(iamRole: Role): void {
    this.resource.grantPublish(iamRole);
  }

  public addPolicyStatements(...statements: PolicyStatement[]): void {
    statements.forEach((statement) => {
      this.resource.addToResourcePolicy(statement);
    });
  }

  public setCloudWatchAlarms(...alarmActions: IAlarmAction[]): void {
    this.createAlarm(
      'notification-failed',
      {
        metric: this.resource.metricNumberOfNotificationsFailed({
          period: Duration.minutes(2),
          statistic: Stats.MAXIMUM,
        }),
        alarmName: this.resourceName + ' Notification Failed Alarm',
        threshold: 1,
        evaluationPeriods: 2,
        alarmDescription: 'Alarm if any notification fails',
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: TreatMissingData.IGNORE,
      },
      ...alarmActions,
    );
  }

  public resourceRemovalPolicy(
    removalPolicy: RemovalPolicy.DESTROY | RemovalPolicy.RETAIN,
  ): void {
    this.resource.applyRemovalPolicy(removalPolicy);
  }
}

/**
 * Standard SNS topic for event-driven publishing. Includes a CloudWatch alarm
 * for failed notifications and IAM publish grants.
 *
 * @param eventName - Logical event name (e.g. "order-created") used in the topic name.
 * @param topicProps - Optional overrides merged onto the default topic properties.
 */
export class EDASns extends SNSBase {
  constructor(scope: Construct, props: EDASnsProps) {
    const { config, eventName } = props;
    let { topicProps } = props;
    const topicName = snsTopicName({ env: config.stackEnv, eventName });
    topicProps = { topicName, ...topicProps };
    super(scope, eventName, topicName, config, topicProps);
  }
}

/** FIFO variant of {@link EDASns} with content-based deduplication. */
export class EDASnsFifo extends SNSBase {
  constructor(scope: Construct, props: EDASnsProps) {
    const { config, eventName } = props;
    let { topicProps } = props;
    const topicName = snsTopicName({
      env: config.stackEnv,
      eventName,
      isFifo: true,
    });
    const defaultProp = {
      topicName,
      fifo: true,
      contentBasedDeduplication: true,
    };
    topicProps = { ...defaultProp, ...topicProps };
    validateSnsFifoProps(topicProps);
    super(scope, eventName, topicName, config, topicProps);
  }
}
