import { CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  Alarm,
  ComparisonOperator,
  IAlarmAction,
  Stats,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { DeadLetterQueue, Queue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { BaseConfig, BaseConstruct } from '../core';
import { DLQFifoProps } from './sqs.construct.props';
import { sqsDlqName } from './sqs.name.conventions';
import { kebabToPascalCase } from '../util';

class DLQBase extends BaseConstruct<Queue> {
  protected readonly resource: Queue;
  constructor(
    scope: Construct,
    logicalName: string,
    queueProps: QueueProps,
    config: BaseConfig,
  ) {
    super(scope, 'sqs-dlq', logicalName, config);
    this.resource = new Queue(scope, this.resolver.childId('sqs'), queueProps);
  }

  public getArn(): string {
    return this.resource.queueArn;
  }

  public outputArn(): void {
    const exportName = this.resolver.arnExportName();
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
  public setCloudWatchAlarms(...alarmActions: IAlarmAction[]): void {
    const alarm = new Alarm(this, this.resolver.alarmId('messages-in-dlq'), {
      metric: this.resource.metricApproximateNumberOfMessagesVisible({
        period: Duration.minutes(1),
        statistic: Stats.MAXIMUM,
      }),
      threshold: 1,
      alarmName: `${this.resourceName} Dead Letter Queue Alarm`,
      evaluationPeriods: 2,
      alarmDescription: `Alarm if any message is in the dead letter queue for ${this.resourceName}`,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.IGNORE,
      actionsEnabled: alarmActions.length > 0 ? true : false,
    });
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

/**
 * Standard (non-FIFO) dead-letter queue with a 14-day retention period.
 * Use {@link DLQ.getDlq} to wire it into a queue construct.
 */
export class DLQ extends DLQBase {
  constructor(scope: Construct, config: BaseConfig) {
    const queueProps: QueueProps = {
      queueName: sqsDlqName({
        env: config.stackEnv,
        serviceName: config.serviceName,
      }),
      retentionPeriod: Duration.days(14),
    };
    super(scope, kebabToPascalCase(config.serviceName), queueProps, config);
  }
}

/**
 * FIFO dead-letter queue with content-based deduplication and a 14-day retention period.
 * @param eventName - Optional event name override; defaults to the service name from config.
 */
export class DLQFifo extends DLQBase {
  constructor(scope: Construct, props: DLQFifoProps) {
    const { config, eventName } = props;
    const queueProps: QueueProps = {
      queueName: sqsDlqName({
        env: config.stackEnv,
        serviceName: eventName !== undefined ? eventName : config.serviceName,
        isFifo: true,
      }),
      retentionPeriod: Duration.days(14),
      fifo: true,
      contentBasedDeduplication: true,
    };
    const baseName = kebabToPascalCase(
      eventName !== undefined ? eventName : config.serviceName,
    );
    super(scope, `${baseName}-fifo`, queueProps, config);
  }
}
