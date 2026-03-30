import { TopicProps } from 'aws-cdk-lib/aws-sns';
import { BaseConstructProps } from '../core/base.construct.props';
import { StackEnv } from '../core/constants';

/**
 * Props for {@link snsTopicName} naming function.
 */
export interface SnsTopicNameProps {
  env: StackEnv;
  eventName: string;
  isFifo?: boolean;
}

/**
 * Props for {@link SnsTopic} and {@link SnsTopicFifo} constructs.
 */
export interface SnsTopicProps extends BaseConstructProps {
  eventName: string;
  topicProps?: TopicProps;
}
