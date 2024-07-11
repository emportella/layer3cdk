import { Duration } from 'aws-cdk-lib';
import { DeadLetterQueue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { ABConfig, generateEdaQueueName } from '../common';
import { SQSBase, SQSBaseFifo } from './sqs.base';
import { ABEnvProps, ConstructProps } from '../common/ab.construct.env.props';

export class EDAStandardQueue extends SQSBase {
  constructor(
    scope: Construct,
    eventName: string,
    dlq: DeadLetterQueue,
    config: ABConfig,
    queueProps?: QueueProps | undefined,
  ) {
    const resourceName = generateEdaQueueName(
      config.abEnv,
      'st',
      config.serviceName,
      eventName,
    );
    const finalQueueProps = ConstructProps.of(
      EDAStandardQueue.getABEnvProps(resourceName, dlq),
      config,
    ).getCustomMergedProps(queueProps);
    super(scope, eventName, config, finalQueueProps);
  }

  private static getABEnvProps(
    resourceName: string,
    dlq: DeadLetterQueue,
  ): ABEnvProps<QueueProps> {
    return {
      default: {
        queueName: resourceName,
        retentionPeriod: Duration.days(14),
        visibilityTimeout: Duration.seconds(30),
        deadLetterQueue: dlq,
        deliveryDelay: Duration.seconds(0),
        receiveMessageWaitTime: Duration.seconds(15),
      },
    };
  }
}

export class EDAStandardQueueFifo extends SQSBaseFifo {
  constructor(
    scope: Construct,
    eventName: string,
    dlq: DeadLetterQueue,
    config: ABConfig,
    queueProps?: QueueProps | undefined,
  ) {
    const resourceName = generateEdaQueueName(
      config.abEnv,
      'st',
      config.serviceName,
      eventName,
      true,
    );
    const finalQueueProps = ConstructProps.of(
      EDAStandardQueueFifo.getABEnvProps(resourceName, dlq),
      config,
    ).getCustomMergedProps(queueProps);
    super(scope, eventName, config, finalQueueProps);
  }
  private static getABEnvProps(
    resourceName: string,
    dlq: DeadLetterQueue,
  ): ABEnvProps<QueueProps> {
    return {
      default: {
        queueName: resourceName,
        retentionPeriod: Duration.days(14),
        visibilityTimeout: Duration.seconds(30),
        deadLetterQueue: dlq,
        deliveryDelay: Duration.seconds(0),
        fifo: true,
        contentBasedDeduplication: true,
        receiveMessageWaitTime: Duration.seconds(15),
      },
    };
  }
}
