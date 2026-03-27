import { BaseConstructProps } from '../core/base.construct.props';
import { EnvConfig } from '../config/config.interfaces';

/**
 * Props for {@link ServiceAccountRole} construct.
 */
export interface ServiceAccountRoleProps extends BaseConstructProps {
  oidcProviderArns: EnvConfig;
}
