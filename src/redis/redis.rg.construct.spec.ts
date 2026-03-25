import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { BaseConfig } from '../core';
import { redisClusterName } from './redis.name.conventions';
import {
  RedisReplicationGroup,
  RedisReplicationGroupProps,
} from './redis.rg.construct';
import { testconfig } from '../test/common.test.const';
import { RedisReplicationGroupConfig } from './redis.rg.default.props';

describe('RedisReplicationGroup', () => {
  let stack: Stack;
  let config: BaseConfig;

  const redisProps: RedisReplicationGroupProps = {
    subnets: [{ id: 'subnet1' }, { id: 'subnet1' }],
    replicationGroupDescription: 'RP Redis Cluster',
    securityGroupIds: ['sg1', 'sg2'],
    engineVersion: 'diesel',
  };

  const redisConfig: RedisReplicationGroupConfig = {
    clusterMode: 'enabled',
    multiAzEnabled: false,
  };

  const envRedisConfig = {
    default: redisConfig,
    prod: redisConfig,
  };

  const envRedisProps = {
    default: redisProps,
    prod: redisProps,
  };

  beforeEach(() => {
    stack = new Stack();
    config = testconfig;

    new RedisReplicationGroup(stack, config, envRedisProps, envRedisConfig);
  });

  it('should create one replication group with the correct id', () => {
    const { stackEnv, serviceName, domain } = config;
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::ElastiCache::ReplicationGroup', 1);
    template.resourceCountIs('AWS::ElastiCache::SubnetGroup', 1);

    const groupId = redisClusterName({
      env: stackEnv,
      domain: domain,
      serviceName,
    });

    template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
      ReplicationGroupId: groupId,
    });
  });

  it('should create resources with expected properties', () => {
    const { securityGroupIds, subnets } = redisProps;
    const template = Template.fromStack(stack);
    template.hasResourceProperties(
      'AWS::ElastiCache::ReplicationGroup',
      Match.objectEquals({
        AtRestEncryptionEnabled: true,
        CacheSubnetGroupName: 'dev-rpj-RpjTestApp-subnet',
        ClusterMode: redisConfig.clusterMode,
        Engine: 'redis',
        IpDiscovery: 'ipv4',
        ReplicationGroupDescription: redisProps.replicationGroupDescription,
        ReplicationGroupId: 'dev-rpj-RpjTestApp',
        SecurityGroupIds: securityGroupIds,
        TransitEncryptionEnabled: true,
        TransitEncryptionMode: 'required',
        EngineVersion: redisProps.engineVersion,
        MultiAZEnabled: false,
        CacheNodeType: 'cache.t4g.micro',
        CacheParameterGroupName: 'default.redis7.cluster.on',
        AutomaticFailoverEnabled: true,
        AutoMinorVersionUpgrade: true,
        PreferredMaintenanceWindow: 'sun:23:00-mon:01:30',
        NumNodeGroups: 2,
      }),
    );

    template.hasResourceProperties(
      'AWS::ElastiCache::SubnetGroup',
      Match.objectEquals({
        CacheSubnetGroupName: 'dev-rpj-RpjTestApp-subnet',
        Description: 'Elasticache Subnet Group',
        SubnetIds: subnets.map(({ id }) => id),
        Tags: Match.anyValue(), // since order of items cannot be ignored
      }),
    );
  });

  it('should create resources with expected properties in Production', () => {
    const prodConfig = new BaseConfig(
      config.domain,
      config.env,
      config.stackName,
      config.tags,
      'prod',
      config.serviceName,
      config.description,
    );
    stack = new Stack();
    new RedisReplicationGroup(stack, prodConfig, envRedisProps, envRedisConfig);

    Template.fromStack(stack).hasResourceProperties(
      'AWS::ElastiCache::ReplicationGroup',
      {
        AutoMinorVersionUpgrade: false,
        CacheNodeType: 'cache.t4g.medium',
      },
    );
  });

  it('should create subnet group with correct tags', () => {
    const template = Template.fromStack(stack);
    const subnetGroups = template.findResources(
      'AWS::ElastiCache::SubnetGroup',
    );
    const groupNames = Object.keys(subnetGroups);

    expect(groupNames.length).toBe(1);

    const groupName = groupNames[0];

    const tags = subnetGroups[groupName].Properties.Tags;

    expect(tags).toEqual(
      expect.arrayContaining(
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Object.entries(config.tags).map(([Key, Value]) => ({ Key, Value })),
      ),
    );
  });

  it('should create an hostname and port outputs', () => {
    const template = Template.fromStack(stack);
    const hostOutputLookup = template.findOutputs(
      `*`,
      Match.objectLike({
        Export: {
          Name: 'output-dev-rpj-RpjTestApp-host',
        },
      }),
    );

    expect(Object.keys(hostOutputLookup).length).toBe(1);

    const portOutputLookup = template.findOutputs(
      `*`,
      Match.objectLike({
        Export: {
          Name: 'output-dev-rpj-RpjTestApp-port',
        },
      }),
    );

    expect(Object.keys(portOutputLookup).length).toBe(1);
  });
});
