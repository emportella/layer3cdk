import { pascalCaseToKebabCase } from '../util';
import { StackEnv } from '../core/constants';

/**
 * IAM Role Name Conventions for Service Accounts
 * @param serviceName - kebab-case-service-name
 * @param env - dev, stg, prd
 * @returns `${serviceName}-eks-service-account-${env}`
 * @example `rptasks-eks-service-account-dev`
 */
export const serviceAccountRoleName = (
  serviceName: string,
  env: StackEnv,
): string => {
  return `${pascalCaseToKebabCase(serviceName)}-eks-service-account-${env}`;
};

/**
 * Naming Convention for Kubernetes Service Accounts
 * @param serviceName - kebab-case-service-name
 * @returns ${serviceName}-service-account
 */
export const serviceAccountName = (serviceName: string): string => {
  return `${serviceName}-service-account`;
};
