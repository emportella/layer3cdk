import { pascalCaseToKebabCase, trimDashes } from '../util';
import { StackEnv, Domain } from '../core/constants';
import { SSMContextLevel } from './ssm.contants';

/**
 * Name Conventions for SSM String Parameter
 * @param parameterName - name of parameter
 * @param serviceName - kebab-case-service-name
 * @param domain - rpj, sch, mob
 * @param contextLevel - global, domain, service
 * @param env - dev, perf, preprod, prod
 * @returns `/${env}/${contextValue[contextLevel]}/${parameterName}`
 * @example `/dev/rpagency/sample`
 */
export const ssmParameterName = (
  parameterName: string,
  serviceName: string,
  domain: Domain,
  contextLevel: SSMContextLevel,
  env: StackEnv,
): string => {
  const contextValue = {
    global: 'global',
    domain,
    service: pascalCaseToKebabCase(serviceName),
  };

  return `/${env}/${contextValue[contextLevel]}/${trimDashes(parameterName)}`;
};
