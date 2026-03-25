import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Capture, Template } from 'aws-cdk-lib/assertions';
import { BaseConfig } from '../core';
import { serviceAccountRoleName } from './iam.name.conventions';
import { ServiceAccountRole } from './service.account';
import { testconfig } from '../test/common.test.const';

describe('ServiceAccountRole', () => {
  let stack: Stack;
  let config: BaseConfig;
  let roleName: string;
  let role: ServiceAccountRole;

  beforeEach(() => {
    stack = new Stack();
    config = testconfig;
    role = new ServiceAccountRole(stack, config, {
      dev: 'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/DEV_CLUSTER',
      perf: 'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/PERF_CLUSTER',
      preprod:
        'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/PREPROD_CLUSTER',
      prod: 'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/PROD_CLUSTER',
    });
    roleName = serviceAccountRoleName(config.serviceName, config.stackEnv);
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
