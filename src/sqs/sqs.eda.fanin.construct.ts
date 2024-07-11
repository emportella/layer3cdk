import { Duration } from 'aws-cdk-lib';
import { Effect, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { DeadLetterQueue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import {
  ABConfig,
  ABEnvironment,
  generateAWSArn,
  generateEdaQueueName,
} from '../common';
import { SQSBase, SQSBaseFifo } from './sqs.base';
import { ABEnvProps, ConstructProps } from '../common/ab.construct.env.props';

interface FaninQueue {
  eventName: string;
  serviceName: string;
}

export function grantFaninPublishing(
  role: Role,
  faninQueues: FaninQueue[],
  region: string,
  accountId: string,
  abEnv: ABEnvironment,
): void {
  const queueArns = faninQueues.map(({ serviceName, eventName }) => {
    const queueName = generateEdaQueueName(
      abEnv,
      'fanin',
      serviceName,
      eventName,
    );
    return generateAWSArn(region, accountId, 'sqs', queueName);
  });
  const statement = new PolicyStatement({
    sid: 'AllowFaninPublish',
    effect: Effect.ALLOW,
    actions: ['sqs:SendMessage', 'sqs:GetQueueUrl', 'sqs:GetQueueAttributes'],
    resources: queueArns,
  });
  role.addToPolicy(statement);
}

export class EDAFaninQueue extends SQSBase {
  constructor(
    scope: Construct,
    eventName: string,
    dlq: DeadLetterQueue,
    config: ABConfig,
    queueProps?: QueueProps | undefined,
  ) {
    const resourceName = generateEdaQueueName(
      config.abEnv,
      'fanin',
      config.serviceName,
      eventName,
    );
    const finalQueueProps = ConstructProps.of(
      EDAFaninQueue.getABEnvProps(resourceName, dlq),
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

export class EDAFaninQueueFifo extends SQSBaseFifo {
  constructor(
    scope: Construct,
    eventName: string,
    dlq: DeadLetterQueue,
    config: ABConfig,
    queueProps?: QueueProps | undefined,
  ) {
    const resourceName = generateEdaQueueName(
      config.abEnv,
      'fanin',
      config.serviceName,
      eventName,
      true,
    );
    const finalQueueProps = ConstructProps.of(
      EDAFaninQueueFifo.getABEnvProps(resourceName, dlq),
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
