import { ABConfig } from './ab.config';
import { ABEnvironment } from './ab.constant';
/**
 * Represents a type for environment properties.
 * @template T - The type of environment properties.
 */
type EnvProps<T> = {
  [key in ABEnvironment]?: T;
};

/**
 * Represents the environment properties for ABEnvProps.
 * @template T - The type of the environment properties.
 */
export type ABEnvProps<T> = EnvProps<T> & { default: T };

/**
 * Represents a class that holds environment properties and configuration for AB constructs. That should be used internaly by the AB constructs.
 * @template T - The type of environment properties.
 */
export class ConstructProps<T> {
  protected readonly envProps: ABEnvProps<T>;
  protected readonly config: ABConfig;
  constructor(envProps: ABEnvProps<T>, config: ABConfig) {
    this.envProps = envProps;
    this.config = config;
  }

  /**
   * Pointed Functor, creates a new instance of ConstructProps.
   * @template U - The type of environment properties.
   * @param value - The environment properties.
   * @param config - The configuration.
   * @returns A new instance of ConstructProps.
   */
  public static of<U>(
    value: ABEnvProps<U>,
    config: ABConfig,
  ): ConstructProps<U> {
    return new ConstructProps<U>(value, config);
  }

  /**
   * Checks if the specified environment is present in the environment properties. If false, means that the Constructor has no environment properties for the specified environment and a default environment properties will be used incase it is present.
   * @param ABEnv - The AB environment to check.
   * @returns True if the specified environment is present, false otherwise.
   */
  public isEnvPresent(abEnv: ABEnvironment): boolean {
    return this.envProps[abEnv] !== undefined;
  }

  /**
   * Main method to get the environment properties for the current AB environment.
   * @returns The environment properties for the current AB environment or the default environment properties if the current AB environment is not present.
   */
  public getProps(): T {
    return this.getEnvProps(this.config.abEnv);
  }

  /**
   * Gets the environment properties for the specified environment. If the environment properties are not present, it will return undefined.
   * @param ABEnv - The AB environment to get.
   * @returns The environment properties for the specified environment.
   */
  public getEnvProps(abEnv: ABEnvironment): T {
    return this.isEnvPresent(abEnv)
      ? (this.envProps[abEnv] as T)
      : this.envProps.default;
  }

  /**
   * Gets the environment properties for the specified environment. If the environment properties are not present, it will return undefined.
   * @param ABEnv - The AB environment to get.
   * @returns The environment properties for the specified environment.
   */
  private getEnvPropsFromABEnv<T>(props: ABEnvProps<T>): T {
    return props[this.config.abEnv] ?? props.default;
  }

  /**
   * Returns a merged object of the default props and the provided props.
   * @param props - The optional props to merge with the default props.
   * @returns The merged props object.
   */
  public getCustomMergedProps(props: T | undefined): T {
    return { ...this.getProps(), ...props };
  }

  /**
   * Merges the specified environment properties with the environment properties for the current AB environment.
   * @param abEnvProps - The environment properties to merge.
   * @returns The merged environment properties.
   */
  public getMergedPropsFromABEnvProps(abEnvProps: ABEnvProps<T>): T {
    return { ...this.getProps(), ...this.getEnvPropsFromABEnv(abEnvProps) };
  }

  /**
   * Retrieves the merged props from the provided ABEnvProps object if it exists,
   * otherwise returns the getProps().
   *
   * @param abEnvProps - The ABEnvProps object to retrieve the merged props from.
   * @returns The merged props from the ABEnvProps object if it exists, otherwise the default props.
   */
  public getMergedPropsFromIfABEnvProps(
    abEnvProps: ABEnvProps<T> | undefined,
  ): T {
    return abEnvProps
      ? this.getMergedPropsFromABEnvProps(abEnvProps)
      : this.getProps();
  }

  /**
   * Applies the provided function to modify the resource's ABEnvProps<T> by merging the function return to the internal instance of ABEnvProps<T>.
   * @param apply - The function that modifies the environment properties.
   * @returns a new instance ConstructProps<T> with a merged ABEnvProps<T>.
   */
  public apply(
    apply: (envProps: ABEnvProps<T>) => ABEnvProps<T>,
  ): ConstructProps<T> {
    return ConstructProps.of(
      { ...this.envProps, ...apply(this.envProps) },
      this.config,
    );
  }
}

/**
 * Executes the builder function if the current AB environment is included in the provided AB environments.
 *
 * @param config - The AB configuration object.
 * @param abEnvs - The array of AB environments to check against.
 * @param builder - The builder function to execute.
 * @returns The result of the builder function if the current AB environment is included in the provided AB environments, otherwise undefined.
 */
export function abEnvDependentBuild<T>(
  config: ABConfig,
  abEnvs: ABEnvironment[],
  builder: () => T,
): T | undefined {
  return abEnvs.includes(config.abEnv) ? builder() : undefined;
}
