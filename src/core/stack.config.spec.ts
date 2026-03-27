import { App } from 'aws-cdk-lib';
import { BaseStackConfig } from './stack.config';
import { ResourceTags } from './tags';

describe('AppConfig', () => {
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
  });
  it('should throw an error if account is not set', () => {
    expect(() => {
      app.node.setContext('account', undefined);
      BaseStackConfig.getInstance(app);
    }).toThrow('No -c account=<aws account number> flag provided.');
  });
  it('should throw an error if env is not set', () => {
    expect(() => {
      app.node.setContext('env', undefined);
      BaseStackConfig.getInstance(app);
    }).toThrow('No -c env=<dev|prd|stg> flag provided.');
  });
  it('should throw an error if region is not set', () => {
    expect(() => {
      app.node.setContext('region', undefined);
      BaseStackConfig.getInstance(app);
    }).toThrow('No -c region=<aws region> flag provided.');
  });
  it('should return an instance', () => {
    expect(BaseStackConfig.getInstance(app)).toBeTruthy();
  });
  it('should return the same instance', () => {
    expect(BaseStackConfig.getInstance(app)).toEqual(
      BaseStackConfig.getInstance(app),
    );
  });
  it('should return the account', () => {
    expect(BaseStackConfig.getInstance(app).getAccount()).toEqual(account);
  });
  it('should return the env', () => {
    expect(BaseStackConfig.getInstance(app).getStackEnv()).toEqual(env);
  });
  it('should return the region', () => {
    expect(BaseStackConfig.getInstance(app).getRegion()).toEqual(region);
  });
  it('should return the correct StackEnv', () => {
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
  it('should return updated tags', () => {
    const tags: ResourceTags = {
      'tag:tagSchemaVersion': '0.1',
      'tag:env': 'prd',
      'tag:ownership:department': 'productDevelopment',
      'tag:ownership:orgDomain': 'infra',
      'tag:ownership:team': 'testTeam',
      'tag:tech:application': 'testApp',
      'tag:tech:repository': 'testRepo',
      'tag:tech:managedBy': 'cdk',
    };
    expect(
      BaseStackConfig.getInstance(app).getUpdatedResourceTags(tags),
    ).toEqual({
      'tag:tagSchemaVersion': '0.1',
      'tag:env': env,
      'tag:ownership:department': 'productDevelopment',
      'tag:ownership:orgDomain': 'infra',
      'tag:ownership:team': 'testTeam',
      'tag:tech:application': 'testApp',
      'tag:tech:repository': 'testRepo',
      'tag:tech:managedBy': 'cdk',
    });
  });
});
