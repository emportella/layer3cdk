import { kebabToPascalCase } from '../util';
import { StackEnv, Domain } from '../core/constants';

/**
 * Provides the naming convention for Redis cluster
 * @param env - dev, stg, prd all lower cased
 * @param serviceName - names can be provided as kebab-case or PascalCase, 'shared' is the default
 * @param domain - rpj, sch, mob
 * @returns `${env}-${domain}-${serviceName || 'shared'}`
 */
export const redisClusterName = (params: {
  env: StackEnv;
  domain: Domain;
  serviceName?: string;
}): string => {
  const { env, domain, serviceName } = params;

  return `${env}-${domain}-${kebabToPascalCase(serviceName || 'shared')}`;
};

/**
 * Provides the naming convention for Redis subnet group
 * @param env - dev, stg, prd all lower cased
 * @param serviceName - names can be provided as kebab-case or PascalCase, 'shared' is the default
 * @param domain - rpj, sch, mob
 * @returns `${env}-${domain}-${serviceName || 'shared'}-subnet`
 */
export const redisSubnetGroupName = (params: {
  env: StackEnv;
  domain: Domain;
  serviceName?: string;
}): string => {
  const { env, domain, serviceName } = params;

  return `${env}-${domain}-${kebabToPascalCase(
    serviceName || 'shared',
  )}-subnet`;
};
