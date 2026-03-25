import { BaseConfig } from './base.config';
import { StackEnv } from './constants';

/**
 * Represents a type for environment properties.
 * @template T - The type of environment properties.
 */
type EnvProps<T> = {
  [key in StackEnv]?: T;
};

/**
 * Environment-keyed configuration with a required `default` fallback.
 * Only define keys for environments that differ from the default.
 *
 * @example
 * ```typescript
 * const dynamoConfig: BaseEnvProps<DynamoConfig> = {
 *   default: { billing: onDemand, alarmThreshold: 20 },
 *   prod:    { billing: provisioned, alarmThreshold: 40 },
 * };
 * ```
 */
export type BaseEnvProps<T> = EnvProps<T> & { default: T };

/**
 * Deep merges two objects. Arrays and non-plain objects are replaced, not merged.
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceVal = source[key];
    const targetVal = result[key];
    if (
      sourceVal !== undefined &&
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      typeof targetVal === 'object' &&
      targetVal !== null &&
      !Array.isArray(targetVal) &&
      Object.getPrototypeOf(sourceVal) === Object.prototype
    ) {
      result[key] = deepMerge(targetVal, sourceVal as Partial<T[keyof T]>);
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal as T[keyof T];
    }
  }
  return result;
}

/**
 * Resolves environment-specific props from a BaseEnvProps object.
 * Returns the env-specific value if present, otherwise the default.
 *
 * @example
 * ```typescript
 * const props = resolveEnvProps(envProps, config);
 * ```
 */
export function resolveEnvProps<T>(
  envProps: BaseEnvProps<T>,
  config: BaseConfig,
): T {
  return envProps[config.stackEnv] ?? envProps.default;
}

/**
 * Resolves environment-specific props, then deep-merges optional overrides on top.
 *
 * @example
 * ```typescript
 * const props = resolveWithOverrides(baseEnvProps, config, customProps);
 * ```
 */
export function resolveWithOverrides<T extends object>(
  envProps: BaseEnvProps<T>,
  config: BaseConfig,
  overrides?: Partial<T>,
): T {
  const resolved = resolveEnvProps(envProps, config);
  return overrides ? deepMerge(resolved, overrides) : resolved;
}

/**
 * Resolves two BaseEnvProps layers: a base layer and an optional override layer.
 * Both are resolved for the current environment, then deep-merged.
 *
 * @example
 * ```typescript
 * // Library defaults + user overrides, both env-aware
 * const props = resolveAndMergeEnvProps(LIBRARY_DEFAULTS, config, userOverrides);
 * ```
 */
export function resolveAndMergeEnvProps<T extends object>(
  baseEnvProps: BaseEnvProps<T>,
  config: BaseConfig,
  overrideEnvProps?: BaseEnvProps<T>,
): T {
  const base = resolveEnvProps(baseEnvProps, config);
  if (!overrideEnvProps) return base;
  const overrides = resolveEnvProps(overrideEnvProps, config);
  return deepMerge(base, overrides);
}

/**
 * Executes the builder function only if the current environment is in the provided list.
 *
 * @example
 * ```typescript
 * const policy = envDependentBuild(config, ['dev', 'prod'], () => {
 *   return new PolicyStatement({ actions: ['s3:GetObject'], resources: ['*'] });
 * });
 * ```
 */
export function envDependentBuild<T>(
  config: BaseConfig,
  envs: StackEnv[],
  builder: () => T,
): T | undefined {
  return envs.includes(config.stackEnv) ? builder() : undefined;
}
