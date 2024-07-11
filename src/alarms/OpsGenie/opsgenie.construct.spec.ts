import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ABConfig, generateOutputArnExportName } from '../../common';
import { OpsGenie, OpsGenieApiKeys } from './opsgenie.construct';
import { testAbConfig } from '../../test/common.test.const';

describe('OpsGenie', () => {
  let stack: Stack;
  let config: ABConfig;
  let opsgenie: OpsGenie;
  let template: Template;
  let apiKeys: OpsGenieApiKeys;

  beforeEach(() => {
    stack = new Stack();
    config = testAbConfig;
    apiKeys = {
      dev: 'devApiKey',
      prod: 'prodApiKey',
      preprod: 'preprodApiKey',
      perf: 'perfApiKey',
    };

    opsgenie = new OpsGenie(stack, apiKeys, config);
    template = Template.fromStack(stack);
  });
  it('Should create an SNS topic for OpsGenie', () => {
    template.hasResourceProperties(
      'AWS::SNS::Topic',
      Match.objectLike({
        TopicName: 'dev-rpj-alarm-action-opsGenie',
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
    const exportName = generateOutputArnExportName(opsgenie.resourceName);
    template.hasOutput('*', {
      Export: {
        Name: exportName,
      },
      Description:
        'The ARN of the OpsGenie SNS topic rpj-test-stack-sns-cwaction-dev-rpj-opsgenie',
    });
  });
});
