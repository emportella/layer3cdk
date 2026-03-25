import { Stack } from 'aws-cdk-lib';
import { BaseConfig } from './base.config';
import { ResourceType } from './constants';
import { BaseConstruct } from './base.construct';
import { testconfig } from '../test/common.test.const';
import { Construct } from 'constructs';

class TestConstruct extends BaseConstruct<string> {
  constructor(
    scope: Construct,
    resourceType: ResourceType,
    resourceName: string,
    config: BaseConfig,
  ) {
    super(scope, resourceType, resourceName, config);
  }
  public getArn(): string {
    return super.getArn();
  }
  public outputArn(): void {
    super.outputArn();
  }
  public setCloudWatchAlarms(): void {
    super.setCloudWatchAlarms();
  }
}

describe('BaseConstruct', () => {
  const mockConfig: BaseConfig = testconfig;

  it('should initialize correctly', () => {
    const construct = new TestConstruct(
      new Stack(),
      'sns',
      'MyResource',
      mockConfig,
    );
    expect(construct.resourceType).toEqual('sns');
    expect(construct.resourceName).toEqual('MyResource');
  });

  it('should throw when setCustomAlarms is called with uninitialized resource', () => {
    const construct = new TestConstruct(
      new Stack(),
      'sns',
      'Uninit',
      mockConfig,
    );
    expect(() => {
      construct.setCustomAlarms(() => ({}) as never, 'test-metric');
    }).toThrow('Resource not initialized for Uninit');
  });

  it('default getArn throws with construct name', () => {
    const construct = new TestConstruct(
      new Stack(),
      'sns',
      'ArnTest',
      mockConfig,
    );
    expect(() => construct.getArn()).toThrow(
      'getArn() not supported by TestConstruct',
    );
  });

  it('default no-op methods do not throw', () => {
    const construct = new TestConstruct(
      new Stack(),
      'sns',
      'NoopTest',
      mockConfig,
    );
    expect(() => construct.outputArn()).not.toThrow();
    expect(() => construct.setCloudWatchAlarms()).not.toThrow();
  });
});
