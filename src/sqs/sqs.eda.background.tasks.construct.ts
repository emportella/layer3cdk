import { Role } from 'aws-cdk-lib/aws-iam';
import { DeadLetterQueue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { BaseConfig } from '../core';
import { resolveWithOverrides } from '../core/base.construct.env.props';
import { sqsQueueName } from './sqs.name.conventions';
import { SQSBase, SQSBaseFifo } from './sqs.base';
import { sqsBaseEnvProps, sqsFifoBaseEnvProps } from './sqs.default.props';

/**
 * SQS queue for background/async tasks. Unlike {@link EDAStandardQueue}, this grants
 * both consume and send permissions so the owning service can enqueue its own work.
 *
 * @param eventName - Logical event name used in the queue's resource name.
 * @param dlq - Dead-letter queue to receive failed messages.
 * @param queueProps - Optional overrides for the default queue properties.
 */
export class EDABackgroundTasksQueue extends SQSBase {
  constructor(
    scope: Construct,
    eventName: string,
    dlq: DeadLetterQueue,
    config: BaseConfig,
    queueProps?: QueueProps | undefined,
  ) {
    const resourceName = sqsQueueName(
      config.stackEnv,
      'task',
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

  public grantPolicies(iamRole: Role): void {
    this.resource.grantConsumeMessages(iamRole);
    this.resource.grantSendMessages(iamRole);
  }
}

/** FIFO variant of {@link EDABackgroundTasksQueue} with content-based deduplication. */
export class EDABackgroundTasksQueueFifo extends SQSBaseFifo {
  constructor(
    scope: Construct,
    eventName: string,
    dlq: DeadLetterQueue,
    config: BaseConfig,
    queueProps?: QueueProps | undefined,
  ) {
    const resourceName = sqsQueueName(
      config.stackEnv,
      'task',
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
  public grantPolicies(iamRole: Role): void {
    this.resource.grantConsumeMessages(iamRole);
    this.resource.grantSendMessages(iamRole);
  }
}
