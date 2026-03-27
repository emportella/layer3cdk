import { BaseConstructProps } from '../core/base.construct.props';
import { SSMContextLevel } from './ssm.contants';

/**
 * Props for {@link ssmParameterName} naming function.
 */
export interface SsmParameterNameProps {
  parameterName: string;
  serviceName: string;
  department: string;
  contextLevel: SSMContextLevel;
  env: string;
}

/**
 * Props for {@link GlobalSSMStringParameter}, {@link DepartmentSSMStringParameter},
 * and {@link ServiceSSMStringParameter} constructs.
 */
export interface SSMStringParameterProps extends BaseConstructProps {
  parameterName: string;
  parameterValue: string;
}
