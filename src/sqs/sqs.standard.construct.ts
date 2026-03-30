import { Construct } from 'constructs';
import { resolveWithOverrides } from '../core/base.construct.env.props';
import { SqsConstructProps } from './sqs.construct.props';
import { sqsQueueName } from './sqs.name.conventions';
import { SQSBase, SQSBaseFifo } from './sqs.base';
import { sqsBaseEnvProps, sqsFifoBaseEnvProps } from './sqs.default.props';

/**
 * Standard SQS queue for event-driven architecture. Grants consume-only permissions by default.
 * Supports SNS subscription via inherited {@link SQSBase.subscribeFromSNSTopicArn}.
 *
 * @param props.eventName - Logical event name used in the queue's resource name.
 * @param props.dlq - Dead-letter queue to receive failed messages.
 * @param props.queueProps - Optional overrides for the default queue properties.
 */
export class StandardQueue extends SQSBase {
  constructor(scope: Construct, props: SqsConstructProps) {
    const { config, eventName, dlq, queueProps } = props;
    const resourceName = sqsQueueName({
      env: config.stackEnv,
      queueType: 'st',
      serviceName: config.serviceName,
      eventName,
    });
    const finalQueueProps = resolveWithOverrides(
      sqsBaseEnvProps(resourceName, dlq),
      config,
      queueProps,
    );
    super(scope, 'st', eventName, config, finalQueueProps);
  }
}

/** FIFO variant of {@link StandardQueue} with content-based deduplication. */
export class StandardQueueFifo extends SQSBaseFifo {
  constructor(scope: Construct, props: SqsConstructProps) {
    const { config, eventName, dlq, queueProps } = props;
    const resourceName = sqsQueueName({
      env: config.stackEnv,
      queueType: 'st',
      serviceName: config.serviceName,
      eventName,
      isFifo: true,
    });
    const finalQueueProps = resolveWithOverrides(
      sqsFifoBaseEnvProps(resourceName, dlq),
      config,
      queueProps,
    );
    super(scope, 'st', eventName, config, finalQueueProps);
  }
}
