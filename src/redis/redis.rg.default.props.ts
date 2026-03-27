import { BaseEnvProps } from '../core';
import { RedisReplicationGroupProps } from './redis.rg.construct';

export type RedisReplicationGroupConfig = Pick<
  RedisReplicationGroupProps,
  | 'automaticFailoverEnabled'
  | 'autoMinorVersionUpgrade'
  | 'cacheNodeType'
  | 'cacheParameterGroupName'
  | 'clusterMode'
  | 'engineVersion'
  | 'multiAzEnabled'
  | 'numCacheClusters'
  | 'numNodeGroups'
  | 'preferredMaintenanceWindow'
  | 'replicasPerNodeGroup'
>;

export const REDIS_RG_ENVIRONMENTS_PROPS: BaseEnvProps<RedisReplicationGroupConfig> =
  {
    default: {
      automaticFailoverEnabled: true,
      autoMinorVersionUpgrade: true,
      cacheNodeType: 'cache.t4g.micro',
      cacheParameterGroupName: 'default.redis7.cluster.on',
      clusterMode: 'enabled',
      multiAzEnabled: false,
      numNodeGroups: 2,
      preferredMaintenanceWindow: 'sun:23:00-mon:01:30',
    },
    stg: {
      automaticFailoverEnabled: true,
      autoMinorVersionUpgrade: true,
      cacheNodeType: 'cache.t4g.small',
      cacheParameterGroupName: 'default.redis7.cluster.on',
      clusterMode: 'enabled',
      multiAzEnabled: false,
      numNodeGroups: 2,
      preferredMaintenanceWindow: 'sun:23:00-mon:01:30',
    },
    prd: {
      automaticFailoverEnabled: true,
      autoMinorVersionUpgrade: false,
      cacheNodeType: 'cache.t4g.medium',
      cacheParameterGroupName: 'default.redis7.cluster.on',
      clusterMode: 'enabled',
      multiAzEnabled: true,
      numNodeGroups: 2,
    },
  };
