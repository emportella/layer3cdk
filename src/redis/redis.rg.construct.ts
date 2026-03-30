import { CfnReplicationGroup } from 'aws-cdk-lib/aws-elasticache';
import {
  CfnReplicationGroupProps,
  CfnSubnetGroup,
} from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';
import {
  BaseConfig,
  BaseConstruct,
  BaseEnvProps,
  resolveEnvProps,
  resolveAndMergeEnvProps,
} from '../core';
import { RedisReplicationGroupConstructProps } from './redis.construct.props';
import {
  redisClusterName,
  redisSubnetGroupName,
} from './redis.name.conventions';
import { kebabToPascalCase } from '../util';
import { CfnOutput, CfnResource, RemovalPolicy } from 'aws-cdk-lib';
import {
  REDIS_RG_ENVIRONMENTS_PROPS,
  RedisReplicationGroupConfig,
} from './redis.rg.default.props';

type ExcludeProps =
  | 'replicationGroupId'
  | 'engine'
  | 'atRestEncryptionEnabled'
  | 'transitEncryptionEnabled'
  | 'transitEncryptionMode'
  | 'ipDiscovery'
  | 'cacheSubnetGroupName';

export type RedisReplicationGroupProps = Omit<
  CfnReplicationGroupProps,
  ExcludeProps
> & {
  subnets: Array<{
    id: string;
  }>;
  securityGroupIds: string[];
  subnetGroupDescription?: string;
};

/**
 * ElastiCache Redis replication group with enforced encryption (at-rest and in-transit),
 * automatic subnet group creation, and CloudFormation outputs for host and port.
 *
 * @param elasticacheProps - Per-environment Redis properties (node type, replicas, subnets, security groups, etc.).
 * @param elasticacheConfig - Optional per-environment config overrides merged with library defaults.

 */
export class RedisReplicationGroup extends BaseConstruct<CfnReplicationGroup> {
  protected readonly resource: CfnReplicationGroup;

  private buildConstructProps({
    config,
    elasticacheProps,
    elasticacheConfig,
  }: {
    config: BaseConfig;
    elasticacheProps: BaseEnvProps<RedisReplicationGroupProps>;
    elasticacheConfig?: BaseEnvProps<RedisReplicationGroupConfig>;
  }) {
    return {
      ...resolveEnvProps(elasticacheProps, config),
      ...resolveAndMergeEnvProps(
        REDIS_RG_ENVIRONMENTS_PROPS,
        config,
        elasticacheConfig,
      ),
    };
  }

  constructor(scope: Construct, props: RedisReplicationGroupConstructProps) {
    const { config, elasticacheProps, elasticacheConfig } = props;
    const { stackEnv, serviceName, department, tags } = config;
    const namingProps = {
      env: stackEnv,
      serviceName,
      department,
    };

    const replicationGroupId = redisClusterName(namingProps);
    const logicalName = kebabToPascalCase(serviceName || 'shared');

    super(scope, 'redis-replication-group', logicalName, config);
    const resourceProps = this.buildConstructProps({
      config,
      elasticacheProps,
      elasticacheConfig,
    });

    const { subnets, subnetGroupDescription, ...restProps } = resourceProps;

    const subnetGroup = new CfnSubnetGroup(this, 'RedisSubnetGroup', {
      subnetIds: subnets.map(({ id }) => id),
      cacheSubnetGroupName: redisSubnetGroupName(namingProps),
      description: subnetGroupDescription || 'Elasticache Subnet Group',
      tags: Object.entries(tags).map(([key, value]) => ({ key, value })),
    });

    const replicationGroup = new CfnReplicationGroup(
      this,
      'RedisReplicationGroup',
      {
        ...restProps,
        // parameters that cannot be controlled by construct's consumer
        replicationGroupId,
        engine: 'redis',
        atRestEncryptionEnabled: true,
        transitEncryptionEnabled: true,
        transitEncryptionMode: 'required',
        ipDiscovery: 'ipv4',
        cacheSubnetGroupName: subnetGroup.cacheSubnetGroupName,
      },
    );
    this.resource = replicationGroup;

    replicationGroup.addDependency(subnetGroup);

    // Replication group hostname
    const hostExportName = this.resolver.outputExportName('host');
    new CfnOutput(this, 'ReplicationGroupHost', {
      value: this.resource.attrConfigurationEndPointAddress,
      exportName: hostExportName,
      description: `The hostname for the replication group ${this.resourceName} `,
    });

    // Replication group port
    const portExportName = this.resolver.outputExportName('port');
    new CfnOutput(this, 'ReplicationGroupPort', {
      value: this.resource.attrConfigurationEndPointPort,
      exportName: portExportName,
      description: `The port for the replication group ${this.resourceName} `,
    });
  }

  addDependency(target: CfnResource) {
    this.resource.addDependency(target);
  }

  protected resourceRemovalPolicy(
    removalPolicy: RemovalPolicy.DESTROY | RemovalPolicy.RETAIN,
  ): void {
    this.resource.applyRemovalPolicy(removalPolicy);
  }
}
