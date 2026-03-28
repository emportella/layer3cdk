import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { BaseConfig } from '../../core';
import {
  ChatbotSlackChannelIds,
  ChatbotSlackChannnel,
} from './chatbot.construct';
import { testconfig } from '../../test/common.test.const';

describe('Chatbot', () => {
  let stack: Stack;
  let config: BaseConfig;
  let channelIds: ChatbotSlackChannelIds;
  let template: Template;
  beforeEach(() => {
    stack = new Stack();
    config = testconfig;
    channelIds = {
      dev: 'dev-channel-id',
      stg: 'stg-channel-id',
      prd: 'prd-channel-id',
    };
    new ChatbotSlackChannnel(stack, {
      config,
      slackChannelIds: channelIds,
      slackWorkspaceId: 'SLACK1234CINCO',
    });
    template = Template.fromStack(stack);
  });
  it('Should create a chatbot', () => {
    template.hasResourceProperties(
      'AWS::Chatbot::SlackChannelConfiguration',
      Match.objectLike({
        ConfigurationName: 'dev-pltf-chatBot-slack-alarm',
        SlackChannelId: 'dev-channel-id',
        SlackWorkspaceId: 'SLACK1234CINCO',
      }),
    );
  });
  it('Should create SNS Topic', () => {
    template.hasResourceProperties(
      'AWS::SNS::Topic',
      Match.objectLike({
        TopicName: 'dev-pltf-alarm-action',
      }),
    );
  });
  it('Should create SNS TopicPolicy', () => {
    template.hasResourceProperties('AWS::SNS::TopicPolicy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 'sns:Publish',
            Effect: 'Allow',
            Principal: {
              Service: 'cloudwatch.amazonaws.com',
            },
          },
        ],
        Version: '2012-10-17',
      },
    });
  });
  it('Should create IAM Role for Chatbot', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'dev-pltf-chatbot-role',
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: { Service: 'chatbot.amazonaws.com' },
          },
        ],
        Version: '2012-10-17',
      },
    });
  });
  it('Should throw an error when channelId is undefined for the env', () => {
    const incompleteChannelIds = {
      dev: undefined,
      stg: 'stg-channel-id',
      prd: 'prd-channel-id',
    } as unknown as ChatbotSlackChannelIds;
    expect(() => {
      const errorStack = new Stack();
      new ChatbotSlackChannnel(errorStack, {
        config,
        slackChannelIds: incompleteChannelIds,
        slackWorkspaceId: 'SLACK1234CINCO',
      });
    }).toThrow('Slack channel ID is not defined for dev environment');
  });
  it('Should create a CfnOutput for SNS Topic ARN when outputSNSTopicArn is called', () => {
    const outputStack = new Stack();
    const outputChatbot = new ChatbotSlackChannnel(outputStack, {
      config,
      slackChannelIds: channelIds,
      slackWorkspaceId: 'SLACK1234CINCO',
    });
    outputChatbot.outputSNSTopicArn();
    const outputNodes = outputChatbot.node
      .findAll()
      .filter((c) => c.node.id.includes('-arn-id'));
    expect(outputNodes.length).toBe(1);
  });
  it('Should add policy statements to the chatbot role', () => {
    const policyStack = new Stack();
    const policyChatbot = new ChatbotSlackChannnel(policyStack, {
      config,
      slackChannelIds: channelIds,
      slackWorkspaceId: 'SLACK1234CINCO',
    });
    policyChatbot.addPolicyStatements(
      new PolicyStatement({
        actions: ['s3:GetObject'],
        resources: ['*'],
        effect: Effect.ALLOW,
      }),
    );
    Template.fromStack(policyStack).hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:GetObject',
            Effect: 'Allow',
            Resource: '*',
          }),
        ]),
      },
    });
  });
});
