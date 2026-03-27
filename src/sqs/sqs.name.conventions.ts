import { kebabToPascalCase, trimDashes } from '../util';
import { SqsDlqNameProps, SqsQueueNameProps } from './sqs.construct.props';

/**
 * Provides the EDA queue naming convention for SQS queues
 * @param props.env - dev, stg, prd
 * @param props.queueType - st, fifo, task, fanin
 * @param props.serviceName - PascalCaseServiceName
 * @param props.eventName - PascalCaseServiceName
 * @param props.isFifo - true if the topic is a FIFO topic
 * @returns `${env}-${queueType}-${serviceName}-${eventName}`
 */
export const sqsQueueName = (props: SqsQueueNameProps): string => {
  const { env, queueType, serviceName, eventName, isFifo = false } = props;
  const pascalCaseServiceName = kebabToPascalCase(serviceName);
  return `${env}-${queueType}-${pascalCaseServiceName}-${trimDashes(
    eventName,
  )}${isFifo ? '.fifo' : ''}`;
};

/**
 * Provides the EDA DLQ naming convention for services that use SQS
 * @param props.env - dev, stg, prd all lower cased
 * @param props.serviceName - names can be provided as kebab-case or PascalCase
 * @param props.isFifo - true if the topic is a FIFO topic
 * @returns `${env}-dlq-${serviceName}`
 */
export const sqsDlqName = (props: SqsDlqNameProps): string => {
  const { env, serviceName, isFifo = false } = props;
  const pascalCaseServiceName = kebabToPascalCase(serviceName);
  return `${env}-dlq-${pascalCaseServiceName}${isFifo ? '.fifo' : ''}`;
};
