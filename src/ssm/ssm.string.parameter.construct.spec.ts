import { CfnElement, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { BaseConfig } from '../core';
import { ssmParameterName } from './ssm.name.conventions';
import {
  DomainSSMStringParameter,
  GlobalSSMStringParameter,
  ServiceSSMStringParameter,
} from './ssm.string.parameter.construct';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { testconfig } from '../test/common.test.const';

describe('SSMStringParameter', () => {
  let stack: Stack;
  let config: BaseConfig;
  let ssmStringParameter:
    | GlobalSSMStringParameter
    | DomainSSMStringParameter
    | ServiceSSMStringParameter;
  let parameterName: string;
  const param = {
    name: 'testName',
    value: 'testValue',
  };

  beforeEach(() => {
    stack = new Stack();
    config = testconfig;
  });

  describe('GlobalSSMStringParameter', () => {
    beforeEach(() => {
      ssmStringParameter = new GlobalSSMStringParameter(stack, {
        config,
        parameterName: param.name,
        parameterValue: param.value,
      });

      parameterName = ssmParameterName({
        parameterName: param.name,
        serviceName: config.serviceName,
        domain: config.domain,
        contextLevel: 'global',
        env: config.stackEnv,
      });
    });

    it('should create string paramter with the correct name and value', () => {
      Template.fromStack(stack).hasResourceProperties('AWS::SSM::Parameter', {
        Name: parameterName,
        Value: param.value,
      });
    });

    it('Should grant the policy to the role', () => {
      ssmStringParameter.grantPolicies(
        new Role(stack, 'IAMRole', {
          assumedBy: new ServicePrincipal('sts.amazonaws.com'),
        }),
      );
      const roleRef = stack.getLogicalId(
        stack.node.findChild('IAMRole').node.defaultChild as CfnElement,
      );
      Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
        Roles: [{ Ref: roleRef }],
      });
    });
  });

  describe('DomainSSMStringParameter', () => {
    beforeEach(() => {
      ssmStringParameter = new DomainSSMStringParameter(stack, {
        config,
        parameterName: param.name,
        parameterValue: param.value,
      });

      parameterName = ssmParameterName({
        parameterName: param.name,
        serviceName: config.serviceName,
        domain: config.domain,
        contextLevel: 'domain',
        env: config.stackEnv,
      });
    });

    it('should create string paramter with the correct name and value', () => {
      Template.fromStack(stack).hasResourceProperties('AWS::SSM::Parameter', {
        Name: parameterName,
        Value: param.value,
      });
    });

    it('Should grant the policy to the role', () => {
      ssmStringParameter.grantPolicies(
        new Role(stack, 'IAMRole', {
          assumedBy: new ServicePrincipal('sts.amazonaws.com'),
        }),
      );
      const roleRef = stack.getLogicalId(
        stack.node.findChild('IAMRole').node.defaultChild as CfnElement,
      );
      Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
        Roles: [{ Ref: roleRef }],
      });
    });
  });

  describe('ServiceSSMStringParameter', () => {
    beforeEach(() => {
      ssmStringParameter = new ServiceSSMStringParameter(stack, {
        config,
        parameterName: param.name,
        parameterValue: param.value,
      });

      parameterName = ssmParameterName({
        parameterName: param.name,
        serviceName: config.serviceName,
        domain: config.domain,
        contextLevel: 'service',
        env: config.stackEnv,
      });
    });

    it('should create string paramter with the correct name and value', () => {
      Template.fromStack(stack).hasResourceProperties('AWS::SSM::Parameter', {
        Name: parameterName,
        Value: param.value,
      });
    });

    it('Should grant the policy to the role', () => {
      ssmStringParameter.grantPolicies(
        new Role(stack, 'IAMRole', {
          assumedBy: new ServicePrincipal('sts.amazonaws.com'),
        }),
      );
      const roleRef = stack.getLogicalId(
        stack.node.findChild('IAMRole').node.defaultChild as CfnElement,
      );
      Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
        Roles: [{ Ref: roleRef }],
      });
    });
    it('should create a SSM with the correct RemovalPolicies', () => {
      ssmStringParameter.resourceRemovalPolicy(RemovalPolicy.RETAIN);
      Template.fromStack(stack).hasResource('AWS::SSM::Parameter', {
        Properties: {
          Name: parameterName,
          Value: param.value,
        },
        UpdateReplacePolicy: 'Retain',
        DeletionPolicy: 'Retain',
      });
    });
  });
});
