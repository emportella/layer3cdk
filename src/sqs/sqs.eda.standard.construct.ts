import { DeadLetterQueue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { BaseConfig } from '../core';
import { resolveWithOverrides } from '../core/base.construct.env.props';
import { sqsQueueName } from './sqs.name.conventions';
import { SQSBase, SQSBaseFifo } from './sqs.base';
import { sqsBaseEnvProps, sqsFifoBaseEnvProps } from './sqs.default.props';

/**
 * Standard SQS queue for event-driven architecture. Grants consume-only permissions by default.
 * Supports SNS subscription via inherited {@link SQSBase.subscribeFromSNSTopicArn}.
 *
 * @param eventName - Logical event name used in the queue's resource name.
 * @param dlq - Dead-letter queue to receive failed messages.
 * @param queueProps - Optional overrides for the default queue properties.
 */
export class EDAStandardQueue extends SQSBase {
  constructor(
    scope: Construct,
    eventName: string,
    dlq: DeadLetterQueue,
    config: BaseConfig,
    queueProps?: QueueProps | undefined,
  ) {
    const resourceName = sqsQueueName(
      config.stackEnv,
      'st',
      config.serviceName,
      eventName,
    );
    const finalQueueProps = resolveWithOverrides(
      sqsBaseEnvProps(resourceName, dlq),
      config,
      queueProps,
    );
    super(scope, eventName, config, finalQueueProps);
  }
}

/** FIFO variant of {@link EDAStandardQueue} with content-based deduplication. */
export class EDAStandardQueueFifo extends SQSBaseFifo {
  constructor(
    scope: Construct,
    eventName: string,
    dlq: DeadLetterQueue,
    config: BaseConfig,
    queueProps?: QueueProps | undefined,
  ) {
    const resourceName = sqsQueueName(
      config.stackEnv,
      'st',
      config.serviceName,
      eventName,
      true,
    );
    const finalQueueProps = resolveWithOverrides(
      sqsFifoBaseEnvProps(resourceName, dlq),
      config,
      queueProps,
    );
    super(scope, eventName, config, finalQueueProps);
  }
}
