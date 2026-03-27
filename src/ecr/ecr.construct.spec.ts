import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { BaseConfig } from '../core';
import { testconfig } from '../test/common.test.const';
import { ApplicationRepository } from './ecr.construct';

describe('ECR', () => {
  let stack: Stack;
  let config: BaseConfig;
  let repository: ApplicationRepository;

  beforeEach(() => {
    stack = new Stack();
    config = testconfig;
    repository = ApplicationRepository.create(stack, {
      config,
      repositoryName: 'rpj-rp-tasks-service',
    }) as ApplicationRepository;
  });
  it('should create a ECR Repository with the correct name and default settings', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'dev/rpj-rp-tasks-service',
      ImageScanningConfiguration: { ScanOnPush: true },
      ImageTagMutability: 'MUTABLE',
    });
  });
  it('should return the ARN of the repository', () => {
    const arn = repository.getArn();
    expect(arn).toBeDefined();
  });
  it('should create a CloudFormation output for the repository ARN', () => {
    repository.outputArn();
    Template.fromStack(stack).hasOutput('*', {
      Export: { Name: 'output-rpj-rp-tasks-service-arn' },
      Description: `The ARN of the ecr repository rpj-rp-tasks-service`,
    });
  });
  it('should grant the given IAM role permissions to pull and push images in this repository', () => {
    const iamRole = new Role(stack, 'TestRole', {
      assumedBy: new ServicePrincipal('ecs.amazonaws.com'),
    });
    repository.grantPolicies(iamRole);
    Template.fromStack(stack).hasResource('AWS::IAM::Policy', {
      Properties: {
        PolicyDocument: {
          Statement: [
            {
              Action: [
                'ecr:BatchCheckLayerAvailability',
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage',
                'ecr:CompleteLayerUpload',
                'ecr:UploadLayerPart',
                'ecr:InitiateLayerUpload',
                'ecr:PutImage',
              ],
              Effect: 'Allow',
            },
            {
              Action: 'ecr:GetAuthorizationToken',
              Effect: 'Allow',
              Resource: '*',
            },
          ],
        },
      },
    });
  });
  it('should grant the given IAM role permissions to pull images in this repository', () => {
    const iamRole = new Role(stack, 'TestRole', {
      assumedBy: new ServicePrincipal('ecs.amazonaws.com'),
    });
    repository.grantPullPolicy(iamRole);
    Template.fromStack(stack).hasResource('AWS::IAM::Policy', {
      Properties: {
        PolicyDocument: {
          Statement: [
            {
              Action: [
                'ecr:BatchCheckLayerAvailability',
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage',
              ],
              Effect: 'Allow',
            },
            {
              Action: 'ecr:GetAuthorizationToken',
              Effect: 'Allow',
              Resource: '*',
            },
          ],
        },
      },
    });
  });
  it('should grant the given IAM role permissions to push images to this repository', () => {
    const iamRole = new Role(stack, 'TestRole', {
      assumedBy: new ServicePrincipal('ecs.amazonaws.com'),
    });
    repository.grantPushPolicy(iamRole);
    Template.fromStack(stack).hasResource('AWS::IAM::Policy', {
      Properties: {
        PolicyDocument: {
          Statement: [
            {
              Action: [
                'ecr:CompleteLayerUpload',
                'ecr:UploadLayerPart',
                'ecr:InitiateLayerUpload',
                'ecr:BatchCheckLayerAvailability',
                'ecr:PutImage',
              ],
              Effect: 'Allow',
            },
            {
              Action: 'ecr:GetAuthorizationToken',
              Effect: 'Allow',
              Resource: '*',
            },
          ],
        },
      },
    });
  });
  it('should grant the given IAM role permissions to read images from this repository', () => {
    const iamRole = new Role(stack, 'TestRole', {
      assumedBy: new ServicePrincipal('ecs.amazonaws.com'),
    });
    repository.grantReadPolicy(iamRole);
    Template.fromStack(stack).hasResource('AWS::IAM::Policy', {
      Properties: {
        PolicyDocument: {
          Statement: [
            {
              Action: ['ecr:DescribeRepositories', 'ecr:DescribeImages'],
              Effect: 'Allow',
            },
          ],
        },
      },
    });
  });
  it('should apply the specified removal policy to the repository', () => {
    repository.resourceRemovalPolicy(RemovalPolicy.DESTROY);
    Template.fromStack(stack).hasResource('AWS::ECR::Repository', {
      UpdateReplacePolicy: 'Delete',
    });
  });
  it('should create org/ prefixed repository in stg env', () => {
    const stgConfig = new BaseConfig({
      department: config.department,
      env: config.env,
      stackName: config.stackName,
      tags: config.tags,
      stackEnv: 'stg',
      serviceName: config.serviceName,
      description: config.description,
    });
    const stgStack = new Stack();
    const stgRepo = ApplicationRepository.create(stgStack, {
      config: stgConfig,
      repositoryName: 'rpj-rp-tasks-service',
    });
    expect(stgRepo).toBeDefined();
    Template.fromStack(stgStack).hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'org/rpj-rp-tasks-service',
      ImageScanningConfiguration: { ScanOnPush: true },
      ImageTagMutability: 'MUTABLE',
    });
  });
  it('should return undefined in prd env', () => {
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
    const prdRepo = ApplicationRepository.create(prdStack, {
      config: prdConfig,
      repositoryName: 'rpj-rp-tasks-service',
    });
    expect(prdRepo).toBeUndefined();
  });
});
