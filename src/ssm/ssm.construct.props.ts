import { BaseConstructProps } from '../core/base.construct.props';
import { Domain, StackEnv } from '../core/constants';
import { SSMContextLevel } from './ssm.contants';

/**
 * Props for {@link ssmParameterName} naming function.
 */
export interface SsmParameterNameProps {
  parameterName: string;
  serviceName: string;
  domain: Domain;
  contextLevel: SSMContextLevel;
  env: StackEnv;
}

/**
 * Props for {@link GlobalSSMStringParameter}, {@link DomainSSMStringParameter},
 * and {@link ServiceSSMStringParameter} constructs.
 */
export interface SSMStringParameterProps extends BaseConstructProps {
  parameterName: string;
  parameterValue: string;
}
