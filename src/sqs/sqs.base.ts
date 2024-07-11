import { CfnOutput, Duration, Fn, RemovalPolicy } from 'aws-cdk-lib';
import {
  Alarm,
  ComparisonOperator,
  IAlarmAction,
  Stats,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { CfnSubscription, Topic } from 'aws-cdk-lib/aws-sns';
import {
  SqsSubscription,
  SqsSubscriptionProps,
} from 'aws-cdk-lib/aws-sns-subscriptions';
import { Queue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import {
  ABConfig,
  ABConstruct,
  generateAlarmConstructId,
  generateConstructId,
  generateOutputArnExportName,
} from '../common';

const validateFifoQueueProps = (queueProps: QueueProps): string[] => {
  const validationErrors: string[] = [];
  if (!queueProps.fifo) {
    validationErrors.push('Queues that are FIFO requires fifo=true');
  }
  if (!queueProps.deadLetterQueue?.queue.fifo) {
    validationErrors.push(
      'Queues that are FIFO requires dlq to be a FIFO queue',
    );
  }
  return validationErrors;
};

export abstract class SQSBase extends ABConstruct<Queue> {
  protected readonly resource: Queue;
  readonly eventName: string;

  constructor(
    scope: Construct,
    eventName: string,
    config: ABConfig,
    queueProps: QueueProps,
  ) {
    super(scope, 'eda-sqs', queueProps.queueName as string, config);
    this.resource = this.createQueue(scope, queueProps);
    this.eventName = eventName;
    this.node.addValidation;
  }

  private createQueue(scope: Construct, queueProps: QueueProps): Queue {
    return new Queue(
      scope,
      generateConstructId(
        this.config.stackName,
        'sqs',
        queueProps.queueName as string,
      ),
      queueProps,
    );
  }

  private topicFromArn(arn: string): Topic {
    return Topic.fromTopicArn(this, 'sns-topic', arn) as Topic;
  }

  private subscribeToSNSTopic(
    topic: Topic,
    sqsSubscriptionProps?: SqsSubscriptionProps | undefined,
  ) {
    topic.addSubscription(
      new SqsSubscription(this.resource, sqsSubscriptionProps),
    );
  }
  /**
   * Simple subscription to an SNS topic, no filter policy allowed
   * @param arn The ARN of the SNS topic to subscribe to
   */
  public subscribeFromSNSTopicArn(arn: string) {
    this.subscribeToSNSTopic(this.topicFromArn(arn));
  }
  /**
   * Implemented using CfnSubscription to allow for more complex filter policies
   * https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html
   * @param arn The ARN of the SNS topic to subscribe to
   * @param filterPolicyScope The scope of the filter policy. Either MessageBody or MessageAttributes
   * @param filterPolicy The filter policy to apply
   */
  public subscribeWithCfnSubscription(
    arn: string,
    filterPolicyScope: 'MessageBody' | 'MessageAttributes',
    filterPolicy: any,
  ) {
    new CfnSubscription(
      this,
      generateConstructId(
        this.config.stackName,
        'sns',
        `subscription-${this.eventName}`,
      ),
      {
        endpoint: this.resource.queueArn,
        protocol: 'sqs',
        topicArn: arn,
        filterPolicyScope: filterPolicyScope,
        filterPolicy: filterPolicy,
      },
    );
  }
  /**
   * Allows for simple subscription to an SNS topic using AWS CDK v2 SQS subscription Properties
   * @param arn The ARN of the SNS topic to subscribe to
   * @param sqsSubscriptionProps The AWS CDK v2 SQS subscription properties
   */
  public subscribeFromSnsTopicArnWithProps(
    arn: string,
    sqsSubscriptionProps: SqsSubscriptionProps,
  ) {
    this.subscribeToSNSTopic(this.topicFromArn(arn), sqsSubscriptionProps);
  }
  /**
   * Allows for simple subscription to an SNS topic using AWS CDK v2 SQS subscription Properties
   * @param outputResourceId The ouput id of the SNS topic to subscribe to
   * @param sqsSubscriptionProps The AWS CDK v2 SQS subscription properties (Optional)
   */
  public subscribeFromSNSTopicImport(
    outputResourceId: string,
    sqsSubscriptionProps?: SqsSubscriptionProps | undefined,
  ) {
    const topic = Topic.fromTopicArn(
      this,
      generateConstructId(
        this.config.stackName,
        'sns',
        `imported-topic-${this.eventName}`,
      ),
      Fn.importValue(outputResourceId),
    ) as Topic;
    this.subscribeToSNSTopic(topic, sqsSubscriptionProps);
  }

  public getArn(): string {
    return this.resource.queueArn;
  }

  protected outputArn(): void {
    const exportName = generateOutputArnExportName(this.resourceName);
    new CfnOutput(this, exportName + '-id', {
      value: this.resource.queueArn,
      exportName: exportName,
      description: `The ARN of the SQS topic ${this.resourceName} `,
    });
  }

  public resourceRemovalPolicy(
    removalPolicy: RemovalPolicy.RETAIN | RemovalPolicy.DESTROY,
  ): void {
    this.resource.applyRemovalPolicy(removalPolicy);
  }

  public grantPolicies(iamRole: Role): void {
    this.resource.grantConsumeMessages(iamRole);
  }

  public addPolicyStatements(...statements: PolicyStatement[]): void {
    statements.forEach((statement) => {
      this.resource.addToResourcePolicy(statement);
    });
  }

  public setCloudWatchAlarms(...alarmActions: IAlarmAction[]): void {
    const staleOldMessageAlarm = new Alarm(
      this,
      generateAlarmConstructId(
        this.config.stackName,
        this.resourceName,
        'old-messages',
      ),
      {
        metric: this.resource.metricApproximateAgeOfOldestMessage({
          period: Duration.minutes(2),
          statistic: Stats.MAXIMUM,
        }),
        alarmName: this.resourceName + ' Stale Old Message Alarm',
        threshold: 60,
        evaluationPeriods: 2,
        alarmDescription:
          'Alarm if the oldest message in the queue is older than 60 seconds',
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: TreatMissingData.IGNORE,
        actionsEnabled: alarmActions.length > 0 ? true : false,
      },
    );
    const numberOfMessagesAlarm = new Alarm(
      this,
      generateAlarmConstructId(
        this.config.stackName,
        this.resourceName,
        'number-of-messages',
      ),
      {
        metric: this.resource.metricApproximateNumberOfMessagesVisible({
          period: Duration.minutes(2),
          statistic: Stats.MAXIMUM,
        }),
        alarmName: this.resourceName + ' High Number of Messages Alarm',
        threshold: 100,
        evaluationPeriods: 2,
        alarmDescription:
          'Alarm if the number of messages in the queue is greater than 100',
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: TreatMissingData.IGNORE,
        actionsEnabled: alarmActions.length > 0 ? true : false,
      },
    );
    this.setAlarmActions(staleOldMessageAlarm, ...alarmActions);
    this.setAlarmActions(numberOfMessagesAlarm, ...alarmActions);
  }
}

export abstract class SQSBaseFifo extends SQSBase {
  constructor(
    scope: Construct,
    eventName: string,
    config: ABConfig,
    queueProps: QueueProps,
  ) {
    super(scope, eventName, config, queueProps);
    this.node.addValidation({
      validate: () => validateFifoQueueProps(queueProps),
    });
  }
}
