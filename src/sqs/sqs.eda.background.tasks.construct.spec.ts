import { CfnElement, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { ABConfig, generateConstructId } from '../common';
import { DLQ, DLQFifo } from './sqs.dlq.construct';
import {
  EDABackgroundTasksQueue,
  EDABackgroundTasksQueueFifo,
} from './sqs.eda.background.tasks.construct';
import { testAbConfig } from '../test/common.test.const';

describe('EDABackgroundTasksQueue', () => {
  let stack: Stack;
  let config: ABConfig;
  let dlq: DLQ;
  let dlqfifo: DLQFifo;
  let backgroundTaskQueue: EDABackgroundTasksQueue;
  let backgroundTaskQueueFifo: EDABackgroundTasksQueueFifo;
  let eventName: string;
  let backgroundTaskQueueRef: string;

  beforeEach(() => {
    stack = new Stack();
    eventName = 'TestEventCreated';
    config = testAbConfig;
    dlq = new DLQ(stack, config);
    dlqfifo = new DLQFifo(stack, config);
    backgroundTaskQueue = new EDABackgroundTasksQueue(
      stack,
      eventName,
      dlq.getDlq(),
      config,
    );
    backgroundTaskQueueRef = stack.getLogicalId(
      stack.node.findChild(
        generateConstructId(
          config.stackName,
          'sqs',
          backgroundTaskQueue.resourceName,
        ),
      ).node.defaultChild as CfnElement,
    );
    backgroundTaskQueueFifo = new EDABackgroundTasksQueueFifo(
      stack,
      eventName,
      dlqfifo.getDlq(),
      config,
    );
  });
  it('should create 4 queues', () => {
    Template.fromStack(stack).resourceCountIs('AWS::SQS::Queue', 4);
  });
  it('should create a queue with the correct name and default settings', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'dev-task-RpjTestApp-TestEventCreated',
      MessageRetentionPeriod: 1209600,
      VisibilityTimeout: 30,
    });
    Template.fromStack(stack).hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'dev-dlq-RpjTestApp',
      MessageRetentionPeriod: 1209600,
    });
  });
  it('should create a queue with the correct RemovalPolicies', () => {
    backgroundTaskQueueFifo.resourceRemovalPolicy(RemovalPolicy.RETAIN);
    Template.fromStack(stack).hasResource('AWS::SQS::Queue', {
      Properties: {
        QueueName: 'dev-task-RpjTestApp-TestEventCreated.fifo',
      },
      UpdateReplacePolicy: 'Retain',
      DeletionPolicy: 'Retain',
    });
  });
  it('should create both alarms with no actions', () => {
    backgroundTaskQueue.setCloudWatchAlarms();
    Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
      ActionsEnabled: false,
      AlarmDescription:
        'Alarm if the oldest message in the queue is older than 60 seconds',
      AlarmName: 'dev-task-RpjTestApp-TestEventCreated Stale Old Message Alarm',
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
        'dev-task-RpjTestApp-TestEventCreated High Number of Messages Alarm',
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
    backgroundTaskQueue.setCloudWatchAlarms(new SnsAction(topic));
    Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'dev-task-RpjTestApp-TestEventCreated Stale Old Message Alarm',
      ActionsEnabled: true,
      AlarmActions: [{ Ref: topicRef }],
      OKActions: [{ Ref: topicRef }],
    });
    Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName:
        'dev-task-RpjTestApp-TestEventCreated High Number of Messages Alarm',
      ActionsEnabled: true,
      AlarmActions: [{ Ref: topicRef }],
      OKActions: [{ Ref: topicRef }],
    });
  });

  it('Should have policy to publish and consume tasks', () => {
    backgroundTaskQueue.grantPolicies(
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
              'Fn::GetAtt': [backgroundTaskQueueRef, 'Arn'],
            },
          },
          {
            Action: [
              'sqs:SendMessage',
              'sqs:GetQueueAttributes',
              'sqs:GetQueueUrl',
            ],
            Effect: 'Allow',
            Resource: {
              'Fn::GetAtt': [backgroundTaskQueueRef, 'Arn'],
            },
          },
        ],
      },
    });
  });
  it('Should grant the policy to the role', () => {
    backgroundTaskQueue.grantPolicies(
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
      new EDABackgroundTasksQueueFifo(
        stack,
        'eventName1',
        dlqfifo.getDlq(),
        config,
        {
          fifo: false,
        },
      );
      return Template.fromStack(stack);
    }).toThrow("Non-FIFO queue name may not end in '.fifo'");
  });
  it('EDAStandardFifo Should throw error if dlq is not fifo', () => {
    expect(() => {
      new EDABackgroundTasksQueueFifo(
        stack,
        'eventName1',
        dlq.getDlq(),
        config,
      );
      return Template.fromStack(stack);
    }).toThrow('Queues that are FIFO requires dlq to be a FIFO queue');
  });
});
