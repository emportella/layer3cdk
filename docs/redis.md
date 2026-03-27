# Redis Package

All ElastiCache Redis-related constructs should be built in this package.

## RedisReplicationGroup

The `RedisReplicationGroup` construct creates an ElastiCache Redis replication group with enforced best practices:

- **Encryption**: At-rest and in-transit encryption are always enabled (`transitEncryptionMode: required`).
- **Subnet group**: Automatically created from the subnets you provide.
- **Outputs**: CloudFormation exports for the replication group host and port.
- **Environment-aware**: Uses `BaseEnvProps` for per-environment configuration (node type, replicas, etc.).

### Usage

```typescript
import { RedisReplicationGroup } from 'layer3cdk';

const redis = new RedisReplicationGroup(this, {
  config,
  elasticacheProps: {
    default: {
      replicationGroupDescription: 'Shared Redis cluster',
      numNodeGroups: 1,
      replicasPerNodeGroup: 1,
      cacheNodeType: 'cache.t4g.micro',
      automaticFailoverEnabled: true,
      autoMinorVersionUpgrade: true,
      securityGroupIds: ['sg-xxxxx'],
      subnets: [{ id: 'subnet-aaa' }, { id: 'subnet-bbb' }],
    },
    prd: {
      cacheNodeType: 'cache.t4g.medium',
      autoMinorVersionUpgrade: false,
    },
  },
});
```

### Library Defaults

The library ships `REDIS_RG_ENVIRONMENTS_PROPS` with sensible defaults per environment. Your `elasticacheConfig` overrides are deep-merged on top via `resolveAndMergeEnvProps()`.
