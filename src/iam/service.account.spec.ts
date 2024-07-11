import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Capture, Template } from 'aws-cdk-lib/assertions';
import { ABConfig, generateServiceAccountRoleName } from '../common';
import { ServiceAccountRole } from './service.account';
import { testAbConfig } from '../test/common.test.const';

describe('EDASns', () => {
  let stack: Stack;
  let config: ABConfig;
  let roleName: string;
  let role: ServiceAccountRole;

  beforeEach(() => {
    stack = new Stack();
    config = testAbConfig;
    role = new ServiceAccountRole(stack, config);
    roleName = generateServiceAccountRoleName(config.serviceName, config.abEnv);
  });
  it('should create a role with the correct name', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Role', {
      RoleName: roleName,
    });
  });
  it('should create a role with the right Action', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRoleWithWebIdentity',
          },
        ],
      },
    });
  });
  it('should create a role with the right Action', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRoleWithWebIdentity',
          },
        ],
      },
    });
  });
  it('should create a role with the rightConditions ', () => {
    const captureOIDCUrl = new Capture();
    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Condition: captureOIDCUrl,
          },
        ],
      },
    });
    expect(captureOIDCUrl.asObject()).toHaveProperty('StringEquals');
    expect(JSON.stringify(captureOIDCUrl.asObject().StringEquals)).toContain(
      'sts.amazonaws.com',
    );
    expect(JSON.stringify(captureOIDCUrl.asObject().StringLike)).toContain(
      'system:serviceaccount:*:rpj-test-app-service-account',
    );
    expect(captureOIDCUrl.asObject()).toHaveProperty('StringLike');
  });
  it('should create a role with the correct RemovalPolicies', () => {
    role.resourceRemovalPolicy(RemovalPolicy.RETAIN);
    Template.fromStack(stack).hasResource('AWS::IAM::Role', {
      Properties: {
        RoleName: roleName,
      },
      UpdateReplacePolicy: 'Retain',
      DeletionPolicy: 'Retain',
    });
  });
});
