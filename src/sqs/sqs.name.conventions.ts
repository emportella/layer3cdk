import { kebabToPascalCase, trimDashes } from '../util';
import { StackEnv } from '../core/constants';
import { EDAQueueType } from './sqs.constants';

/**
 * Provides the EDA queue naming convention for SQS queues
 * @param env - dev, perf, preprod, prod
 * @param queueType - st, fifo, task, fanin
 * @param serviceName - PascalCaseServiceName
 * @param eventName - PascalCaseServiceName
 * @param isFifo - true if the topic is a FIFO topic
 * @returns `${env}-${queueType}-${serviceName}-${eventName}`
 */
export const sqsQueueName = (
  env: StackEnv,
  queueType: EDAQueueType,
  serviceName: string,
  eventName: string,
  isFifo = false,
): string => {
  const pascalCaseServiceName = kebabToPascalCase(serviceName);
  return `${env}-${queueType}-${pascalCaseServiceName}-${trimDashes(
    eventName,
  )}${isFifo ? '.fifo' : ''}`;
};

/**
 * Provides the EDA DLQ naming convention for services that use SQS
 * @param env - dev, perf, preprod, prod all lower cased
 * @param serviceName - names can be provided as kebab-case or PascalCase
 * @param isFifo - true if the topic is a FIFO topic
 * @returns `${env}-dlq-${serviceName}`
 */
export const sqsDlqName = (
  env: StackEnv,
  serviceName: string,
  isFifo = false,
): string => {
  const pascalCaseServiceName = kebabToPascalCase(serviceName);
  return `${env}-dlq-${pascalCaseServiceName}${isFifo ? '.fifo' : ''}`;
};
