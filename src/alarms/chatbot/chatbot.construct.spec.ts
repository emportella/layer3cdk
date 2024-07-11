import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ABConfig } from '../../common';
import {
  ChatbotSlackChannelIds,
  ChatbotSlackChannnel,
} from './chatbot.construct';
import { testAbConfig } from '../../test/common.test.const';

describe('Chatbot', () => {
  let stack: Stack;
  let config: ABConfig;
  let channelIds: ChatbotSlackChannelIds;
  let template: Template;
  beforeEach(() => {
    stack = new Stack();
    config = testAbConfig;
    channelIds = {
      dev: 'dev-channel-id',
      preprod: 'preprod-channel-id',
      perf: 'perf-channel-id',
      prod: 'prod-channel-id',
    };
    new ChatbotSlackChannnel(stack, channelIds, config);
    template = Template.fromStack(stack);
  });
  it('Should create a chatbot', () => {
    template.hasResourceProperties(
      'AWS::Chatbot::SlackChannelConfiguration',
      Match.objectLike({
        ConfigurationName: 'dev-rpj-chatBot-slack-alarm',
        SlackChannelId: 'dev-channel-id',
        SlackWorkspaceId: 'T04TK4S51',
      }),
    );
  });
  it('Should create SNS Topic', () => {
    template.hasResourceProperties(
      'AWS::SNS::Topic',
      Match.objectLike({
        TopicName: 'dev-rpj-alarm-action',
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
      RoleName: 'dev-rpj-chatbot-role',
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
});
