import { trimDashes } from '../util';
import { StackEnv } from '../core/constants';

/**
 * Provides the EDA topic naming convention for SNS topic
 * @param env - dev, perf, preprod, prod all lower cased
 * @param eventName - PascalCaseEventName only
 * @param isFifo - true if the topic is a FIFO topic
 * @returns `${env}-${eventName}`
 */
export const snsTopicName = (
  env: StackEnv,
  eventName: string,
  isFifo = false,
): string => {
  return `${env}-${trimDashes(eventName)}${isFifo ? '.fifo' : ''}`;
};
