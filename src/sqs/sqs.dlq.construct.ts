import { CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  Alarm,
  ComparisonOperator,
  IAlarmAction,
  Stats,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { DeadLetterQueue, Queue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import {
  ABConfig,
  ABConstruct,
  generateAlarmConstructId,
  generateConstructId,
  generateEdaDlqName,
  generateOutputArnExportName,
} from '../common';

class DLQBase extends ABConstruct<Queue> {
  protected readonly resource: Queue;
  constructor(scope: Construct, queueProps: QueueProps, config: ABConfig) {
    super(scope, 'sqs-dlq', queueProps.queueName as string, config);
    this.resource = new Queue(
      scope,
      generateConstructId(
        config.stackName,
        'sqs',
        queueProps.queueName as string,
      ),
      queueProps,
    );
  }

  public getArn(): string {
    return this.resource.queueArn;
  }

  public outputArn(): void {
    const exportName = generateOutputArnExportName(this.resourceName);
    new CfnOutput(this, exportName + '-id', {
      value: this.resource.queueArn,
      exportName: exportName,
      description: `The ARN of the DLQ SQS ${this.resourceName}`,
    });
  }
  public resourceRemovalPolicy(
    removalPolicy: RemovalPolicy.RETAIN | RemovalPolicy.DESTROY,
  ): void {
    this.resource.applyRemovalPolicy(removalPolicy);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected grantPolicies(iamRole: Role): void {
    throw new Error('DLQ does not grant policies');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected addPolicyStatements(...statements: PolicyStatement[]): void {
    throw new Error('Method not implemented.');
  }
  public setCloudWatchAlarms(...alarmActions: IAlarmAction[]): void {
    const alarm = new Alarm(
      this,
      generateAlarmConstructId(
        this.config.stackName,
        this.resourceName,
        'messages-in-dlq',
      ),
      {
        metric: this.resource.metricApproximateNumberOfMessagesVisible({
          period: Duration.minutes(1),
          statistic: Stats.MAXIMUM,
        }),
        threshold: 1,
        alarmName: `${this.resourceName} Dead Letter Queue Alarm`,
        evaluationPeriods: 2,
        alarmDescription: `Alarm if any message is in the dead letter queue for ${this.resourceName}`,
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: TreatMissingData.IGNORE,
        actionsEnabled: alarmActions.length > 0 ? true : false,
      },
    );
    this.setAlarmActions(alarm, ...alarmActions);
  }
  /**
   * Returns the DLQ configuration for the SQS queue
   * @returns
   */
  public getDlq(maxReceiveCount = 20): DeadLetterQueue {
    return {
      queue: this.resource,
      maxReceiveCount: maxReceiveCount,
    };
  }
}

export class DLQ extends DLQBase {
  constructor(scope: Construct, config: ABConfig) {
    const queueProps: QueueProps = {
      queueName: generateEdaDlqName(config.abEnv, config.serviceName),
      retentionPeriod: Duration.days(14),
    };
    super(scope, queueProps, config);
  }
}

export class DLQFifo extends DLQBase {
  constructor(
    scope: Construct,
    config: ABConfig,
    eventName?: string | undefined,
  ) {
    const queueProps: QueueProps = {
      queueName: generateEdaDlqName(
        config.abEnv,
        eventName !== undefined ? eventName : config.serviceName,
        true,
      ),
      retentionPeriod: Duration.days(14),
      fifo: true,
      contentBasedDeduplication: true,
    };
    super(scope, queueProps, config);
  }
}
