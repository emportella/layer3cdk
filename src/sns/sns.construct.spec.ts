import { CfnElement, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
  AnyPrincipal,
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { BaseConfig, constructId } from '../core';
import { SnsTopic, SnsTopicFifo } from './sns.construct';
import { testconfig } from '../test/common.test.const';

describe('SnsTopic', () => {
  let stack: Stack;
  let config: BaseConfig;
  let iAMRole: Role;
  let eventName: string;
  let sns: SnsTopic;
  let snsFifo: SnsTopicFifo;
  let topicRef: string;

  beforeEach(() => {
    stack = new Stack();
    config = testconfig;
    iAMRole = new Role(stack, 'IAMRole', {
      assumedBy: new ServicePrincipal('sts.amazonaws.com'),
    });
    eventName = 'MyTopic';
    sns = new SnsTopic(stack, { config, eventName });
    topicRef = stack.getLogicalId(
      stack.node.findChild(
        constructId(config.stackName, 'topic', sns.eventName),
      ).node.defaultChild as CfnElement,
    );
    snsFifo = new SnsTopicFifo(stack, { config, eventName });
  });

  it('should create a topic with the correct name', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::SNS::Topic', {
      TopicName: 'dev-MyTopic',
    });
  });
  it('should create a FIFO topic with the correct name', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::SNS::Topic', {
      TopicName: 'dev-MyTopic.fifo',
    });
  });
  it('should grant publish permissions to the IAM role', () => {
    sns.grantPolicies(iAMRole);
    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 'sns:Publish',
            Effect: 'Allow',
            Resource: { Ref: topicRef },
          },
        ],
      },
    });
  });

  it('should create a CloudWatch alarm for failed notifications', () => {
    snsFifo.setCloudWatchAlarms();
    Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'MyTopic-fifo Notification Failed Alarm',
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      EvaluationPeriods: 2,
      MetricName: 'NumberOfNotificationsFailed',
      Namespace: 'AWS/SNS',
      Period: 120,
      Statistic: 'Maximum',
      Threshold: 1,
      TreatMissingData: 'ignore',
    });
  });

  it('should create an output for the topic ARN', () => {
    sns.outputArn();
    Template.fromStack(stack).hasOutput(`*`, {
      Export: {
        Name: 'output-pltf-banana-stack-MyTopic-arn',
      },
      Value: { Ref: topicRef },
    });
  });

  it('should add policy statements to the topic', () => {
    const statement = new PolicyStatement({
      effect: Effect.ALLOW,
      principals: [new AnyPrincipal()],
      actions: ['sns:Publish'],
      resources: ['*'],
    });
    sns.addPolicyStatements(statement);
    Template.fromStack(stack).hasResourceProperties('AWS::SNS::TopicPolicy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 'sns:Publish',
            Effect: 'Allow',
            Principal: { AWS: '*' },
            Resource: '*',
          },
        ],
      },
    });
  });

  it('should apply RETAIN removal policy to the topic', () => {
    sns.resourceRemovalPolicy(RemovalPolicy.RETAIN);
    Template.fromStack(stack).hasResource('AWS::SNS::Topic', {
      Properties: {
        TopicName: 'dev-MyTopic',
      },
      UpdateReplacePolicy: 'Retain',
      DeletionPolicy: 'Retain',
    });
  });

  it('SnsTopicFifo should throw error if topicProps has fifo false', () => {
    expect(() => {
      new SnsTopicFifo(new Stack(), {
        config,
        eventName: 'FifoValidation',
        topicProps: { fifo: false },
      });
    }).toThrow('SNS FIFO requires fifo=true');
  });
});
