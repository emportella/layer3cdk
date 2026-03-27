import { BaseConstructProps } from '../core/base.construct.props';
import { BaseEnvProps } from '../core/base.construct.env.props';
import { RedisReplicationGroupProps } from './redis.rg.construct';
import { RedisReplicationGroupConfig } from './redis.rg.default.props';

/**
 * Props for {@link RedisReplicationGroup} construct.
 */
export interface RedisReplicationGroupConstructProps extends BaseConstructProps {
  elasticacheProps: BaseEnvProps<RedisReplicationGroupProps>;
  elasticacheConfig?: BaseEnvProps<RedisReplicationGroupConfig>;
}
