import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { BaseConfig } from '../core';
import { GlobalSecrets } from './secrets.constructs';
import { testconfig } from '../test/common.test.const';

describe('Secrets', () => {
  let stack: Stack;
  let config: BaseConfig;
  const parameterName = 'my-secret';

  beforeEach(() => {
    stack = new Stack();
    config = testconfig;
  });

  describe('GlobalSecrets', () => {
    beforeEach(() => {
      new GlobalSecrets(stack, parameterName, config);
    });

    it('should create a Secrets Manager secret', () => {
      Template.fromStack(stack).hasResource('AWS::SecretsManager::Secret', {});
    });

    it('should create exactly one secret', () => {
      Template.fromStack(stack).resourceCountIs(
        'AWS::SecretsManager::Secret',
        1,
      );
    });
  });
});
