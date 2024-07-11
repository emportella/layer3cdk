import { App, Environment } from 'aws-cdk-lib';
import { ABEnvironment, AWSRegion } from './ab.constant';
import { generateStackName } from './ab.name.conventions';
import { ABTags } from './ab.tags';

/**
 * Class used to fetch Pipeline Variables
 * It is Singleton class. Use getInstance() method to get the instance of this class.
 */
export class ABStackConfig {
  private static instance: ABStackConfig;
  private account: string;
  private abEnv: ABEnvironment;
  private region: AWSRegion;

  private constructor(
    account: string,
    abEnv: ABEnvironment,
    region: AWSRegion,
  ) {
    this.account = account;
    this.abEnv = abEnv;
    this.region = region;
  }

  /**
   * Instance method to get the instance of this class.
   * @param app
   * @returns ABStackConfig
   */
  public static getInstance(app: App): ABStackConfig {
    if (!ABStackConfig.instance) {
      const account: string = ABStackConfig.getAccountFromContext(app);
      const abEnv: ABEnvironment =
        ABStackConfig.getABEnvironmentFromContext(app);
      const region: AWSRegion = ABStackConfig.getAWSRegionFromContext(app);
      ABStackConfig.instance = new ABStackConfig(account, abEnv, region);
    }
    return ABStackConfig.instance;
  }

  /**
   * Value of aws account number
   * @returns aws account number
   */
  public getAccount(): string {
    return this.account;
  }

  /**
   * Returns the value of abEnv from context
   * @returns dev | perf | preprod | prod
   */
  public getABEnv(): ABEnvironment {
    return this.abEnv;
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

  private static getABEnvironmentFromContext(app: App): ABEnvironment {
    const abEnv: ABEnvironment | undefined = app.node.tryGetContext('env');
    if (abEnv === undefined) {
      throw new Error('No -c env=<dev|prod|perf|preprod> flag provided.');
    }
    return abEnv;
  }

  /**
   * Returns the updated ABTags with environment and region
   * @param tags
   * @returns ABTags
   */
  public getUpdatedABTags(tags: ABTags): ABTags {
    return {
      ...tags,
      'ab:env': this.abEnv,
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
    return generateStackName(this.abEnv, name);
  }
}
