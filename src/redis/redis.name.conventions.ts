import { kebabToPascalCase } from '../util';
/**
 * Provides the naming convention for Redis cluster
 * @param env - environment
 * @param serviceName - names can be provided as kebab-case or PascalCase, 'shared' is the default
 * @param department - business unit
 * @returns `${env}-${department}-${serviceName || 'shared'}`
 */
export const redisClusterName = (params: {
  env: string;
  department: string;
  serviceName?: string;
}): string => {
  const { env, department, serviceName } = params;

  return `${env}-${department}-${kebabToPascalCase(serviceName || 'shared')}`;
};

/**
 * Provides the naming convention for Redis subnet group
 * @param env - environment
 * @param serviceName - names can be provided as kebab-case or PascalCase, 'shared' is the default
 * @param department - business unit
 * @returns `${env}-${department}-${serviceName || 'shared'}-subnet`
 */
export const redisSubnetGroupName = (params: {
  env: string;
  department: string;
  serviceName?: string;
}): string => {
  const { env, department, serviceName } = params;

  return `${env}-${department}-${kebabToPascalCase(
    serviceName || 'shared',
  )}-subnet`;
};
