import { CfnElement, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import {
  ComparisonOperator,
  Stats,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { FilterOrPolicy, SubscriptionFilter, Topic } from 'aws-cdk-lib/aws-sns';
import { BaseConfig, constructId } from '../core';
import { DLQ, DLQFifo } from './sqs.dlq.construct';
import {
  EDAStandardQueue,
  EDAStandardQueueFifo,
} from './sqs.eda.standard.construct';
import { testconfig } from '../test/common.test.const';

describe('EDAStandardQueue', () => {
  let stack: Stack;
  let config: BaseConfig;
  let dlq: DLQ;
  let dlqFifo: DLQFifo;
  let standardQueue: EDAStandardQueue;
  let standardQueueFifo: EDAStandardQueueFifo;
  let eventName: string;
  let standardQueueRef: string;

  beforeEach(() => {
    stack = new Stack();
    eventName = 'TestEventCreated';
    config = testconfig;
    dlq = new DLQ(stack, config);
    standardQueue = new EDAStandardQueue(stack, {
      eventName,
      dlq: dlq.getDlq(),
      config,
    });
    standardQueueRef = stack.getLogicalId(
      stack.node.findChild(
        constructId(config.stackName, 'sqs', standardQueue.resourceName),
      ).node.defaultChild as CfnElement,
    );
    dlqFifo = new DLQFifo(stack, { config });
    standardQueueFifo = new EDAStandardQueueFifo(stack, {
      eventName,
      dlq: dlqFifo.getDlq(),
      config,
    });
  });
  it('should create 4 queues', () => {
    Template.fromStack(stack).resourceCountIs('AWS::SQS::Queue', 4);
  });
  it('should create a queue with the correct name and default settings', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'dev-st-RpjTestApp-TestEventCreated',
      MessageRetentionPeriod: 1209600,
      VisibilityTimeout: 30,
    });
    Template.fromStack(stack).hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'dev-dlq-RpjTestApp',
      MessageRetentionPeriod: 1209600,
    });
  });
  it('should create a fifo queue with the correct name and default settings', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'dev-st-RpjTestApp-TestEventCreated.fifo',
      MessageRetentionPeriod: 1209600,
      FifoQueue: true,
      ContentBasedDeduplication: true,
    });
  });
  it('should create a queue with the correct RemovalPolicies', () => {
    standardQueue.resourceRemovalPolicy(RemovalPolicy.RETAIN);
    Template.fromStack(stack).hasResource('AWS::SQS::Queue', {
      Properties: {
        QueueName: 'dev-st-RpjTestApp-TestEventCreated',
      },
      UpdateReplacePolicy: 'Retain',
      DeletionPolicy: 'Retain',
    });
  });
  it('should create both alarms with no actions', () => {
    standardQueueFifo.setCloudWatchAlarms();
    Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
      ActionsEnabled: false,
      AlarmDescription:
        'Alarm if the oldest message in the queue is older than 60 seconds',
      AlarmName:
        'dev-st-RpjTestApp-TestEventCreated.fifo Stale Old Message Alarm',
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      EvaluationPeriods: 2,
      MetricName: 'ApproximateAgeOfOldestMessage',
      Period: 120,
      Statistic: 'Maximum',
      Threshold: 60,
      TreatMissingData: 'ignore',
    });
    Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
      ActionsEnabled: false,
      AlarmDescription:
        'Alarm if the number of messages in the queue is greater than 100',
      AlarmName:
        'dev-st-RpjTestApp-TestEventCreated.fifo High Number of Messages Alarm',
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      EvaluationPeriods: 2,
      MetricName: 'ApproximateNumberOfMessagesVisible',
      Period: 120,
      Statistic: 'Maximum',
      Threshold: 100,
      TreatMissingData: 'ignore',
    });
  });
  it('should create alarms with actions', () => {
    const topic = new Topic(stack, 'AlarmActionTopic');
    const topicRef = stack.getLogicalId(topic.node.defaultChild as CfnElement);
    standardQueue.setCloudWatchAlarms(new SnsAction(topic));
    Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'dev-st-RpjTestApp-TestEventCreated Stale Old Message Alarm',
      ActionsEnabled: true,
      AlarmActions: [{ Ref: topicRef }],
      OKActions: [{ Ref: topicRef }],
    });
    Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName:
        'dev-st-RpjTestApp-TestEventCreated High Number of Messages Alarm',
      ActionsEnabled: true,
      AlarmActions: [{ Ref: topicRef }],
      OKActions: [{ Ref: topicRef }],
    });
  });
  it('Should have policy to publish actions', () => {
    standardQueue.grantPolicies(
      new Role(stack, 'IAMRole', {
        assumedBy: new ServicePrincipal('sts.amazonaws.com'),
      }),
    );
    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'sqs:ReceiveMessage',
              'sqs:ChangeMessageVisibility',
              'sqs:GetQueueUrl',
              'sqs:DeleteMessage',
              'sqs:GetQueueAttributes',
            ],
            Effect: 'Allow',
            Resource: {
              'Fn::GetAtt': [standardQueueRef, 'Arn'],
            },
          },
        ],
      },
    });
  });
  it('Should grant the policy to the role', () => {
    standardQueue.grantPolicies(
      new Role(stack, 'IAMRole', {
        assumedBy: new ServicePrincipal('sts.amazonaws.com'),
      }),
    );
    const roleRef = stack.getLogicalId(
      stack.node.findChild('IAMRole').node.defaultChild as CfnElement,
    );
    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
      Roles: [{ Ref: roleRef }],
    });
  });
  it('EDAStandardFifo Should throw error if QueueProp has fifo false', () => {
    expect(() => {
      new EDAStandardQueueFifo(stack, {
        eventName: 'eventName1',
        dlq: dlqFifo.getDlq(),
        config,
        queueProps: { fifo: false },
      });
      return Template.fromStack(stack);
    }).toThrow("Non-FIFO queue name may not end in '.fifo'");
  });
  it('EDAStandardFifo Should throw error if dlq is not fifo', () => {
    new EDAStandardQueueFifo(stack, {
      eventName: 'eventName1',
      dlq: dlq.getDlq(),
      config,
    });
    expect(() => Template.fromStack(stack)).toThrow(
      'Queues that are FIFO requires dlq to be a FIFO queue',
    );
  });
  it('EDAStandardFifo.subscribeFromSnsTopicArnWithProps should create a subscription with a filter', () => {
    standardQueueFifo.subscribeFromSnsTopicArnWithProps(
      'arn:aws:sns:us-east-1:123456789012:testsns',
      {
        filterPolicyWithMessageBody: {
          target_object: FilterOrPolicy.filter(
            SubscriptionFilter.stringFilter({
              allowlist: ['test'],
            }),
          ),
        },
      },
    );
    Template.fromStack(stack).hasResourceProperties('AWS::SNS::Subscription', {
      FilterPolicy: {
        target_object: ['test'],
      },
    });
  });
  it('EDAStandardQueueFifo.subscribeWithCfnSubscription should createa subscription with a filter', () => {
    standardQueueFifo.subscribeWithCfnSubscription({
      arn: 'arn:aws:sns:us-east-1:123456789012:testsns',
      filterPolicyScope: 'MessageBody',
      filterPolicy: {
        target_object: ['application', 'requirement'],
        $or: [
          { automatically_processed_in_prepayment: [true] },
          { automatically_processed_in_presubmission: [true] },
        ],
      },
    });
    Template.fromStack(stack).hasResourceProperties('AWS::SNS::Subscription', {
      FilterPolicy: {
        target_object: ['application', 'requirement'],
        $or: [
          { automatically_processed_in_prepayment: [true] },
          { automatically_processed_in_presubmission: [true] },
        ],
      },
    });
  });
  it('subscribeFromSNSTopicImport should subscribe to an imported SNS topic', () => {
    standardQueue.subscribeFromSNSTopicImport('output-dev-MyTopic-arn');
    Template.fromStack(stack).hasResourceProperties('AWS::SNS::Subscription', {
      Protocol: 'sqs',
    });
  });
  it('subscribeFromSnsTopicArnWithProps should subscribe with filter props', () => {
    standardQueue.subscribeFromSnsTopicArnWithProps(
      'arn:aws:sns:us-east-1:123456789012:testsns',
      {
        filterPolicyWithMessageBody: {
          target_object: FilterOrPolicy.filter(
            SubscriptionFilter.stringFilter({
              allowlist: ['test'],
            }),
          ),
        },
      },
    );
    Template.fromStack(stack).hasResourceProperties('AWS::SNS::Subscription', {
      FilterPolicy: {
        target_object: ['test'],
      },
    });
  });
  it('should apply RETAIN removal policy to the standard queue', () => {
    const freshStack = new Stack();
    const freshDlq = new DLQ(freshStack, config);
    const queue = new EDAStandardQueue(freshStack, {
      eventName: 'RemovalTest',
      dlq: freshDlq.getDlq(),
      config,
    });
    queue.resourceRemovalPolicy(RemovalPolicy.RETAIN);
    Template.fromStack(freshStack).hasResource('AWS::SQS::Queue', {
      Properties: {
        QueueName: 'dev-st-RpjTestApp-RemovalTest',
      },
      UpdateReplacePolicy: 'Retain',
      DeletionPolicy: 'Retain',
    });
  });
  it('setCustomAlarms should create a custom CloudWatch alarm on a DLQ', () => {
    dlq.setCustomAlarms(
      (resource, resourceName) => ({
        metric: resource.metricApproximateNumberOfMessagesVisible({
          period: Duration.minutes(1),
          statistic: Stats.MAXIMUM,
        }),
        threshold: 10,
        alarmName: `${resourceName} Custom Alarm`,
        evaluationPeriods: 1,
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: TreatMissingData.IGNORE,
      }),
      'custom-metric',
    );
    Template.fromStack(stack).resourceCountIs('AWS::CloudWatch::Alarm', 1);
    Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'dev-dlq-RpjTestApp Custom Alarm',
      ActionsEnabled: false,
      Threshold: 10,
      EvaluationPeriods: 1,
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      TreatMissingData: 'ignore',
    });
  });
});
