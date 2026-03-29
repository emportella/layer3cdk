import { CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  ComparisonOperator,
  IAlarmAction,
  Metric,
  Stats,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import {
  FargateService,
  FargateTaskDefinition,
  LogDrivers,
  Protocol,
} from 'aws-cdk-lib/aws-ecs';
import { IRole, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { BaseConstruct } from '../core/base.construct';
import { resolveEnvProps } from '../core/base.construct.env.props';
import { EcsFargateServiceProps } from './ecs.construct.props';
import {
  ecsLogGroupName,
  ecsServiceName,
  ecsTaskDefinitionFamily,
} from './ecs.name.conventions';
import {
  EcsServiceAlarmThresholds,
  ECS_SERVICE_ENVIRONMENTS_PROPS,
} from './ecs.default.props';

/**
 * ECS Fargate service construct with standardized naming, env-specific defaults,
 * CloudWatch alarms, and IAM integration.
 *
 * Each instance creates a complete Fargate service: task definition, container,
 * log group, and the service itself. Multiple instances can share the same
 * {@link EcsCluster}.
 *
 * ### What gets created
 * - `AWS::ECS::TaskDefinition` — named `<env>-<ServiceName>-<Name>`
 * - `AWS::ECS::Service` — named `<env>-<ServiceName>-<Name>` with rolling deployment
 * - `AWS::Logs::LogGroup` — named `/ecs/<env>-<ServiceName>-<Name>`
 * - Optional: `AWS::ApplicationAutoScaling::*` policies
 *
 * ### Inherited capabilities
 * - `setCloudWatchAlarms()` — CPU utilization, memory utilization, running task count
 * - `addPermissions(...)` — add IAM policies to the **task role** (runtime permissions)
 * - `addExecutionRolePermissions(...)` — add to the **execution role** (pull images, read secrets)
 * - `grantPolicies(role)` — grant an external role permissions on this service
 * - `outputArn()` — export the service ARN as a CloudFormation output
 * - `resourceRemovalPolicy()` — control retain/destroy
 *
 * @example
 * ```typescript
 * const api = new EcsFargateService(stack, {
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
 *
 * api.addPermissions(
 *   new PolicyStatement({ actions: ['dynamodb:Query'], resources: [tableArn] }),
 * );
 * api.setCloudWatchAlarms(opsGenieAction);
 * ```
 */
export class EcsFargateService extends BaseConstruct<FargateService> {
  protected readonly resource: FargateService;

  /** The underlying Fargate task definition. */
  readonly taskDefinition: FargateTaskDefinition;

  /** The fully-qualified AWS ECS service name. */
  readonly ecsServiceName: string;

  private readonly alarmThresholds: EcsServiceAlarmThresholds;

  constructor(scope: Construct, props: EcsFargateServiceProps) {
    const {
      config,
      serviceName: name,
      cluster,
      container,
      vpcSubnets,
      securityGroups,
      assignPublicIp,
      targetGroup,
      cloudMapOptions,
      autoScaling,
      ecsServiceConfig,
      serviceProps,
      taskDefinitionProps,
    } = props;

    const resolvedName = ecsServiceName({
      env: config.stackEnv,
      serviceName: config.serviceName,
      name,
    });

    super(scope, 'ecs-service', name, config);

    this.ecsServiceName = resolvedName;

    // 1. Resolve env-specific config (library defaults + user partial overrides)
    const base = resolveEnvProps(ECS_SERVICE_ENVIRONMENTS_PROPS, config);
    const overrides = ecsServiceConfig
      ? resolveEnvProps(ecsServiceConfig, config)
      : {};
    const resolvedConfig = { ...base, ...overrides };
    this.alarmThresholds = resolvedConfig;

    // 2. Log group
    const logGroup = new LogGroup(this, `${resolvedName}-logs`, {
      logGroupName: ecsLogGroupName({
        env: config.stackEnv,
        serviceName: config.serviceName,
        name,
      }),
      retention: resolvedConfig.logRetentionDays,
    });

    // 3. Task definition
    this.taskDefinition = new FargateTaskDefinition(
      this,
      this.resolver.childId('ecs-task-def'),
      {
        family: ecsTaskDefinitionFamily({
          env: config.stackEnv,
          serviceName: config.serviceName,
          name,
        }),
        cpu: resolvedConfig.cpu,
        memoryLimitMiB: resolvedConfig.memoryLimitMiB,
        ...taskDefinitionProps,
      },
    );

    // 4. Container
    const containerName = container.containerName ?? name;
    this.taskDefinition.addContainer(containerName, {
      image: container.image,
      logging: LogDrivers.awsLogs({ streamPrefix: name, logGroup }),
      portMappings: container.portMappings?.map((pm) => ({
        containerPort: pm.containerPort,
        hostPort: pm.hostPort ?? pm.containerPort,
        protocol: pm.protocol ?? Protocol.TCP,
      })),
      environment: container.environment,
      secrets: container.secrets,
      healthCheck: container.healthCheck,
      command: container.command,
      entryPoint: container.entryPoint,
    });

    // 5. Fargate service
    this.resource = new FargateService(
      this,
      this.resolver.childId('ecs-service'),
      {
        serviceName: resolvedName,
        cluster,
        taskDefinition: this.taskDefinition,
        desiredCount: resolvedConfig.desiredCount,
        vpcSubnets,
        securityGroups,
        assignPublicIp: assignPublicIp ?? false,
        cloudMapOptions,
        ...serviceProps,
      },
    );

    // 6. ALB target group registration
    if (targetGroup) {
      this.resource.attachToApplicationTargetGroup(targetGroup);
    }

    // 7. Auto-scaling
    if (autoScaling) {
      const scaling = this.resource.autoScaleTaskCount({
        minCapacity: autoScaling.minCapacity,
        maxCapacity: autoScaling.maxCapacity,
      });
      if (autoScaling.targetCpuUtilization) {
        scaling.scaleOnCpuUtilization(`${name}-cpu-scaling`, {
          targetUtilizationPercent: autoScaling.targetCpuUtilization,
          scaleInCooldown: autoScaling.scaleInCooldown ?? Duration.seconds(60),
          scaleOutCooldown:
            autoScaling.scaleOutCooldown ?? Duration.seconds(60),
        });
      }
      if (autoScaling.targetMemoryUtilization) {
        scaling.scaleOnMemoryUtilization(`${name}-memory-scaling`, {
          targetUtilizationPercent: autoScaling.targetMemoryUtilization,
          scaleInCooldown: autoScaling.scaleInCooldown ?? Duration.seconds(60),
          scaleOutCooldown:
            autoScaling.scaleOutCooldown ?? Duration.seconds(60),
        });
      }
    }
  }

  public getArn(): string {
    return this.resource.serviceArn;
  }

  public outputArn(): void {
    const exportName = this.resolver.arnExportName();
    new CfnOutput(this, exportName, {
      value: this.resource.serviceArn,
      exportName,
      description: `The ARN of the ECS Fargate service ${this.ecsServiceName}`,
    });
  }

  /**
   * Grants an external IAM role permissions to describe and update this service.
   * Useful for CI/CD roles that trigger deployments.
   */
  public grantPolicies(iamRole: Role): void {
    iamRole.addToPrincipalPolicy(
      new PolicyStatement({
        actions: [
          'ecs:DescribeServices',
          'ecs:UpdateService',
          'ecs:DescribeTaskDefinition',
          'ecs:RegisterTaskDefinition',
        ],
        resources: ['*'],
      }),
    );
  }

  /**
   * Adds IAM policy statements to the **task role** (runtime permissions).
   * Use this to grant the running containers access to AWS resources.
   *
   * @example
   * ```typescript
   * service.addPermissions(
   *   new PolicyStatement({ actions: ['dynamodb:Query'], resources: [tableArn] }),
   *   new PolicyStatement({ actions: ['s3:GetObject'], resources: [bucketArn + '/*'] }),
   * );
   * ```
   */
  public addPermissions(...statements: PolicyStatement[]): void {
    for (const statement of statements) {
      this.taskDefinition.taskRole.addToPrincipalPolicy(statement);
    }
  }

  /**
   * Adds IAM policy statements to the **execution role**.
   * Use this for permissions needed before the container starts
   * (pull images from private ECR, read secrets from Secrets Manager/SSM).
   */
  public addExecutionRolePermissions(...statements: PolicyStatement[]): void {
    for (const statement of statements) {
      this.taskDefinition.executionRole?.addToPrincipalPolicy(statement);
    }
  }

  /**
   * Creates three CloudWatch alarms:
   *
   * | Alarm | Metric | Missing data |
   * |-------|--------|-------------|
   * | CPU Utilization | AVG, 5 min | NOT_BREACHING |
   * | Memory Utilization | AVG, 5 min | NOT_BREACHING |
   * | Running Task Count | Below min threshold | **BREACHING** (no data = no tasks) |
   */
  public setCloudWatchAlarms(...alarmActions: IAlarmAction[]): void {
    this.createAlarm(
      'cpu-utilization',
      {
        metric: this.resource.metricCpuUtilization({
          period: Duration.minutes(5),
          statistic: Stats.AVERAGE,
        }),
        alarmName: `${this.resourceName} ECS CPU Utilization`,
        alarmDescription: `Alarm if ${this.resourceName} CPU utilization exceeds ${this.alarmThresholds.alarmCpuThreshold}%`,
        threshold: this.alarmThresholds.alarmCpuThreshold,
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      },
      ...alarmActions,
    );

    this.createAlarm(
      'memory-utilization',
      {
        metric: this.resource.metricMemoryUtilization({
          period: Duration.minutes(5),
          statistic: Stats.AVERAGE,
        }),
        alarmName: `${this.resourceName} ECS Memory Utilization`,
        alarmDescription: `Alarm if ${this.resourceName} memory utilization exceeds ${this.alarmThresholds.alarmMemoryThreshold}%`,
        threshold: this.alarmThresholds.alarmMemoryThreshold,
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      },
      ...alarmActions,
    );

    this.createAlarm(
      'running-task-count',
      {
        metric: new Metric({
          namespace: 'ECS/ContainerInsights',
          metricName: 'RunningTaskCount',
          dimensionsMap: {
            ClusterName: this.resource.cluster.clusterName,
            ServiceName: this.ecsServiceName,
          },
          period: Duration.minutes(1),
          statistic: Stats.AVERAGE,
        }),
        alarmName: `${this.resourceName} ECS Running Task Count`,
        alarmDescription: `Alarm if ${this.resourceName} running task count drops below ${this.alarmThresholds.alarmMinRunningTasks}`,
        threshold: this.alarmThresholds.alarmMinRunningTasks,
        comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        treatMissingData: TreatMissingData.BREACHING,
      },
      ...alarmActions,
    );
  }

  public resourceRemovalPolicy(
    removalPolicy: RemovalPolicy.DESTROY | RemovalPolicy.RETAIN,
  ): void {
    this.resource.applyRemovalPolicy(removalPolicy);
  }

  /** Returns the underlying CDK `FargateService`. */
  public getService(): FargateService {
    return this.resource;
  }

  /** Returns the underlying CDK `FargateTaskDefinition`. */
  public getTaskDefinition(): FargateTaskDefinition {
    return this.taskDefinition;
  }

  /** Returns the task role for direct IAM grants from other constructs. */
  public getTaskRole(): IRole {
    return this.taskDefinition.taskRole;
  }
}
