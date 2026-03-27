import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { awsArn } from '../core';
import { resolveWithOverrides } from '../core/base.construct.env.props';
import {
  EDAQueueProps,
  GrantFaninPublishingProps,
} from './sqs.construct.props';
import { sqsQueueName } from './sqs.name.conventions';
import { SQSBase, SQSBaseFifo } from './sqs.base';
import { sqsBaseEnvProps, sqsFifoBaseEnvProps } from './sqs.default.props';

/**
 * Grants an IAM role permission to send messages to one or more fan-in queues
 * owned by other services. Use this when a producer needs cross-service publish access.
 *
 * @param props.role - The IAM role to grant permissions to.
 * @param props.faninQueues - Array of target queues identified by service and event name.
 * @param props.region - AWS region for ARN construction.
 * @param props.accountId - AWS account ID for ARN construction.
 * @param props.env - Stack environment (dev, stg, prd).
 */
export function grantFaninPublishing(props: GrantFaninPublishingProps): void {
  const { role, faninQueues, region, accountId, env } = props;
  const queueArns = faninQueues.map(({ serviceName, eventName }) => {
    const queueName = sqsQueueName({
      env,
      queueType: 'fanin',
      serviceName,
      eventName,
    });
    return awsArn({
      region,
      accountId,
      resourceType: 'sqs',
      resourceName: queueName,
    });
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
  constructor(scope: Construct, props: EDAQueueProps) {
    const { config, eventName, dlq, queueProps } = props;
    const resourceName = sqsQueueName({
      env: config.stackEnv,
      queueType: 'fanin',
      serviceName: config.serviceName,
      eventName,
    });
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
  constructor(scope: Construct, props: EDAQueueProps) {
    const { config, eventName, dlq, queueProps } = props;
    const resourceName = sqsQueueName({
      env: config.stackEnv,
      queueType: 'fanin',
      serviceName: config.serviceName,
      eventName,
      isFifo: true,
    });
    const finalQueueProps = resolveWithOverrides(
      sqsFifoBaseEnvProps(resourceName, dlq),
      config,
      queueProps,
    );
    super(scope, eventName, config, finalQueueProps);
  }
}
