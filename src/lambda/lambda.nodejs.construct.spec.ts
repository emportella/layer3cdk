import * as path from 'path';
import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { BaseConfig } from '../core';
import { NodejsLambdaFunction } from './lambda.nodejs.construct';
import { testconfig } from '../test/common.test.const';

describe('NodejsLambdaFunction', () => {
  let stack: Stack;
  let config: BaseConfig;
  let lambdaFn: NodejsLambdaFunction;
  const functionName = 'process-orders';

  beforeEach(() => {
    stack = new Stack();
    config = testconfig;
    lambdaFn = new NodejsLambdaFunction(stack, {
      config,
      functionName,
      entry: path.join(__dirname, '../test/fixtures/handler.ts'),
    });
  });

  it('should create a Lambda function with the correct name and defaults', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'dev-BananaLauncher-ProcessOrders',
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
    new NodejsLambdaFunction(prdStack, {
      config: prdConfig,
      functionName,
      entry: path.join(__dirname, '../test/fixtures/handler.ts'),
    });
    Template.fromStack(prdStack).hasResourceProperties(
      'AWS::Lambda::Function',
      {
        MemorySize: 512,
        TracingConfig: { Mode: 'Active' },
      },
    );
  });

  it('should allow functionProps overrides', () => {
    const freshStack = new Stack();
    new NodejsLambdaFunction(freshStack, {
      config,
      functionName: 'override-test',
      entry: path.join(__dirname, '../test/fixtures/handler.ts'),
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
    });
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'process-orders Lambda Duration',
      ActionsEnabled: false,
    });
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'process-orders Lambda Throttles',
      ActionsEnabled: false,
    });
  });

  it('should add permissions to the Lambda execution role', () => {
    lambdaFn.addPermissions(
      new PolicyStatement({
        actions: ['dynamodb:Query'],
        resources: ['arn:aws:dynamodb:us-east-1:123456789012:table/Orders'],
        effect: Effect.ALLOW,
      }),
    );
    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'dynamodb:Query',
            Effect: 'Allow',
            Resource: 'arn:aws:dynamodb:us-east-1:123456789012:table/Orders',
          }),
        ]),
      },
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
});
