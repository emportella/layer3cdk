import { Stack } from 'aws-cdk-lib';
import { PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { ABConfig } from './ab.config';
import { ResourceType } from './ab.constant';
import { ABConstruct } from './ab.construct';
import { testAbConfig } from '../test/common.test.const';

describe('ABConstruct', () => {
  class MockABConstruct extends ABConstruct<string> {
    constructor(
      scope: Construct,
      resourceType: ResourceType,
      resourceName: string,
      resource: string,
      config: ABConfig,
    ) {
      super(scope, resourceType, resourceName, config);
    }
    getArn(): string {
      return 'mockArn';
    }
    outputArn(): void {
      // implementation not relevant for the test
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    grantPolicies(iamRole: Role): void {
      // implementation not relevant for the test
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    addPolicyStatements(...statements: PolicyStatement[]): void {
      // implementation not relevant for the test
    }
    setCloudWatchAlarms(): void {
      // implementation not relevant for the test
    }
    resourceRemovalPolicy(): void {
      // implementation not relevant for the test
    }
  }

  const mockScope = new Stack();
  const mockConfig: ABConfig = testAbConfig;

  it('should initialize correctly', () => {
    const resource = 'testResource';
    const mockABConstruct = new MockABConstruct(
      mockScope,
      'sns',
      'MyResource',
      resource,
      mockConfig,
    );

    expect(mockABConstruct.resourceType).toEqual('sns');
    expect(mockABConstruct.resourceName).toEqual('MyResource');
  });
});
