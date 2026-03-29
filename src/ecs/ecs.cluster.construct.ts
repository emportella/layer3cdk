import { CfnOutput } from 'aws-cdk-lib';
import { Cluster, ICluster } from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';
import { BaseConstruct } from '../core/base.construct';
import { EcsClusterProps } from './ecs.construct.props';
import { ecsClusterName } from './ecs.name.conventions';

/**
 * ECS Cluster construct for Fargate workloads.
 *
 * Creates a shared cluster that multiple {@link EcsFargateService} constructs
 * can deploy into. One cluster per stack is the typical pattern.
 *
 * The cluster itself is thin — it only needs a VPC. All compute, scaling,
 * and alarm configuration lives on the individual services.
 *
 * ### What gets created
 * - `AWS::ECS::Cluster` — named `<env>-<ServiceName>-Cluster`
 *
 * @example
 * ```typescript
 * const cluster = new EcsCluster(stack, { config, vpc });
 *
 * // Pass to services
 * new EcsFargateService(stack, {
 *   config,
 *   serviceName: 'api',
 *   cluster: cluster.getCluster(),
 *   container: { ... },
 * });
 * ```
 */
export class EcsCluster extends BaseConstruct<Cluster> {
  protected readonly resource: Cluster;

  /** The fully-qualified AWS ECS cluster name. */
  readonly ecsClusterName: string;

  constructor(scope: Construct, props: EcsClusterProps) {
    const {
      config,
      vpc,
      clusterName: logicalName,
      containerInsights,
      defaultCloudMapNamespace,
    } = props;

    const name = ecsClusterName({
      env: config.stackEnv,
      serviceName: config.serviceName,
    });

    super(scope, 'ecs-cluster', logicalName ?? 'Cluster', config);

    this.ecsClusterName = name;

    this.resource = new Cluster(this, this.resolver.childId('ecs-cluster'), {
      clusterName: name,
      vpc,
      containerInsights: containerInsights ?? false,
      defaultCloudMapNamespace: defaultCloudMapNamespace
        ? { name: defaultCloudMapNamespace }
        : undefined,
    });
  }

  /**
   * Returns the underlying CDK `ICluster` for passing to
   * {@link EcsFargateService} props.
   */
  public getCluster(): ICluster {
    return this.resource;
  }

  public getArn(): string {
    return this.resource.clusterArn;
  }

  public outputArn(): void {
    const exportName = this.resolver.arnExportName();
    new CfnOutput(this, exportName, {
      value: this.resource.clusterArn,
      exportName,
      description: `The ARN of the ECS cluster ${this.ecsClusterName}`,
    });
  }
}
