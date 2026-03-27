import { App } from 'aws-cdk-lib';
import { BaseStackConfig } from './stack.config';
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
      expect(BaseStackConfig.getInstance(app).getStackName('ab-stack')).toEqual(
        `${env}-ab-stack`,
      );
    });
  });

  describe('without layer3cdk config (backward compat)', () => {
    it('should use default envs', () => {
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getResolvedEnvs()).toEqual(['dev', 'stg', 'prd']);
    });

    it('should use default departments', () => {
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getResolvedDepartments()).toContain('rpj');
      expect(instance.getResolvedDepartments()).toContain('org');
      expect(instance.getResolvedDepartments().length).toBe(18);
    });

    it('should return undefined team and department', () => {
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getTeam()).toBeUndefined();
      expect(instance.getDepartment()).toBeUndefined();
    });

    it('should return empty custom tags', () => {
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getCustomTags()).toEqual({});
    });
  });

  describe('layer3cdk config via context object', () => {
    it('should parse config from context object', () => {
      app.node.setContext('layer3cdk', {
        team: 'platform-eng',
        department: 'infra',
      });
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getTeam()).toEqual('platform-eng');
      expect(instance.getDepartment()).toEqual('infra');
    });

    it('should parse config from JSON string', () => {
      app.node.setContext(
        'layer3cdk',
        JSON.stringify({ team: 'payments', department: 'fnt' }),
      );
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getTeam()).toEqual('payments');
      expect(instance.getDepartment()).toEqual('fnt');
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
        .mockReturnValue({ team: 'data-team', department: 'da' });
      app.node.setContext('layer3cdk', './l3-config.json');
      const instance = BaseStackConfig.getInstance(app);
      expect(spy).toHaveBeenCalledWith('./l3-config.json');
      expect(instance.getTeam()).toEqual('data-team');
      expect(instance.getDepartment()).toEqual('da');
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
        departments: { mode: 'extend', values: ['custom-dept'] },
      });
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getResolvedDepartments()).toContain('custom-dept');
      expect(instance.getResolvedDepartments()).toContain('rpj');
    });

    it('should override defaults with custom departments', () => {
      app.node.setContext('layer3cdk', {
        departments: { mode: 'override', values: ['eng', 'ops', 'data'] },
      });
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getResolvedDepartments()).toEqual(['eng', 'ops', 'data']);
    });
  });

  describe('tags config section', () => {
    it('should return empty custom tags when not configured', () => {
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getCustomTags()).toEqual({});
    });

    it('should extend with custom tags', () => {
      app.node.setContext('layer3cdk', {
        tags: {
          mode: 'extend',
          values: { 'cost-center': 'CC-123', project: 'atlas' },
        },
      });
      const instance = BaseStackConfig.getInstance(app);
      expect(instance.getCustomTags()).toEqual({
        'cost-center': 'CC-123',
        project: 'atlas',
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
        'tag:tagSchemaVersion': '0.1',
        'tag:env': 'prd',
        'tag:ownership:department': 'productDevelopment',
        'tag:ownership:team': 'testTeam',
      };
      expect(
        BaseStackConfig.getInstance(app).getUpdatedResourceTags(tags),
      ).toEqual({
        'tag:tagSchemaVersion': '0.1',
        'tag:env': env,
        'tag:ownership:department': 'productDevelopment',
        'tag:ownership:team': 'testTeam',
      });
    });

    it('should merge custom tags from layer3cdk config', () => {
      app.node.setContext('layer3cdk', {
        tags: {
          mode: 'extend',
          values: { 'cost-center': 'CC-123' },
        },
      });
      const tags: ResourceTags = { 'tag:env': 'prd', app: 'myApp' };
      const result =
        BaseStackConfig.getInstance(app).getUpdatedResourceTags(tags);
      expect(result).toEqual({
        'cost-center': 'CC-123',
        'tag:env': env,
        app: 'myApp',
      });
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
        team: 'platform-eng',
        department: 'infra',
        tags: { mode: 'extend', values: { 'cost-center': 'CC-123' } },
      });
      const instance = BaseStackConfig.getInstance(app);
      const config = instance.createBaseConfig({
        serviceName: 'my-service',
        stackName: 'my-stack',
        tags: { app: 'myApp' },
      });
      expect(config.stackEnv).toEqual(env);
      expect(config.department).toEqual('infra');
      expect(config.team).toEqual('platform-eng');
      expect(config.serviceName).toEqual('my-service');
      expect(config.stackName).toEqual('dev-my-stack');
      expect(config.env).toEqual({ account, region });
      expect(config.tags['cost-center']).toEqual('CC-123');
      expect(config.tags['app']).toEqual('myApp');
      expect(config.tags['tag:env']).toEqual(env);
    });

    it('should allow overriding department per config', () => {
      app.node.setContext('layer3cdk', { department: 'infra' });
      const instance = BaseStackConfig.getInstance(app);
      const config = instance.createBaseConfig({
        serviceName: 'svc',
        stackName: 'stk',
        department: 'rpj',
      });
      expect(config.department).toEqual('rpj');
    });

    it('should fallback to singleton department', () => {
      app.node.setContext('layer3cdk', { department: 'infra' });
      const instance = BaseStackConfig.getInstance(app);
      const config = instance.createBaseConfig({
        serviceName: 'svc',
        stackName: 'stk',
      });
      expect(config.department).toEqual('infra');
    });

    it('should throw on invalid department when departments are configured', () => {
      app.node.setContext('layer3cdk', {
        departments: { mode: 'override', values: ['eng', 'ops'] },
      });
      const instance = BaseStackConfig.getInstance(app);
      expect(() =>
        instance.createBaseConfig({
          serviceName: 'svc',
          stackName: 'stk',
          department: 'invalid',
        }),
      ).toThrow(
        '[Layer3CDK] Invalid department "invalid". Valid departments: [eng, ops]',
      );
    });
  });

  describe('logging', () => {
    it('should log resolved configuration on init', () => {
      app.node.setContext('layer3cdk', {
        team: 'test-team',
        department: 'rpj',
      });
      BaseStackConfig.getInstance(app);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[Layer3CDK] Resolved configuration:'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('test-team'),
      );
    });
  });

  describe('getLayer3Config', () => {
    it('should return the full parsed config', () => {
      const configObj = {
        team: 'my-team',
        department: 'my-dept',
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
