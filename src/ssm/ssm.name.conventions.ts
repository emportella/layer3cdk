import { pascalCaseToKebabCase, trimDashes } from '../util';
import { SsmParameterNameProps } from './ssm.construct.props';

/**
 * Name Conventions for SSM String Parameter
 * @param props.parameterName - name of parameter
 * @param props.serviceName - kebab-case-service-name
 * @param props.department - business unit
 * @param props.contextLevel - global, department, service
 * @param props.env - environment
 * @returns `/${env}/${contextValue[contextLevel]}/${parameterName}`
 * @example `/dev/global/api-base-url`, `/dev/pltf/notification-sender-email`, `/dev/taco-processor/max-concurrent-orders`
 */
export const ssmParameterName = (props: SsmParameterNameProps): string => {
  const { parameterName, serviceName, department, contextLevel, env } = props;
  const contextValue = {
    global: 'global',
    department,
    service: pascalCaseToKebabCase(serviceName),
  };

  return `/${env}/${contextValue[contextLevel]}/${trimDashes(parameterName)}`;
};
