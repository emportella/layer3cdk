import { CfnElement, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { BaseConfig } from '../core';
import { LambdaFunction } from './lambda.construct';
import { testconfig } from '../test/common.test.const';

describe('LambdaFunction', () => {
  let stack: Stack;
  let config: BaseConfig;
  let lambdaFn: LambdaFunction;
  const functionName = 'process-orders';

  beforeEach(() => {
    stack = new Stack();
    config = testconfig;
    lambdaFn = new LambdaFunction(stack, {
      config,
      functionName,
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      codeProvider: () => Code.fromInline('exports.handler = async () => {}'),
    });
  });

  it('should create a Lambda function with the correct name and defaults', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'dev-BananaLauncher-ProcessOrders',
      Runtime: 'nodejs20.x',
      Handler: 'index.handler',
      MemorySize: 256,
      Timeout: 30,
    });
  });

  it('should apply production overrides', () => {
    const prdConfig = new BaseConfig({
      department: config.department,
      env: config.env,
      stackName: config.stackName,
      tags: config.tags,
      stackEnv: 'prd',
      serviceName: config.serviceName,
      description: config.description,
    });
    const prdStack = new Stack();
    new LambdaFunction(prdStack, {
      config: prdConfig,
      functionName,
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      codeProvider: () => Code.fromInline('exports.handler = async () => {}'),
    });
    Template.fromStack(prdStack).hasResourceProperties(
      'AWS::Lambda::Function',
      {
        MemorySize: 512,
        TracingConfig: { Mode: 'Active' },
      },
    );
  });

  it('should invoke codeProvider callback', () => {
    const codeProvider = jest.fn(() =>
      Code.fromInline('exports.handler = async () => {}'),
    );
    const freshStack = new Stack();
    new LambdaFunction(freshStack, {
      config,
      functionName: 'callback-test',
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      codeProvider,
    });
    expect(codeProvider).toHaveBeenCalledTimes(1);
  });

  it('should allow functionProps overrides', () => {
    const freshStack = new Stack();
    new LambdaFunction(freshStack, {
      config,
      functionName: 'override-test',
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      codeProvider: () => Code.fromInline('exports.handler = async () => {}'),
      functionProps: { memorySize: 1024, description: 'Custom description' },
    });
    Template.fromStack(freshStack).hasResourceProperties(
      'AWS::Lambda::Function',
      {
        MemorySize: 1024,
        Description: 'Custom description',
      },
    );
  });

  it('should return the ARN of the function', () => {
    expect(lambdaFn.getArn()).toBeDefined();
  });

  it('should create a CfnOutput for the function ARN', () => {
    lambdaFn.outputArn();
    Template.fromStack(stack).hasOutput('*', {
      Export: { Name: Match.stringLikeRegexp('.*arn$') },
      Description: Match.stringLikeRegexp('.*Lambda function.*'),
    });
  });

  it('should grant invoke permissions to an IAM role', () => {
    const role = new Role(stack, 'TestRole', {
      assumedBy: new ServicePrincipal('ecs.amazonaws.com'),
    });
    lambdaFn.grantPolicies(role);
    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'lambda:InvokeFunction',
            Effect: 'Allow',
          }),
        ]),
      },
    });
  });

  it('should create alarms with no actions', () => {
    lambdaFn.setCloudWatchAlarms();
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'process-orders Lambda Errors',
      ActionsEnabled: false,
      Threshold: 5,
      TreatMissingData: 'notBreaching',
    });
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'process-orders Lambda Duration',
      ActionsEnabled: false,
      Threshold: 25000,
      TreatMissingData: 'notBreaching',
    });
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'process-orders Lambda Throttles',
      ActionsEnabled: false,
      Threshold: 3,
      TreatMissingData: 'notBreaching',
    });
  });

  it('should create alarms with actions', () => {
    const topic = new Topic(stack, 'AlarmActionTopic');
    const topicRef = stack.getLogicalId(topic.node.defaultChild as CfnElement);
    lambdaFn.setCloudWatchAlarms(new SnsAction(topic));

    Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'process-orders Lambda Errors',
      ActionsEnabled: true,
      AlarmActions: [{ Ref: topicRef }],
      OKActions: [{ Ref: topicRef }],
    });
  });

  it('should apply removal policy', () => {
    lambdaFn.resourceRemovalPolicy(RemovalPolicy.RETAIN);
    Template.fromStack(stack).hasResource('AWS::Lambda::Function', {
      UpdateReplacePolicy: 'Retain',
      DeletionPolicy: 'Retain',
    });
  });

  it('should expose the underlying Function', () => {
    expect(lambdaFn.getFunction()).toBeDefined();
  });

  it('should add permissions to the Lambda execution role', () => {
    lambdaFn.addPermissions(
      new PolicyStatement({
        actions: ['s3:GetObject'],
        resources: ['arn:aws:s3:::my-bucket/*'],
        effect: Effect.ALLOW,
      }),
    );
    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:GetObject',
            Effect: 'Allow',
            Resource: 'arn:aws:s3:::my-bucket/*',
          }),
        ]),
      },
    });
  });
});
