/**
 * Flexible tag map applied to all Layer3CDK resources.
 * Any string key-value pairs are accepted.
 * The library auto-sets `Eng:Env` from the resolved stack environment.
 */
export type ResourceTags = Record<string, string>;

/**
 * Represents the managed by options.
 */
export type ManagedBy = 'cdk' | 'terraform' | 'dashboard';
