import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { BaseConfig } from '../../core';
import { OpsGenie, OpsGenieApiKeys } from './opsgenie.construct';
import { testconfig } from '../../test/common.test.const';

describe('OpsGenie', () => {
  let stack: Stack;
  let config: BaseConfig;
  let template: Template;
  let apiKeys: OpsGenieApiKeys;

  beforeEach(() => {
    stack = new Stack();
    config = testconfig;
    apiKeys = {
      dev: 'devApiKey',
      prd: 'prdApiKey',
      stg: 'stgApiKey',
    };

    new OpsGenie(stack, { config, apiKeys });
    template = Template.fromStack(stack);
  });
  it('Should create an SNS topic for OpsGenie', () => {
    template.hasResourceProperties(
      'AWS::SNS::Topic',
      Match.objectLike({
        TopicName: 'dev-pltf-alarm-action-opsGenie',
      }),
    );
  });
  it('Should create an SNS action for OpsGenie', () => {
    template.hasResourceProperties(
      'AWS::SNS::Subscription',
      Match.objectLike({
        Protocol: 'https',
        Endpoint:
          'https://api.opsgenie.com/v1/json/cloudwatch?apiKey=devApiKey',
      }),
    );
  });
  it('Should add the necessary policy statements to the SNS topic', () => {
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
  it('Should output the ARN of the OpsGenie SNS topic', () => {
    const outputStack = new Stack();
    const opsgenieWithOutput = new OpsGenie(outputStack, { config, apiKeys });
    opsgenieWithOutput.outputArn();
    Template.fromStack(outputStack).hasOutput('*', {
      Export: {
        Name: 'output-pltf-banana-stack-opsgenie-arn',
      },
      Description: 'The ARN of the OpsGenie SNS topic opsgenie',
    });
  });
});
