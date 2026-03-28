import { App } from 'aws-cdk-lib';
import { BaseStackConfig } from './stack.config';
import { DEFAULT_TAGS } from './constants';
import { ResourceTags } from './tags';
import * as layer3cdkConfig from './layer3cdk.config';

describe('BaseStackConfig', () => {
  let app: App;
  const account = '123456789012';
  const env = 'dev';
  const region = 'us-east-1';

  beforeEach(() => {
    BaseStackConfig.resetInstance();
    app = new App();
    app.node.setContext('account', account);
    app.node.setContext('env', env);
    app.node.setContext('region', region);
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('context validation', () => {
    it('should throw an error if account is not set', () => {
      app.node.setContext('account', undefined);
      expect(() => BaseStackConfig.getInstance(app)).toThrow(
        'No -c account=<aws account number> flag provided.',
      );
    });

    it('should throw an error if env is not set', () => {
      app.node.setContext('env', undefined);
      expect(() => BaseStackConfig.getInstance(app)).toThrow(
        'No -c env=<environment> flag provided. Valid envs: [dev, stg, prd]',
      );
    });

    it('should throw an error if region is not set', () => {
      app.node.setContext('region', undefined);
      expect(() => BaseStackConfig.getInstance(app)).toThrow(
        'No -c region=<aws region> flag provided.',
      );
    });

    it('should throw if env is not in resolved envs', () => {
      app.node.setContext('env', 'invalid-env');
      expect(() => BaseStackConfig.getInstance(app)).toThrow(
        '[Layer3CDK] Invalid env "invalid-env". Valid envs: [dev, stg, prd]',
      );
    });
  });

  describe('singleton behavior', () => {
    it('should return an instance', () => {
      expect(BaseStackConfig.getInstance(app)).toBeTruthy();
    });

    it('should return the same instance', () => {
      expect(BaseStackConfig.getInstance(app)).toEqual(
        BaseStackConfig.getInstance(app),
      );
    });
  });

  describe('basic getters', () => {
    it('should return the account', () => {
      expect(BaseStackConfig.getInstance(app).getAccount()).toEqual(account);
    });

    it('should return the env', () => {
      expect(BaseStackConfig.getInstance(app).getStackEnv()).toEqual(env);
    });

    it('should return the region', () => {
      expect(BaseStackConfig.getInstance(app).getRegion()).toEqual(region);
    });

    it('should return the correct Environment', () => {
      expect(BaseStackConfig.getInstance(app).getEnvironment()).toEqual({
        account,
        region,
      });
    });

    it('should return the correct StackName', () => {
      expect(
        BaseStackConfig.getInstance(app).getStackName('nacho-stack'),
      ).toEqual(`${env}-NachoStack`);
    });
  });

  describe('without layer3cdk config (backward compat)', () => {
    it('should use default envs', () => {
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getResolvedEnvs()).toEqual(['dev', 'stg', 'prd']);
    });

    it('should use default departments', () => {
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getResolvedDepartments()).toContain('pltf');
      expect(instance.getResolvedDepartments()).toContain('ops');
      expect(instance.getResolvedDepartments().length).toBe(7);
    });

    it('should return undefined team and department', () => {
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getTeam()).toBeUndefined();
      expect(instance.getDepartment()).toBeUndefined();
    });

    it('should return default tags when no custom tags configured', () => {
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getCustomTags()).toEqual(DEFAULT_TAGS);
    });
  });

  describe('layer3cdk config via context object', () => {
    it('should parse config from context object', () => {
      app.node.setContext('layer3cdk', {
        team: 'Layer3',
        department: 'ops',
      });
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getTeam()).toEqual('Layer3');
      expect(instance.getDepartment()).toEqual('ops');
    });

    it('should parse config from JSON string', () => {
      app.node.setContext(
        'layer3cdk',
        JSON.stringify({ team: 'Layer3', department: 'fe' }),
      );
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getTeam()).toEqual('Layer3');
      expect(instance.getDepartment()).toEqual('fe');
    });

    it('should throw on invalid JSON string', () => {
      app.node.setContext('layer3cdk', '{invalid json}');
      expect(() => BaseStackConfig.getInstance(app)).toThrow(
        '[Layer3CDK] Invalid JSON in -c layer3cdk context value.',
      );
    });

    it('should load config from JSON file path', () => {
      const spy = jest
        .spyOn(layer3cdkConfig, 'loadLayer3Config')
        .mockReturnValue({ team: 'Layer3', department: 'qa' });
      app.node.setContext('layer3cdk', './l3-config.json');
      const instance = BaseStackConfig.getInstance(app);
      expect(spy).toHaveBeenCalledWith('./l3-config.json');
      expect(instance.getTeam()).toEqual('Layer3');
      expect(instance.getDepartment()).toEqual('qa');
      spy.mockRestore();
    });
  });

  describe('envs config section', () => {
    it('should use defaults when envs not specified', () => {
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getResolvedEnvs()).toEqual(['dev', 'stg', 'prd']);
    });

    it('should extend defaults with additional envs', () => {
      app.node.setContext('layer3cdk', {
        envs: { mode: 'extend', values: ['qa', 'perf'] },
      });
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getResolvedEnvs()).toEqual([
        'dev',
        'stg',
        'prd',
        'qa',
        'perf',
      ]);
    });

    it('should override defaults with custom envs', () => {
      app.node.setContext('layer3cdk', {
        envs: {
          mode: 'override',
          values: ['development', 'staging', 'production'],
        },
      });
      app.node.setContext('env', 'development');
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getResolvedEnvs()).toEqual([
        'development',
        'staging',
        'production',
      ]);
      expect(instance.getStackEnv()).toEqual('development');
    });

    it('should validate env against extended envs', () => {
      app.node.setContext('layer3cdk', {
        envs: { mode: 'extend', values: ['qa'] },
      });
      app.node.setContext('env', 'qa');
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getStackEnv()).toEqual('qa');
    });

    it('should reject env not in overridden list', () => {
      app.node.setContext('layer3cdk', {
        envs: { mode: 'override', values: ['a', 'b'] },
      });
      expect(() => BaseStackConfig.getInstance(app)).toThrow(
        '[Layer3CDK] Invalid env "dev". Valid envs: [a, b]',
      );
    });

    it('should fallback to ["main"] when override has empty values', () => {
      app.node.setContext('layer3cdk', {
        envs: { mode: 'override', values: [] },
      });
      app.node.setContext('env', 'main');
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getResolvedEnvs()).toEqual(['main']);
      expect(instance.getStackEnv()).toEqual('main');
    });

    it('should deduplicate when extending', () => {
      app.node.setContext('layer3cdk', {
        envs: { mode: 'extend', values: ['dev', 'qa'] },
      });
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getResolvedEnvs()).toEqual(['dev', 'stg', 'prd', 'qa']);
    });
  });

  describe('departments config section', () => {
    it('should extend defaults with additional departments', () => {
      app.node.setContext('layer3cdk', {
        departments: { mode: 'extend', values: ['taco-dept'] },
      });
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getResolvedDepartments()).toContain('taco-dept');
      expect(instance.getResolvedDepartments()).toContain('ops');
    });

    it('should override defaults with custom departments', () => {
      app.node.setContext('layer3cdk', {
        departments: { mode: 'override', values: ['taco', 'nacho', 'waffle'] },
      });
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getResolvedDepartments()).toEqual([
        'taco',
        'nacho',
        'waffle',
      ]);
    });
  });

  describe('tags config section', () => {
    it('should return default tags when not configured', () => {
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getCustomTags()).toEqual(DEFAULT_TAGS);
    });

    it('should extend defaults with custom tags', () => {
      app.node.setContext('layer3cdk', {
        tags: {
          mode: 'extend',
          values: { 'cost-center': 'CC-TACO', project: 'banana-cannon' },
        },
      });
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getCustomTags()).toEqual({
        ...DEFAULT_TAGS,
        'cost-center': 'CC-TACO',
        project: 'banana-cannon',
      });
    });

    it('should override tags entirely', () => {
      app.node.setContext('layer3cdk', {
        tags: { mode: 'override', values: { only: 'this' } },
      });
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getCustomTags()).toEqual({ only: 'this' });
    });
  });

  describe('getUpdatedResourceTags', () => {
    it('should return updated tags with env overwritten', () => {
      const tags: ResourceTags = {
        TagSchemaVersion: '0.1',
        'Eng:Env': 'prd',
        'Ownership:Department': 'pltf',
        'Ownership:Team': 'Layer3',
      };
      const result =
        BaseStackConfig.getInstance(app).getUpdatedResourceTags(tags);
      expect(result['TagSchemaVersion']).toEqual('0.1');
      expect(result['Eng:Env']).toEqual(env);
      expect(result['Ownership:Department']).toEqual('pltf');
      expect(result['Ownership:Team']).toEqual('Layer3');
    });

    it('should merge custom tags from layer3cdk config', () => {
      app.node.setContext('layer3cdk', {
        tags: {
          mode: 'extend',
          values: { 'cost-center': 'CC-TACO' },
        },
      });
      const tags: ResourceTags = { 'Eng:Env': 'prd', app: 'rocketToaster' };
      const result =
        BaseStackConfig.getInstance(app).getUpdatedResourceTags(tags);
      expect(result['cost-center']).toEqual('CC-TACO');
      expect(result['Eng:Env']).toEqual(env);
      expect(result['app']).toEqual('rocketToaster');
    });

    it('should let input tags override custom tags', () => {
      app.node.setContext('layer3cdk', {
        tags: { mode: 'extend', values: { shared: 'base' } },
      });
      const tags: ResourceTags = { shared: 'override' };
      const result =
        BaseStackConfig.getInstance(app).getUpdatedResourceTags(tags);
      expect(result['shared']).toEqual('override');
    });
  });

  describe('createBaseConfig', () => {
    it('should create a BaseConfig with resolved values', () => {
      app.node.setContext('layer3cdk', {
        team: 'Layer3',
        department: 'pltf',
        tags: { mode: 'extend', values: { 'cost-center': 'CC-TACO' } },
      });
      const instance = BaseStackConfig.getInstance(app);
      const config = instance.createBaseConfig({
        serviceName: 'rocket-toaster',
        stackName: 'waffle-stack',
        tags: { app: 'rocketToaster' },
      });
      expect(config.stackEnv).toEqual(env);
      expect(config.department).toEqual('pltf');
      expect(config.team).toEqual('Layer3');
      expect(config.serviceName).toEqual('rocket-toaster');
      expect(config.stackName).toEqual('dev-WaffleStack');
      expect(config.env).toEqual({ account, region });
      expect(config.tags['cost-center']).toEqual('CC-TACO');
      expect(config.tags['app']).toEqual('rocketToaster');
      expect(config.tags['Eng:Env']).toEqual(env);
    });

    it('should allow overriding department per config', () => {
      app.node.setContext('layer3cdk', { department: 'pltf' });
      const instance = BaseStackConfig.getInstance(app);
      const config = instance.createBaseConfig({
        serviceName: 'llama-api',
        stackName: 'llama-stack',
        department: 'ops',
      });
      expect(config.department).toEqual('ops');
    });

    it('should fallback to singleton department', () => {
      app.node.setContext('layer3cdk', { department: 'pltf' });
      const instance = BaseStackConfig.getInstance(app);
      const config = instance.createBaseConfig({
        serviceName: 'llama-api',
        stackName: 'llama-stack',
      });
      expect(config.department).toEqual('pltf');
    });

    it('should throw on invalid department when departments are configured', () => {
      app.node.setContext('layer3cdk', {
        departments: { mode: 'override', values: ['taco', 'nacho'] },
      });
      const instance = BaseStackConfig.getInstance(app);
      expect(() =>
        instance.createBaseConfig({
          serviceName: 'llama-api',
          stackName: 'llama-stack',
          department: 'pineapple',
        }),
      ).toThrow(
        '[Layer3CDK] Invalid department "pineapple". Valid departments: [taco, nacho]',
      );
    });
  });

  describe('logging', () => {
    it('should log resolved configuration on init', () => {
      app.node.setContext('layer3cdk', {
        team: 'Layer3',
        department: 'pltf',
      });
      BaseStackConfig.getInstance(app);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[Layer3CDK] Resolved configuration:'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Layer3'),
      );
    });
  });

  describe('getLayer3Config', () => {
    it('should return the full parsed config', () => {
      const configObj = {
        team: 'Layer3',
        department: 'pancake',
        envs: { mode: 'extend' as const, values: ['qa'] },
      };
      app.node.setContext('layer3cdk', configObj);
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getLayer3Config()).toEqual(configObj);
    });

    it('should return empty config when not provided', () => {
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getLayer3Config()).toEqual({});
    });
  });
});
