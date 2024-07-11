import { App } from 'aws-cdk-lib';
import { ABStackConfig } from './stack.config';
import { ABTags } from './ab.tags';

describe('AppConfig', () => {
  let app: App;
  const account = '123456789012';
  const abEnv = 'dev';
  const region = 'us-east-1';
  beforeEach(() => {
    app = new App();
    app.node.setContext('account', account);
    app.node.setContext('env', abEnv);
    app.node.setContext('region', region);
  });
  it('should throw an error if account is not set', () => {
    expect(() => {
      app.node.setContext('account', undefined);
      ABStackConfig.getInstance(app);
    }).toThrowError('No -c account=<aws account number> flag provided.');
  });
  it('should throw an error if env is not set', () => {
    expect(() => {
      app.node.setContext('env', undefined);
      ABStackConfig.getInstance(app);
    }).toThrowError('No -c env=<dev|prod|perf|preprod> flag provided.');
  });
  it('should throw an error if region is not set', () => {
    expect(() => {
      app.node.setContext('region', undefined);
      ABStackConfig.getInstance(app);
    }).toThrowError('No -c region=<aws region> flag provided.');
  });
  it('should return an instance', () => {
    expect(ABStackConfig.getInstance(app)).toBeTruthy();
  });
  it('should return the same instance', () => {
    expect(ABStackConfig.getInstance(app)).toEqual(
      ABStackConfig.getInstance(app),
    );
  });
  it('should return the account', () => {
    expect(ABStackConfig.getInstance(app).getAccount()).toEqual(account);
  });
  it('should return the abEnv', () => {
    expect(ABStackConfig.getInstance(app).getABEnv()).toEqual(abEnv);
  });
  it('should return the region', () => {
    expect(ABStackConfig.getInstance(app).getRegion()).toEqual(region);
  });
  it('should return the correct Environment', () => {
    expect(ABStackConfig.getInstance(app).getEnvironment()).toEqual({
      account,
      region,
    });
  });
  it('should return the correct StackName', () => {
    expect(ABStackConfig.getInstance(app).getStackName('ab-stack')).toEqual(
      `${abEnv}-ab-stack`,
    );
  });
  it('should return updated tags', () => {
    const tags: ABTags = {
      'ab:tagSchemaVersion': '0.1',
      'ab:env': 'prod',
      'ab:ownership:department': 'productDevelopment',
      'ab:ownership:orgDomain': 'infra',
      'ab:ownership:team': 'testTeam',
      'ab:tech:application': 'testApp',
      'ab:tech:repository': 'testRepo',
      'ab:tech:managedBy': 'cdk',
    };
    expect(ABStackConfig.getInstance(app).getUpdatedABTags(tags)).toEqual({
      'ab:tagSchemaVersion': '0.1',
      'ab:env': abEnv,
      'ab:ownership:department': 'productDevelopment',
      'ab:ownership:orgDomain': 'infra',
      'ab:ownership:team': 'testTeam',
      'ab:tech:application': 'testApp',
      'ab:tech:repository': 'testRepo',
      'ab:tech:managedBy': 'cdk',
    });
  });
});
