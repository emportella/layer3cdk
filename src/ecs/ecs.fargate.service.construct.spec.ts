import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerImage } from 'aws-cdk-lib/aws-ecs';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { BaseConfig } from '../core';
import { EcsFargateService } from './ecs.fargate.service.construct';
import { testconfig } from '../test/common.test.const';

describe('EcsFargateService', () => {
  let stack: Stack;
  let config: BaseConfig;
  let cluster: Cluster;
  let service: EcsFargateService;

  beforeEach(() => {
    stack = new Stack();
    config = testconfig;
    const vpc = new Vpc(stack, 'TestVpc');
    cluster = new Cluster(stack, 'TestCluster', { vpc });
    service = new EcsFargateService(stack, {
      config,
      serviceName: 'api-gateway',
      cluster,
      container: {
        image: ContainerImage.fromRegistry('nginx:latest'),
        portMappings: [{ containerPort: 8080 }],
        environment: { PORT: '8080' },
      },
    });
  });

  it('should create a Fargate service with the correct name', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::ECS::Service', {
      ServiceName: 'dev-BananaLauncher-ApiGateway',
      LaunchType: 'FARGATE',
    });
  });

  it('should create a task definition with correct CPU and memory defaults', () => {
    Template.fromStack(stack).hasResourceProperties(
      'AWS::ECS::TaskDefinition',
      {
        Family: 'dev-BananaLauncher-ApiGateway',
        Cpu: '256',
        Memory: '512',
        NetworkMode: 'awsvpc',
        RequiresCompatibilities: ['FARGATE'],
      },
    );
  });

  it('should create a container with correct port mapping and env vars', () => {
    Template.fromStack(stack).hasResourceProperties(
      'AWS::ECS::TaskDefinition',
      {
        ContainerDefinitions: Match.arrayWith([
          Match.objectLike({
            PortMappings: [
              Match.objectLike({ ContainerPort: 8080, Protocol: 'tcp' }),
            ],
            Environment: Match.arrayWith([
              Match.objectLike({ Name: 'PORT', Value: '8080' }),
            ]),
          }),
        ]),
      },
    );
  });

  it('should create a log group with the correct name', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/ecs/dev-BananaLauncher-ApiGateway',
      RetentionInDays: 7,
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
    const prdVpc = new Vpc(prdStack, 'Vpc');
    const prdCluster = new Cluster(prdStack, 'Cluster', { vpc: prdVpc });
    new EcsFargateService(prdStack, {
      config: prdConfig,
      serviceName: 'api-gateway',
      cluster: prdCluster,
      container: {
        image: ContainerImage.fromRegistry('nginx:latest'),
        portMappings: [{ containerPort: 8080 }],
      },
    });
    Template.fromStack(prdStack).hasResourceProperties(
      'AWS::ECS::TaskDefinition',
      {
        Cpu: '512',
        Memory: '1024',
      },
    );
    Template.fromStack(prdStack).hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 30,
    });
  });

  it('should allow ecsServiceConfig overrides', () => {
    const freshStack = new Stack();
    const freshVpc = new Vpc(freshStack, 'Vpc');
    const freshCluster = new Cluster(freshStack, 'Cluster', {
      vpc: freshVpc,
    });
    new EcsFargateService(freshStack, {
      config,
      serviceName: 'big-worker',
      cluster: freshCluster,
      container: {
        image: ContainerImage.fromRegistry('nginx:latest'),
      },
      ecsServiceConfig: {
        default: { cpu: 1024, memoryLimitMiB: 2048 },
      },
    });
    Template.fromStack(freshStack).hasResourceProperties(
      'AWS::ECS::TaskDefinition',
      {
        Cpu: '1024',
        Memory: '2048',
      },
    );
  });

  it('should return the ARN of the service', () => {
    expect(service.getArn()).toBeDefined();
  });

  it('should create a CfnOutput for the service ARN', () => {
    service.outputArn();
    Template.fromStack(stack).hasOutput('*', {
      Export: { Name: Match.stringLikeRegexp('.*arn$') },
      Description: Match.stringLikeRegexp('.*ECS Fargate service.*'),
    });
  });

  it('should add permissions to the task role', () => {
    service.addPermissions(
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

  it('should create alarms with no actions', () => {
    service.setCloudWatchAlarms();
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'api-gateway ECS CPU Utilization',
      ActionsEnabled: false,
      Threshold: 80,
    });
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'api-gateway ECS Memory Utilization',
      ActionsEnabled: false,
      Threshold: 80,
    });
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'api-gateway ECS Running Task Count',
      ActionsEnabled: false,
      Threshold: 1,
      ComparisonOperator: 'LessThanThreshold',
      TreatMissingData: 'breaching',
    });
  });

  it('should set up auto-scaling when configured', () => {
    const asStack = new Stack();
    const asVpc = new Vpc(asStack, 'Vpc');
    const asCluster = new Cluster(asStack, 'Cluster', { vpc: asVpc });
    new EcsFargateService(asStack, {
      config,
      serviceName: 'scaled-api',
      cluster: asCluster,
      container: {
        image: ContainerImage.fromRegistry('nginx:latest'),
        portMappings: [{ containerPort: 8080 }],
      },
      autoScaling: {
        minCapacity: 1,
        maxCapacity: 4,
        targetCpuUtilization: 70,
      },
    });
    Template.fromStack(asStack).hasResourceProperties(
      'AWS::ApplicationAutoScaling::ScalableTarget',
      {
        MinCapacity: 1,
        MaxCapacity: 4,
      },
    );
    Template.fromStack(asStack).hasResourceProperties(
      'AWS::ApplicationAutoScaling::ScalingPolicy',
      {
        TargetTrackingScalingPolicyConfiguration: Match.objectLike({
          TargetValue: 70,
          PredefinedMetricSpecification: Match.objectLike({
            PredefinedMetricType: 'ECSServiceAverageCPUUtilization',
          }),
        }),
      },
    );
  });

  it('should apply removal policy', () => {
    service.resourceRemovalPolicy(RemovalPolicy.RETAIN);
    Template.fromStack(stack).hasResource('AWS::ECS::Service', {
      UpdateReplacePolicy: 'Retain',
      DeletionPolicy: 'Retain',
    });
  });

  it('should expose escape hatches', () => {
    expect(service.getService()).toBeDefined();
    expect(service.getTaskDefinition()).toBeDefined();
    expect(service.getTaskRole()).toBeDefined();
  });

  it('should create multiple services on the same cluster', () => {
    new EcsFargateService(stack, {
      config,
      serviceName: 'worker',
      cluster,
      container: {
        image: ContainerImage.fromRegistry('nginx:latest'),
        command: ['node', 'dist/worker.js'],
      },
    });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::ECS::Service', 2);
    template.hasResourceProperties('AWS::ECS::Service', {
      ServiceName: 'dev-BananaLauncher-ApiGateway',
    });
    template.hasResourceProperties('AWS::ECS::Service', {
      ServiceName: 'dev-BananaLauncher-Worker',
    });
  });
});
