import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { BaseConfig } from '../core';
import { EcsCluster } from './ecs.cluster.construct';
import { testconfig } from '../test/common.test.const';

describe('EcsCluster', () => {
  let stack: Stack;
  let config: BaseConfig;
  let vpc: Vpc;
  let cluster: EcsCluster;

  beforeEach(() => {
    stack = new Stack();
    config = testconfig;
    vpc = new Vpc(stack, 'TestVpc');
    cluster = new EcsCluster(stack, { config, vpc });
  });

  it('should create a cluster with the correct name', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::ECS::Cluster', {
      ClusterName: 'dev-BananaLauncher-Cluster',
    });
  });

  it('should have Container Insights disabled by default', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::ECS::Cluster', {
      ClusterSettings: Match.arrayWith([
        Match.objectLike({
          Name: 'containerInsights',
          Value: 'disabled',
        }),
      ]),
    });
  });

  it('should enable Container Insights when set', () => {
    const insightsStack = new Stack();
    const insightsVpc = new Vpc(insightsStack, 'Vpc');
    new EcsCluster(insightsStack, {
      config,
      vpc: insightsVpc,
      containerInsights: true,
    });
    Template.fromStack(insightsStack).hasResourceProperties(
      'AWS::ECS::Cluster',
      {
        ClusterSettings: Match.arrayWith([
          Match.objectLike({
            Name: 'containerInsights',
            Value: 'enabled',
          }),
        ]),
      },
    );
  });

  it('should return the ARN of the cluster', () => {
    expect(cluster.getArn()).toBeDefined();
  });

  it('should return the cluster for service props', () => {
    expect(cluster.getCluster()).toBeDefined();
  });

  it('should create a CfnOutput for the cluster ARN', () => {
    cluster.outputArn();
    Template.fromStack(stack).hasOutput('*', {
      Export: { Name: Match.stringLikeRegexp('.*arn$') },
      Description: Match.stringLikeRegexp('.*ECS cluster.*'),
    });
  });
});
