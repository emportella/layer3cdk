import { testconfig } from '../test/common.test.const';
import { BaseConfig } from './base.config';
import { StackEnv } from './constants';
import {
  BaseEnvProps,
  resolveEnvProps,
  resolveWithOverrides,
  resolveAndMergeEnvProps,
  envDependentBuild,
} from './base.construct.env.props';

type Props = { test: string; test2: string };

const config: BaseConfig = testconfig;

const envProps: BaseEnvProps<Props> = {
  default: { test: 'default test', test2: 'default test2' },
  dev: { test: 'dev test', test2: 'dev test2' },
  prd: { test: 'prd test', test2: 'prd test2' },
};

describe('resolveEnvProps', () => {
  it('should return env-specific props when present', () => {
    expect(resolveEnvProps(envProps, config)).toStrictEqual({
      test: 'dev test',
      test2: 'dev test2',
    });
  });

  it('should fall back to default when env not present', () => {
    const stgConfig = new BaseConfig({
      department: 'pltf',
      env: { account: '123456789012', region: 'us-east-1' },
      stackName: 'pltf-banana-stack',
      tags: testconfig.tags,
      stackEnv: 'stg',
      serviceName: 'banana-launcher',
    });
    expect(resolveEnvProps(envProps, stgConfig)).toStrictEqual({
      test: 'default test',
      test2: 'default test2',
    });
  });
});

describe('resolveWithOverrides', () => {
  it('should return resolved props when no overrides', () => {
    expect(resolveWithOverrides(envProps, config)).toStrictEqual({
      test: 'dev test',
      test2: 'dev test2',
    });
  });

  it('should deep merge overrides on top of resolved props', () => {
    expect(
      resolveWithOverrides(envProps, config, { test: 'custom' }),
    ).toStrictEqual({
      test: 'custom',
      test2: 'dev test2',
    });
  });

  it('should deep merge nested objects', () => {
    type Nested = { outer: { inner1: string; inner2: string } };
    const nested: BaseEnvProps<Nested> = {
      default: { outer: { inner1: 'a', inner2: 'b' } },
    };
    const result = resolveWithOverrides(nested, config, {
      outer: { inner1: 'overridden' },
    } as Partial<Nested>);
    expect(result).toStrictEqual({
      outer: { inner1: 'overridden', inner2: 'b' },
    });
  });
});

describe('resolveAndMergeEnvProps', () => {
  it('should return base when no overrides provided', () => {
    expect(resolveAndMergeEnvProps(envProps, config)).toStrictEqual({
      test: 'dev test',
      test2: 'dev test2',
    });
  });

  it('should merge override env props on top of base', () => {
    const overrides: BaseEnvProps<Props> = {
      default: { test: 'override default', test2: 'override default2' },
      dev: { test: 'override dev', test2: 'override dev2' },
    };
    expect(resolveAndMergeEnvProps(envProps, config, overrides)).toStrictEqual({
      test: 'override dev',
      test2: 'override dev2',
    });
  });

  it('should use override default when override env not present', () => {
    const overrides: BaseEnvProps<Props> = {
      default: { test: 'override default', test2: 'override default2' },
    };
    expect(resolveAndMergeEnvProps(envProps, config, overrides)).toStrictEqual({
      test: 'override default',
      test2: 'override default2',
    });
  });
});

describe('envDependentBuild', () => {
  let envs: StackEnv[];
  let builder: jest.Mock;

  beforeEach(() => {
    envs = ['dev', 'prd'];
    builder = jest.fn();
  });

  it('should execute builder when current env is included', () => {
    builder.mockReturnValue('result');
    expect(envDependentBuild(config, envs, builder)).toBe('result');
    expect(builder).toHaveBeenCalled();
  });

  it('should return undefined when current env is not included', () => {
    expect(envDependentBuild(config, ['stg', 'prd'], builder)).toBeUndefined();
    expect(builder).not.toHaveBeenCalled();
  });
});
