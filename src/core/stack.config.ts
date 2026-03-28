import { App, Environment } from 'aws-cdk-lib';
import {
  StackEnv,
  AWSRegion,
  DEFAULT_ENVS,
  DEFAULT_DEPARTMENTS,
  DEFAULT_TAGS,
} from './constants';
import { BaseConfig } from './base.config';
import { ResourceTags } from './tags';
import { stackName } from './name.conventions';
import {
  Layer3Config,
  loadLayer3Config,
  resolveArraySection,
  resolveObjectSection,
} from './layer3cdk.config';

/**
 * Singleton that reads CDK context values and an optional Layer3CDK JSON config,
 * then provides helpers for stack naming, environment resolution, tag enrichment,
 * and {@link BaseConfig} creation.
 *
 * Use {@link BaseStackConfig.getInstance} to obtain the instance.
 *
 * ## CDK Context Keys
 * - `-c account=<aws account number>` (required)
 * - `-c region=<aws region>` (required)
 * - `-c env=<environment>` (required)
 * - `-c layer3cdk=<path.json | JSON string | object>` (optional)
 */
export class BaseStackConfig {
  private static instance: BaseStackConfig;

  private readonly account: string;
  private readonly stackEnv: StackEnv;
  private readonly region: AWSRegion;
  private readonly team: string | undefined;
  private readonly department: string | undefined;
  private readonly customTags: Record<string, string>;
  private readonly resolvedEnvs: string[];
  private readonly resolvedDepartments: string[];
  private readonly layer3Config: Layer3Config;

  private constructor(
    account: string,
    stackEnv: StackEnv,
    region: AWSRegion,
    layer3Config: Layer3Config,
    resolvedEnvs: string[],
    resolvedDepartments: string[],
    customTags: Record<string, string>,
  ) {
    this.account = account;
    this.stackEnv = stackEnv;
    this.region = region;
    this.layer3Config = layer3Config;
    this.team = layer3Config.team;
    this.department = layer3Config.department;
    this.resolvedEnvs = resolvedEnvs;
    this.resolvedDepartments = resolvedDepartments;
    this.customTags = customTags;
  }

  /**
   * Returns the singleton instance, creating it on first call.
   * Reads CDK context values and the optional `layer3cdk` config.
   * Always logs the resolved configuration.
   */
  public static getInstance(app: App): BaseStackConfig {
    if (!BaseStackConfig.instance) {
      const account = BaseStackConfig.getAccountFromContext(app);
      const region = BaseStackConfig.getAWSRegionFromContext(app);
      const layer3Config = BaseStackConfig.getLayer3ConfigFromContext(app);

      const resolved = resolveArraySection(DEFAULT_ENVS, layer3Config.envs);
      const resolvedEnvs = resolved.length > 0 ? resolved : ['main'];
      const resolvedDepartments = resolveArraySection(
        DEFAULT_DEPARTMENTS,
        layer3Config.departments,
      );
      const customTags = resolveObjectSection(DEFAULT_TAGS, layer3Config.tags);

      const stackEnv = BaseStackConfig.getStackEnvFromContext(
        app,
        resolvedEnvs,
      );

      BaseStackConfig.instance = new BaseStackConfig(
        account,
        stackEnv,
        region,
        layer3Config,
        resolvedEnvs,
        resolvedDepartments,
        customTags,
      );

      BaseStackConfig.instance.logConfig();
    }
    return BaseStackConfig.instance;
  }

  /**
   * Value of aws account number
   */
  public getAccount(): string {
    return this.account;
  }

  /**
   * Returns the resolved stack environment.
   */
  public getStackEnv(): StackEnv {
    return this.stackEnv;
  }

  /**
   * Returns the AWS region.
   */
  public getRegion(): AWSRegion {
    return this.region;
  }

  /**
   * Returns the team name from the Layer3CDK config.
   */
  public getTeam(): string | undefined {
    return this.team;
  }

  /**
   * Returns the department from the Layer3CDK config.
   */
  public getDepartment(): string | undefined {
    return this.department;
  }

  /**
   * Returns custom tags resolved from the Layer3CDK config.
   */
  public getCustomTags(): Record<string, string> {
    return { ...this.customTags };
  }

