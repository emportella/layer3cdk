import { Duration } from 'aws-cdk-lib';
import { IVpc, ISecurityGroup, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import {
  CloudMapOptions,
  ContainerImage,
  FargateServiceProps as CdkFargateServiceProps,
  FargateTaskDefinitionProps,
  HealthCheck,
  Protocol,
  Secret,
} from 'aws-cdk-lib/aws-ecs';
import { IApplicationTargetGroup } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { BaseConstructProps } from '../core/base.construct.props';
import { BaseEnvProps } from '../core/base.construct.env.props';
import { EcsServiceConfig } from './ecs.default.props';

/**
 * Props for {@link EcsCluster} construct.
 */
export interface EcsClusterProps extends BaseConstructProps {
  /** VPC to place the cluster in. */
  vpc: IVpc;
  /** Optional logical name for the cluster. @default 'Cluster' */
  clusterName?: string;
  /** Enable Container Insights. Resolved from env defaults if omitted. */
  containerInsights?: boolean;
  /**
   * Enable Cloud Map service discovery namespace.
   * When set, creates a private DNS namespace so services can discover each other
   * via `<serviceName>.<namespace>` DNS names within the VPC.
   *
   * @example 'banana-launcher.local'
   */
  defaultCloudMapNamespace?: string;
}

/**
 * Port mapping for an ECS container.
 */
export interface EcsPortMapping {
  /** The port exposed by the container. */
  containerPort: number;
  /** The host port. @default same as containerPort (awsvpc mode) */
  hostPort?: number;
  /** Protocol. @default Protocol.TCP */
  protocol?: Protocol;
}

/**
 * Container definition within an ECS Fargate service.
 *
 * Covers the common container configuration. For advanced settings
 * (ulimits, mount points, sidecar containers), use the
 * `getTaskDefinition()` escape hatch after construction.
 *
 * @example
 * ```typescript
 * container: {
 *   image: ContainerImage.fromRegistry('123456789012.dkr.ecr.us-east-1.amazonaws.com/org/api:latest'),
 *   portMappings: [{ containerPort: 8080 }],
 *   environment: { NODE_ENV: 'production', PORT: '8080' },
 *   secrets: { DB_PASSWORD: ecs.Secret.fromSsmParameter(dbPasswordParam) },
 *   healthCheck: { command: ['CMD-SHELL', 'curl -f http://localhost:8080/health || exit 1'] },
 * }
 * ```
 */
export interface EcsContainerConfig {
  /** Container image — from ECR, Docker Hub, or any registry. */
  image: ContainerImage;
  /** Port mappings. */
  portMappings?: EcsPortMapping[];
  /** Plain-text environment variables. */
  environment?: Record<string, string>;
  /** Secrets resolved at runtime from SSM Parameter Store or Secrets Manager. */
  secrets?: Record<string, Secret>;
  /** Container health check. */
  healthCheck?: HealthCheck;
  /** Override the container name. @default the service's logical name */
  containerName?: string;
  /** Override the container command. */
  command?: string[];
  /** Override the container entry point. */
  entryPoint?: string[];
}

/**
 * Auto-scaling configuration for an ECS Fargate service.
 * When omitted from service props, the service runs at a fixed `desiredCount`.
 *
 * @example
 * ```typescript
 * autoScaling: {
 *   minCapacity: 1,
 *   maxCapacity: 10,
 *   targetCpuUtilization: 70,
 *   targetMemoryUtilization: 80,
 * }
 * ```
 */
export interface EcsAutoScalingConfig {
  /** Minimum number of tasks. */
  minCapacity: number;
  /** Maximum number of tasks. */
  maxCapacity: number;
  /** Target CPU utilization % for scaling. Omit to skip CPU-based scaling. */
  targetCpuUtilization?: number;
  /** Target memory utilization % for scaling. Omit to skip memory-based scaling. */
  targetMemoryUtilization?: number;
  /** Cooldown after scale-in. @default 60s */
  scaleInCooldown?: Duration;
  /** Cooldown after scale-out. @default 60s */
  scaleOutCooldown?: Duration;
}

/**
 * Props for {@link EcsFargateService} construct.
 *
 * ### What gets created
 * - `AWS::ECS::TaskDefinition` — CPU, memory, container, logging
 * - `AWS::ECS::Service` — Fargate service with rolling deployment
 * - `AWS::Logs::LogGroup` — `/ecs/<env>-<ServiceName>-<Name>`
 * - Optional: auto-scaling policies, ALB target group registration
 *
 * ### Generated resource names
 * - **Service**: `<env>-<ServiceName>-<Name>` (e.g. `dev-BananaLauncher-ApiGateway`)
 * - **Task Definition**: `<env>-<ServiceName>-<Name>`
 * - **LogGroup**: `/ecs/<env>-<ServiceName>-<Name>`
 *
 * @example
 * ```typescript
 * new EcsFargateService(stack, {
 *   config,
 *   serviceName: 'api-gateway',
 *   cluster: cluster.getCluster(),
 *   container: {
 *     image: ContainerImage.fromRegistry('123456789012.dkr.ecr.us-east-1.amazonaws.com/org/api:latest'),
 *     portMappings: [{ containerPort: 8080 }],
 *     environment: { PORT: '8080' },
 *   },
 *   targetGroup: apiTargetGroup,
 *   autoScaling: { minCapacity: 1, maxCapacity: 4, targetCpuUtilization: 70 },
 * });
 * ```
 */
export interface EcsFargateServiceProps extends BaseConstructProps {
  /**
   * Logical service name (e.g. `'api-gateway'`, `'worker'`).
   * PascalCased in generated resource names.
   */
  serviceName: string;

  /** ECS cluster to run the service on (from `EcsCluster.getCluster()`). */
  cluster: import('aws-cdk-lib/aws-ecs').ICluster;

  /** Container configuration (image, ports, env vars, secrets, health check). */
  container: EcsContainerConfig;

  /** VPC subnets for task placement. */
  vpcSubnets?: SubnetSelection;

  /** Security groups for the tasks. */
  securityGroups?: ISecurityGroup[];

  /** Assign public IP to tasks. @default false */
  assignPublicIp?: boolean;

  /** ALB target group to register the service with. ALB is created externally. */
  targetGroup?: IApplicationTargetGroup;

  /**
   * Cloud Map service discovery options.
   * Requires `defaultCloudMapNamespace` on the cluster.
   * Registers the service so other services can discover it via DNS.
   *
   * @example
   * ```typescript
   * cloudMapOptions: { name: 'api' }
   * // Discoverable at: api.banana-launcher.local
   * ```
   */
  cloudMapOptions?: CloudMapOptions;

  /** Auto-scaling config. When omitted, runs at fixed `desiredCount`. */
  autoScaling?: EcsAutoScalingConfig;

  /**
   * Environment-aware overrides for library defaults (CPU, memory, desired count, etc.).
   * Deep-merged on top of {@link ECS_SERVICE_ENVIRONMENTS_PROPS}.
   * Only specify the fields you want to override.
   */
  ecsServiceConfig?: BaseEnvProps<Partial<EcsServiceConfig>>;

  /** Raw CDK `FargateServiceProps` overrides (spread last). */
  serviceProps?: Partial<CdkFargateServiceProps>;

  /** Raw CDK `FargateTaskDefinitionProps` overrides. */
  taskDefinitionProps?: Partial<FargateTaskDefinitionProps>;
}
