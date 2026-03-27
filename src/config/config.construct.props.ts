import { BaseConstructProps } from '../core/base.construct.props';
import { EnvConfig } from './config.interfaces';

/**
 * Props for {@link EksClusterConfig} construct.
 */
export interface EksClusterConfigProps extends BaseConstructProps {
  oidcProviderArns: EnvConfig;
  namespaceRules?: EnvConfig;
}
