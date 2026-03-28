import { CfnElement, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { DeadLetterQueue, Queue } from 'aws-cdk-lib/aws-sqs';
import { BaseConfig } from '../core';
import { DLQ, DLQFifo } from './sqs.dlq.construct';
import { testconfig } from '../test/common.test.const';

describe('DLQ', () => {
  let stack: Stack;
  let config: BaseConfig;
  let dlq: DLQ;
  let dlqfifo: DLQFifo;
  let eventSpecificDlqFifo: DLQFifo;

  beforeEach(() => {
    stack = new Stack();
    config = testconfig;
    dlq = new DLQ(stack, config);
    dlqfifo = new DLQFifo(stack, { config });
    eventSpecificDlqFifo = new DLQFifo(stack, {
      config,
      eventName: 'eventSpecificDlqFifo',
    });
  });
  it('should create a queue with the correct name and default settings', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'dev-dlq-BananaLauncher',
      MessageRetentionPeriod: 1209600,
    });
  });
  it('should create a fifo queue with the correct name and default settings', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'dev-dlq-BananaLauncher.fifo',
      MessageRetentionPeriod: 1209600,
      FifoQueue: true,
      ContentBasedDeduplication: true,
    });
  });
  it('should create a fifo queue with the correct eventName and default settings', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'dev-dlq-EventSpecificDlqFifo.fifo',
      MessageRetentionPeriod: 1209600,
      FifoQueue: true,
      ContentBasedDeduplication: true,
    });
  });
  it('should create a queue with the correct RemovalPolicies', () => {
    dlq.resourceRemovalPolicy(RemovalPolicy.RETAIN);
    Template.fromStack(stack).hasResource('AWS::SQS::Queue', {
      UpdateReplacePolicy: 'Retain',
      DeletionPolicy: 'Retain',
    });
  });
  it('should create alarm with no actions', () => {
    dlq.setCloudWatchAlarms();
    Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
      ActionsEnabled: false,
      AlarmDescription:
        'Alarm if any message is in the dead letter queue for BananaLauncher',
      AlarmName: 'BananaLauncher Dead Letter Queue Alarm',
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      EvaluationPeriods: 2,
      MetricName: 'ApproximateNumberOfMessagesVisible',
      Period: 60,
      Statistic: 'Maximum',
      Threshold: 1,
      TreatMissingData: 'ignore',
    });
  });
  it('should create alarm with actions', () => {
    const topic = new Topic(stack, 'AlarmActionTopic');
    const topicRef = stack.getLogicalId(topic.node.defaultChild as CfnElement);
    dlq.setCloudWatchAlarms(new SnsAction(topic));
    Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
      ActionsEnabled: true,
      AlarmActions: [{ Ref: topicRef }],
      OKActions: [{ Ref: topicRef }],
    });
  });
  it('should return the DeadLetterQueue object', () => {
    expect(eventSpecificDlqFifo.getDlq()).toMatchObject<DeadLetterQueue>({
      queue: expect.any(Queue),
      maxReceiveCount: 20,
    });
  });
  it('should return the DeadLetterQueue object with maxReceiveCount', () => {
    expect(dlqfifo.getDlq(10)).toMatchObject<DeadLetterQueue>({
      queue: expect.any(Queue),
      maxReceiveCount: 10,
    });
  });
});