  /**
   * Returns the list of valid environment names (defaults + extensions or overrides).
   */
  public getResolvedEnvs(): string[] {
    return [...this.resolvedEnvs];
  }

  /**
   * Returns the list of valid department names (defaults + extensions or overrides).
   */
  public getResolvedDepartments(): string[] {
    return [...this.resolvedDepartments];
  }

  /**
   * Returns the full parsed Layer3CDK config for advanced use.
   */
  public getLayer3Config(): Layer3Config {
    return this.layer3Config;
  }

  /**
   * Returns the environment object with account and region.
   */
  public getEnvironment(): Environment {
    return {
      account: this.account,
      region: this.region,
    };
  }

  /**
   * Returns the stack name with the proper environment prefix.
   */
  public getStackName(name: string): string {
    return stackName(this.stackEnv, name);
  }

  /**
   * Returns tags with custom tags merged in and auto-set tags applied.
   * Merge order: customTags (base) → input tags (stack-specific) → auto-set tags (always win).
   * Auto-set tags: `Eng:Env` (from stackEnv), `Eng:ManagedBy` ('cdk').
   * These are always present even if tags are overridden with an empty object.
   */
  public getUpdatedResourceTags(tags: ResourceTags): ResourceTags {
    return {
      ...this.customTags,
      ...tags,
      'Eng:Env': this.stackEnv,
      'Eng:ManagedBy': 'cdk',
    };
  }

  /**
   * Factory method to create a {@link BaseConfig} with resolved values from this singleton.
   * Uses the singleton's department as fallback if not provided.
   * Merges custom tags from the Layer3CDK config with the provided tags.
   */
  public createBaseConfig(props: {
    serviceName: string;
    stackName: string;
    tags?: Record<string, string>;
    department?: string;
    description?: string;
  }): BaseConfig {
    const department = props.department ?? this.department ?? '';
    if (
      this.resolvedDepartments.length > 0 &&
      department &&
      !this.resolvedDepartments.includes(department)
    ) {
      throw new Error(
        `[Layer3CDK] Invalid department "${department}". Valid departments: [${this.resolvedDepartments.join(', ')}]`,
      );
    }

    return new BaseConfig({
      department,
      env: this.getEnvironment(),
      stackName: this.getStackName(props.stackName),
      tags: this.getUpdatedResourceTags(props.tags ?? {}),
      stackEnv: this.stackEnv,
      serviceName: props.serviceName,
      team: this.team,
      description: props.description,
    });
  }

  /**
   * Resets the singleton instance. Use only in tests.
   */
  public static resetInstance(): void {
    BaseStackConfig.instance = undefined as unknown as BaseStackConfig;
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

  private static getStackEnvFromContext(
    app: App,
    resolvedEnvs: string[],
  ): StackEnv {
    const stackEnv: StackEnv | undefined = app.node.tryGetContext('env');
    if (stackEnv === undefined) {
      throw new Error(
        `No -c env=<environment> flag provided. Valid envs: [${resolvedEnvs.join(', ')}]`,
      );
    }
    if (!resolvedEnvs.includes(stackEnv)) {
      throw new Error(
        `[Layer3CDK] Invalid env "${stackEnv}". Valid envs: [${resolvedEnvs.join(', ')}]`,
      );
    }
    return stackEnv;
  }

  private static getLayer3ConfigFromContext(app: App): Layer3Config {
    const raw = app.node.tryGetContext('layer3cdk');
    return loadLayer3Config(raw);
  }

  private logConfig(): void {
    const lines = [
      '[Layer3CDK] Resolved configuration:',
      `  account:      ${this.account}`,
      `  region:       ${this.region}`,
      `  env:          ${this.stackEnv}`,
      `  team:         ${this.team ?? '(not set)'}`,
      `  department:   ${this.department ?? '(not set)'}`,
      `  validEnvs:    [${this.resolvedEnvs.join(', ')}]`,
      `  departments:  [${this.resolvedDepartments.join(', ')}]`,
      `  tags:         ${JSON.stringify(this.customTags)}`,
    ];
    console.log(lines.join('\n'));
  }
}
