import { IAlarmAction } from 'aws-cdk-lib/aws-cloudwatch';
import { CfnReplicationGroup } from 'aws-cdk-lib/aws-elasticache';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  CfnReplicationGroupProps,
  CfnSubnetGroup,
} from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';
import {
  ABConfig,
  ABConstruct,
  ABEnvProps,
  ConstructProps,
  generateOutputExportName,
  generateRedisClusterName,
  generateRedisSubnetGroupName,
} from '../common';
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

export class RedisReplicationGroup extends ABConstruct<CfnReplicationGroup> {
  protected readonly resource: CfnReplicationGroup;

  private buildConstructProps({
    config,
    elastiCacheProps,
    elastiCacheConfig,
  }: {
    config: ABConfig;
    elastiCacheProps: ABEnvProps<RedisReplicationGroupProps>;
    elastiCacheConfig?: ABEnvProps<RedisReplicationGroupConfig>;
  }) {
    const constructProps = ConstructProps.of(elastiCacheProps, config);
    const constructEnvProps = ConstructProps.of(
      REDIS_RG_ENVIRONMENTS_PROPS,
      config,
    );

    return {
      ...constructProps.getProps(),
      ...constructEnvProps.getMergedPropsFromIfABEnvProps(elastiCacheConfig),
    };
  }

  constructor(
    scope: Construct,
    config: ABConfig,
    elastiCacheProps: ABEnvProps<RedisReplicationGroupProps>,
    elastiCacheConfig?: ABEnvProps<RedisReplicationGroupConfig>,
  ) {
    const { abEnv, serviceName, domain, tags } = config;
    const namingProps = {
      abEnv,
      serviceName,
      domain,
    };

    const replicationGroupId = generateRedisClusterName(namingProps);

    super(scope, 'redis-replication-group', replicationGroupId, config);
    const resourceProps = this.buildConstructProps({
      config,
      elastiCacheProps,
      elastiCacheConfig,
    });

    const { subnets, subnetGroupDescription } = resourceProps;

    const subnetGroup = new CfnSubnetGroup(this, 'RedisSubnetGroup', {
      subnetIds: subnets.map(({ id }) => id),
      cacheSubnetGroupName: generateRedisSubnetGroupName(namingProps),
      description: subnetGroupDescription || 'Elasticache Subnet Group',
      tags: Object.entries(tags).map(([key, value]) => ({ key, value })), // for some reason not set automatically
    });

    const replicationGroup = new CfnReplicationGroup(
      this,
      'RedisReplicationGroup',
      {
        ...resourceProps,
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
    const hostExportName = generateOutputExportName({
      resourceName: this.resourceName,
      paramType: 'host',
    });
    new CfnOutput(this, 'ReplicationGroupHost', {
      value: this.resource.attrConfigurationEndPointAddress,
      exportName: hostExportName,
      description: `The hostname for the replication group ${this.resourceName} `,
    });

    // Replication group port
    const portExportName = generateOutputExportName({
      resourceName: this.resourceName,
      paramType: 'port',
    });
    new CfnOutput(this, 'ReplicationGroupPort', {
      value: this.resource.attrConfigurationEndPointPort,
      exportName: portExportName,
      description: `The port for the replication group ${this.resourceName} `,
    });
  }

  getArn(): string {
    throw new Error('Method not implemented.');
  }

  outputArn(): void {
    throw new Error('Method not implemented.');
  }

  grantPolicies(): void {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setCloudWatchAlarms(alarmAction?: IAlarmAction | undefined): void {
    throw new Error('Method not implemented.');
  }

  addDependency(target: CfnResource) {
    this.resource.addDependency(target);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected addPolicyStatements(...statements: PolicyStatement[]): void {
    throw new Error('Method not implemented.');
  }
  protected resourceRemovalPolicy(
    removalPolicy: RemovalPolicy.DESTROY | RemovalPolicy.RETAIN,
  ): void {
    this.resource.applyRemovalPolicy(removalPolicy);
  }
}
