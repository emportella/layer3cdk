import { pascalCaseToKebabCase, trimDashes } from '../util';
import { SsmParameterNameProps } from './ssm.construct.props';

/**
 * Name Conventions for SSM String Parameter
 * @param props.parameterName - name of parameter
 * @param props.serviceName - kebab-case-service-name
 * @param props.domain - rpj, sch, mob
 * @param props.contextLevel - global, domain, service
 * @param props.env - dev, stg, prd
 * @returns `/${env}/${contextValue[contextLevel]}/${parameterName}`
 * @example `/dev/rpagency/sample`
 */
export const ssmParameterName = (props: SsmParameterNameProps): string => {
  const { parameterName, serviceName, domain, contextLevel, env } = props;
  const contextValue = {
    global: 'global',
    domain,
    service: pascalCaseToKebabCase(serviceName),
  };

  return `/${env}/${contextValue[contextLevel]}/${trimDashes(parameterName)}`;
};
