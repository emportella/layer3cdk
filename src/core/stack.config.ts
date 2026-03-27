import { App, Environment } from 'aws-cdk-lib';
import { StackEnv, AWSRegion } from './constants';
import { stackName } from './name.conventions';
import { ResourceTags } from './tags';

/**
 * Singleton that reads CDK context values (account, region, env) and provides
 * helpers for stack naming, environment resolution, and tag enrichment.
 * Use {@link BaseStackConfig.getInstance} to obtain the instance.
 */
export class BaseStackConfig {
  private static instance: BaseStackConfig;
  private account: string;
  private stackEnv: StackEnv;
  private region: AWSRegion;

  private constructor(account: string, stackEnv: StackEnv, region: AWSRegion) {
    this.account = account;
    this.stackEnv = stackEnv;
    this.region = region;
  }

  /**
   * Instance method to get the instance of this class.
   * @param app
   * @returns BaseStackConfig
   */
  public static getInstance(app: App): BaseStackConfig {
    if (!BaseStackConfig.instance) {
      const account: string = BaseStackConfig.getAccountFromContext(app);
      const stackEnv: StackEnv = BaseStackConfig.getStackEnvFromContext(app);
      const region: AWSRegion = BaseStackConfig.getAWSRegionFromContext(app);
      BaseStackConfig.instance = new BaseStackConfig(account, stackEnv, region);
    }
    return BaseStackConfig.instance;
  }

  /**
   * Value of aws account number
   * @returns aws account number
   */
  public getAccount(): string {
    return this.account;
  }

  /**
   * Returns the value of stackEnv from context
   * @returns dev | stg | prd
   */
  public getStackEnv(): StackEnv {
    return this.stackEnv;
  }

  /**
   * Returns the value of region from context
   * @returns AWSRegion
   */
  public getRegion(): AWSRegion {
    return this.region;
  }

  private static getAccountFromContext(app: App): string {
    const account: string | undefined = app.node.tryGetContext('account');
    if (account === undefined) {
      throw new Error('No -c account=<aws account number> flag provided.');
    }
    return account;
  }

  private static getAWSRegionFromContext(app: App): AWSRegion {
    const region: AWSRegion | undefined = app.node.tryGetContext('region');
    if (region === undefined) {
      throw new Error('No -c region=<aws region> flag provided.');
    }
    return region;
  }

  private static getStackEnvFromContext(app: App): StackEnv {
    const stackEnv: StackEnv | undefined = app.node.tryGetContext('env');
    if (stackEnv === undefined) {
      throw new Error('No -c env=<dev|prd|stg> flag provided.');
    }
    return stackEnv;
  }

  /**
   * Returns the updated ResourceTags with environment and region
   * @param tags
   * @returns ResourceTags
   */
  public getUpdatedResourceTags(tags: ResourceTags): ResourceTags {
    return {
      ...tags,
      'tag:env': this.stackEnv,
    };
  }

  /**
   * Returns the environment object with account and region
   * @returns Environment
   */
  public getEnvironment(): Environment {
    return {
      account: this.account,
      region: this.region,
    };
  }

  /**
   * Returns the stack name proper environment value
   * @param name
   * @returns string
   */
  public getStackName(name: string): string {
    return stackName(this.stackEnv, name);
  }

  /**
   * Resets the singleton instance. Use only in tests.
   */
  public static resetInstance(): void {
    BaseStackConfig.instance = undefined as unknown as BaseStackConfig;
  }
}
