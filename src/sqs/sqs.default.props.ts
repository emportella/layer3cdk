import { Duration } from 'aws-cdk-lib';
import { DeadLetterQueue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { BaseEnvProps } from '../core';

/**
 * Returns the base environment props shared across all EDA SQS queue variants.
 *
 * @param queueName - The resolved queue name.
 * @param dlq - The dead-letter queue configuration.
 */
export const sqsBaseEnvProps = (
  queueName: string,
  dlq: DeadLetterQueue,
): BaseEnvProps<QueueProps> => ({
  default: {
    queueName,
    retentionPeriod: Duration.days(14),
    visibilityTimeout: Duration.seconds(30),
    deadLetterQueue: dlq,
    deliveryDelay: Duration.seconds(0),
    receiveMessageWaitTime: Duration.seconds(15),
  },
});

/**
 * Returns the base environment props for FIFO SQS queue variants.
 * Extends {@link sqsBaseEnvProps} with FIFO-specific defaults.
 *
 * @param queueName - The resolved queue name.
 * @param dlq - The dead-letter queue configuration.
 */
export const sqsFifoBaseEnvProps = (
  queueName: string,
  dlq: DeadLetterQueue,
): BaseEnvProps<QueueProps> => ({
  default: {
    ...sqsBaseEnvProps(queueName, dlq).default,
    fifo: true,
    contentBasedDeduplication: true,
  },
});
