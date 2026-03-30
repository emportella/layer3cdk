import { trimDashes } from '../util';
import { SnsTopicNameProps } from './sns.construct.props';

/**
 * Provides the topic naming convention for SNS topic
 * @param props.env - dev, stg, prd all lower cased
 * @param props.eventName - PascalCaseEventName only
 * @param props.isFifo - true if the topic is a FIFO topic
 * @returns `${env}-${eventName}`
 */
export const snsTopicName = (props: SnsTopicNameProps): string => {
  const { env, eventName, isFifo = false } = props;
  return `${env}-${trimDashes(eventName)}${isFifo ? '.fifo' : ''}`;
};
