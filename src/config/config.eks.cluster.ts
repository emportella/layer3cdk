import { Construct } from 'constructs';
import { BaseConfig } from '../core';
import { EnvConfig } from './config.interfaces';

/**
 * Provides environment-specific EKS cluster configuration (OIDC provider ARN,
 * namespace rules) used by {@link ServiceAccountRole} for IRSA federation.
 *
 * @param scope - The construct scope.
 * @param config - The BaseConfig object.
 * @param oidcProviderArns - Per-environment OIDC provider ARNs for EKS cluster federation.
 * @param namespaceRules - Optional per-environment namespace rules. Defaults to '*' for dev and 'default' for others.
 */
export class EksClusterConfig {
  private readonly scope: Construct;
  readonly config: BaseConfig;
  private readonly oidcProviderArns: EnvConfig;
  private readonly namespaceRules: EnvConfig;

  constructor(
    scope: Construct,
    config: BaseConfig,
    oidcProviderArns: EnvConfig,
    namespaceRules?: EnvConfig,
  ) {
    this.scope = scope;
    this.config = config;
    this.oidcProviderArns = oidcProviderArns;
    this.namespaceRules = namespaceRules ?? DEFAULT_NAMESPACE_RULES;
  }
  /**
   * Get the OIDC provider ARN for the EKS cluster
   * @returns OIDC provider ARN as String
   */
  getOidcProviderArn(): string {
    return this.oidcProviderArns[this.config.stackEnv];
  }
  /**
   * Get the EKS cluster name
   * @returns eks cluster name as String
   */
  getNameSpaceRule(): string {
    return this.namespaceRules[this.config.stackEnv];
  }
}

const DEFAULT_NAMESPACE_RULES: EnvConfig = {
  dev: '*',
  perf: 'performance-test',
  preprod: 'default',
  prod: 'default',
};
