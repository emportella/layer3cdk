import { Role } from 'aws-cdk-lib/aws-iam';
import { DeadLetterQueue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { BaseConstructProps } from '../core/base.construct.props';
import { StackEnv } from '../core/constants';
import { QueueType } from './sqs.constants';

/**
 * Props for {@link sqsQueueName} naming function.
 */
export interface SqsQueueNameProps {
  env: StackEnv;
  queueType: QueueType;
  serviceName: string;
  eventName: string;
  isFifo?: boolean;
}

/**
 * Props for {@link sqsDlqName} naming function.
 */
export interface SqsDlqNameProps {
  env: StackEnv;
  serviceName: string;
  isFifo?: boolean;
}

/**
 * Props for queue constructs: {@link StandardQueue}, {@link BackgroundTasksQueue},
 * {@link FaninQueue}, and their FIFO variants.
 */
export interface SqsConstructProps extends BaseConstructProps {
  eventName: string;
  dlq: DeadLetterQueue;
  queueProps?: QueueProps;
}

/**
 * Props for {@link DLQFifo} construct.
 */
export interface DLQFifoProps extends BaseConstructProps {
  eventName?: string;
}

/**
 * Props for {@link SQSBase.subscribeWithCfnSubscription}.
 */
export interface CfnSubscriptionProps {
  arn: string;
  filterPolicyScope: 'MessageBody' | 'MessageAttributes';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filterPolicy: any;
}

/**
 * Props for {@link grantFaninPublishing} utility function.
 */
export interface GrantFaninPublishingProps {
  role: Role;
  faninQueues: FaninQueueRef[];
  region: string;
  accountId: string;
  env: StackEnv;
}

export interface FaninQueueRef {
  eventName: string;
  serviceName: string;
}
