import { testAbConfig } from '../test/common.test.const';
import { ABConfig } from './ab.config';
import { ABEnvironment } from './ab.constant';
import {
  ConstructProps,
  ABEnvProps,
  abEnvDependentBuild,
} from './ab.construct.env.props';

describe('ConstructProps', () => {
  type Props = { test: string; test2: string };
  let config: ABConfig;
  let envProps: ABEnvProps<Props>;
  let constEnvProps: ConstructProps<Props>;

  beforeEach(() => {
    config = testAbConfig;

    envProps = {
      default: { test: 'default test', test2: 'default test2' },
      dev: { test: 'dev test', test2: 'dev test2' },
      prod: { test: 'prod test', test2: 'prod test2' },
    };

    constEnvProps = ConstructProps.of(envProps, config);
  });

  it('should check if the specified environment is present in the environment properties', () => {
    expect(constEnvProps.isEnvPresent('dev')).toBe(true);
    expect(constEnvProps.isEnvPresent('prod')).toBe(true);
    expect(constEnvProps.isEnvPresent('preprod')).toBe(false);
  });

  it('should get the environment properties for the specified environment', () => {
    expect(constEnvProps.getEnvProps('dev')).toStrictEqual({
      test: 'dev test',
      test2: 'dev test2',
    });
    expect(constEnvProps.getEnvProps('prod')).toStrictEqual({
      test: 'prod test',
      test2: 'prod test2',
    });
    expect(constEnvProps.getEnvProps('preprod')).toStrictEqual({
      test: 'default test',
      test2: 'default test2',
    });
  });

  it('should get the environment properties for the current AB environment', () => {
    expect(constEnvProps.getProps()).toStrictEqual({
      test: 'dev test',
      test2: 'dev test2',
    });
  });

  it('should merge the specified environment properties with the environment properties for the current AB environment', () => {
    const mergedProps = constEnvProps.getCustomMergedProps({
      test: 'custom test',
      test2: 'custom test2',
    });
    expect(mergedProps).toStrictEqual({
      test: 'custom test',
      test2: 'custom test2',
    });
  });

  it('should merge the specified environment properties with the environment properties from ABEnvProps', () => {
    const abEnvProps: ABEnvProps<Props> = {
      default: { test: 'default custom test', test2: 'default custom test2' },
      dev: { test: 'dev custom test', test2: 'dev custom test2' },
      prod: { test: 'prod custom test', test2: 'prod custom test2' },
    };

    const mergedProps = constEnvProps.getMergedPropsFromABEnvProps(abEnvProps);
    expect(mergedProps).toEqual({
      test: 'dev custom test',
      test2: 'dev custom test2',
    });
  });
  it('should apply the provided function to modify the environment properties', () => {
    const applyFunction = (envProps: ABEnvProps<Props>) => ({
      default: {
        test: 'modified default test',
        test2: 'modified default test2',
      },
      dev: { test: 'modified dev test', test2: 'modified dev test2' },
      prod: envProps.prod,
    });

    const modifiedProps = constEnvProps.apply(applyFunction);

    expect(modifiedProps.getEnvProps('dev')).toStrictEqual({
      test: 'modified dev test',
      test2: 'modified dev test2',
    });
    expect(modifiedProps.getEnvProps('prod')).toStrictEqual({
      test: 'prod test',
      test2: 'prod test2',
    });
  });
});

describe('abEnvDependentBuild', () => {
  let config: ABConfig;
  let abEnvs: ABEnvironment[];
  let builder: jest.Mock<any, any>;

  beforeEach(() => {
    config = new ABConfig(
      'rpj',
      { account: '123456789012', region: 'us-east-1' },
      'rpj-test-stack',
      {
        'ab:tagSchemaVersion': '0.1',
        'ab:env': 'dev',
        'ab:ownership:department': 'productDevelopment',
        'ab:ownership:orgDomain': 'infra',
        'ab:ownership:team': 'testTeam',
        'ab:tech:application': 'testApp',
        'ab:tech:repository': 'testRepo',
        'ab:tech:managedBy': 'cdk',
      },
      'dev',
      'rpj-test-app',
      'My description',
    );

    abEnvs = ['dev', 'prod'];

    builder = jest.fn();
  });

  it('should return the result of the builder function if the current AB environment is included in the specified AB environments', () => {
    const result = 'test result';
    builder.mockReturnValue(result);

    const output = abEnvDependentBuild(config, abEnvs, builder);

    expect(output).toBe(result);
    expect(builder).toHaveBeenCalled();
  });

  it('should return undefined if the current AB environment is not included in the specified AB environments', () => {
    const output = abEnvDependentBuild(config, ['preprod', 'prod'], builder);

    expect(output).toBeUndefined();
    expect(builder).not.toHaveBeenCalled();
  });
});
