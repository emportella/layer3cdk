import { CfnElement, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { ABConfig, generateConstructId } from '../common';
import { EDASns, EDASnsFifo } from './sns.eda.construct';
import { testAbConfig } from '../test/common.test.const';

describe('EDASns', () => {
  let stack: Stack;
  let config: ABConfig;
  let iAMRole: Role;
  let eventName: string;
  let sns: EDASns;
  let snsFifo: EDASnsFifo;
  let topicRef: string;

  beforeEach(() => {
    stack = new Stack();
    config = testAbConfig;
    iAMRole = new Role(stack, 'IAMRole', {
      assumedBy: new ServicePrincipal('sts.amazonaws.com'),
    });
    eventName = 'MyTopic';
    sns = new EDASns(stack, eventName, config);
    topicRef = stack.getLogicalId(
      stack.node.findChild(
        generateConstructId(config.stackName, 'sns', sns.eventName),
      ).node.defaultChild as CfnElement,
    );
    snsFifo = new EDASnsFifo(stack, eventName, config);
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
      AlarmName: 'dev-MyTopic.fifo Notification Failed Alarm',
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
        Name: 'output-dev-MyTopic-arn',
      },
      Value: { Ref: topicRef },
    });
  });
});
