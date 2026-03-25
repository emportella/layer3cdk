import { Effect, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { DeadLetterQueue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { BaseConfig, StackEnv, awsArn } from '../core';
import { resolveWithOverrides } from '../core/base.construct.env.props';
import { sqsQueueName } from './sqs.name.conventions';
import { SQSBase, SQSBaseFifo } from './sqs.base';
import { sqsBaseEnvProps, sqsFifoBaseEnvProps } from './sqs.default.props';

interface FaninQueue {
  eventName: string;
  serviceName: string;
}

/**
 * Grants an IAM role permission to send messages to one or more fan-in queues
 * owned by other services. Use this when a producer needs cross-service publish access.
 * @param role - The IAM role to grant permissions to.
 * @param faninQueues - Array of target queues identified by service and event name.
 * @param region - AWS region for ARN construction.
 * @param accountId - AWS account ID for ARN construction.
 * @param env - Stack environment (dev, perf, preprod, prod).
 */
export function grantFaninPublishing(
  role: Role,
  faninQueues: FaninQueue[],
  region: string,
  accountId: string,
  env: StackEnv,
): void {
  const queueArns = faninQueues.map(({ serviceName, eventName }) => {
    const queueName = sqsQueueName(env, 'fanin', serviceName, eventName);
    return awsArn(region, accountId, 'sqs', queueName);
  });
  const statement = new PolicyStatement({
    sid: 'AllowFaninPublish',
    effect: Effect.ALLOW,
    actions: ['sqs:SendMessage', 'sqs:GetQueueUrl', 'sqs:GetQueueAttributes'],
    resources: queueArns,
  });
  role.addToPolicy(statement);
}

/**
 * Fan-in SQS queue that aggregates messages from multiple producing services.
 * Use {@link grantFaninPublishing} to allow remote services to send to this queue.
 */
export class EDAFaninQueue extends SQSBase {
  constructor(
    scope: Construct,
    eventName: string,
    dlq: DeadLetterQueue,
    config: BaseConfig,
    queueProps?: QueueProps | undefined,
  ) {
    const resourceName = sqsQueueName(
      config.stackEnv,
      'fanin',
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

/** FIFO variant of {@link EDAFaninQueue} with content-based deduplication. */
export class EDAFaninQueueFifo extends SQSBaseFifo {
  constructor(
    scope: Construct,
    eventName: string,
    dlq: DeadLetterQueue,
    config: BaseConfig,
    queueProps?: QueueProps | undefined,
  ) {
    const resourceName = sqsQueueName(
      config.stackEnv,
      'fanin',
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
