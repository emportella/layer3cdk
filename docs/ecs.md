# ECS Package

Constructs for running containerized workloads on ECS Fargate with standardized naming, environment-aware defaults, CloudWatch alarms, and IAM integration.

## EcsCluster

A thin wrapper around `aws-cdk-lib/aws-ecs.Cluster`. One cluster per stack is the typical pattern — multiple `EcsFargateService` instances share it.

### What gets created

- `AWS::ECS::Cluster` named `<env>-<ServiceName>-Cluster` (e.g. `dev-OrderPlatform-Cluster`)

### Usage

```typescript
import { EcsCluster } from 'layer3cdk';
import { Vpc } from 'aws-cdk-lib/aws-ec2';

const vpc = Vpc.fromLookup(this, 'Vpc', { vpcId: 'vpc-abc123' });

const cluster = new EcsCluster(this, {
  config,
  vpc,
  containerInsights: true,
});
```

### Service Discovery (Cloud Map)

Enable a private DNS namespace on the cluster to let services discover each other without a load balancer:

```typescript
const cluster = new EcsCluster(this, {
  config,
  vpc,
  defaultCloudMapNamespace: 'my-service.local',
});
```

With this set, any `EcsFargateService` that passes `cloudMapOptions: { name: 'api' }` becomes reachable at `api.my-service.local` from other services in the same VPC.

## EcsFargateService

Creates a complete Fargate service: task definition, container, log group, service, and optional auto-scaling + ALB registration. Multiple services share a single `EcsCluster`.

### What gets created

- `AWS::ECS::TaskDefinition` — family `<env>-<ServiceName>-<Name>`
- `AWS::ECS::Service` — named `<env>-<ServiceName>-<Name>`, rolling deployments
- `AWS::Logs::LogGroup` — `/ecs/<env>-<ServiceName>-<Name>`
- Optional: `AWS::ApplicationAutoScaling::*` policies when `autoScaling` is provided

### Usage

```typescript
import { EcsFargateService } from 'layer3cdk';
import { ContainerImage } from 'aws-cdk-lib/aws-ecs';

const api = new EcsFargateService(this, {
  config,
  serviceName: 'api-gateway',
  cluster: cluster.getCluster(),
  container: {
    image: ContainerImage.fromRegistry(
      '123456789012.dkr.ecr.us-east-1.amazonaws.com/org/api:latest',
    ),
    portMappings: [{ containerPort: 8080 }],
    environment: { NODE_ENV: 'production', PORT: '8080' },
  },
  targetGroup: apiTargetGroup,
  autoScaling: {
    minCapacity: 1,
    maxCapacity: 4,
    targetCpuUtilization: 70,
  },
});

api.addPermissions(
  new PolicyStatement({ actions: ['dynamodb:Query'], resources: [tableArn] }),
);
api.setCloudWatchAlarms(snsAction);
```

### Container Config

| Field | Purpose |
|---|---|
| `image` | `ContainerImage` — ECR, Docker Hub, or any registry |
| `portMappings` | Container ports (host port defaults to container port in awsvpc mode) |
| `environment` | Plain-text env vars |
| `secrets` | Runtime secrets from SSM Parameter Store or Secrets Manager |
| `healthCheck` | Container-level health check |
| `command` / `entryPoint` | Override image defaults |
| `containerName` | Override the default (service's logical name) |

For advanced settings (ulimits, mount points, sidecar containers), use the `getTaskDefinition()` escape hatch after construction.

### Auto-scaling

Omit `autoScaling` to run at a fixed `desiredCount`. When provided:

```typescript
autoScaling: {
  minCapacity: 1,
  maxCapacity: 10,
  targetCpuUtilization: 70,
  targetMemoryUtilization: 80, // optional
  scaleInCooldown: Duration.seconds(60),
  scaleOutCooldown: Duration.seconds(60),
}
```

CPU and memory scaling policies are independent — provide either or both.

### IAM: Task Role vs Execution Role

| Method | Role | Use for |
|---|---|---|
| `addPermissions(...)` | **task role** (runtime) | Access to DynamoDB, S3, SQS from inside the container |
| `addExecutionRolePermissions(...)` | **execution role** | Pull images from private ECR, read secrets at boot time |
| `grantPolicies(role)` | external role | CI/CD roles triggering deployments (`ecs:UpdateService`, etc.) |
| `getTaskRole()` | — | Returns the task `IRole` for grants from other constructs |

### Environment-Aware Defaults

Built-in defaults are resolved by `config.stackEnv`:

| Property | default (dev/stg) | prd |
|---|---|---|
| cpu | 256 | 512 |
| memoryLimitMiB | 512 | 1024 |
| desiredCount | 1 | 2 |
| logRetentionDays | 7 days | 30 days |
| removalPolicy | DESTROY | RETAIN |
| containerInsights | false | true |
| alarmCpuThreshold | 80% | 70% |
| alarmMemoryThreshold | 80% | 70% |
| alarmMinRunningTasks | 1 | 2 |

Override per-environment via `ecsServiceConfig`:

```typescript
const api = new EcsFargateService(this, {
  config,
  serviceName: 'api-gateway',
  cluster: cluster.getCluster(),
  container: { /* ... */ },
  ecsServiceConfig: {
    default: { cpu: 512, memoryLimitMiB: 1024 },
    prd: { cpu: 1024, memoryLimitMiB: 2048, desiredCount: 4 },
  },
});
```

Only specify the fields you want to override — the rest fall through to the library defaults.

### CloudWatch Alarms

`setCloudWatchAlarms(...actions)` creates three alarms:

| Alarm | Metric | Missing data |
|---|---|---|
| CPU Utilization | AVG over 5 min | NOT_BREACHING |
| Memory Utilization | AVG over 5 min | NOT_BREACHING |
| Running Task Count | Below `alarmMinRunningTasks` | **BREACHING** (no data = no tasks) |

Thresholds come from the resolved `ecsServiceConfig` for the current environment.

## Worker + API Example

Two services on one cluster, discovering each other via Cloud Map — no load balancer needed between them.

```typescript
const cluster = new EcsCluster(this, {
  config,
  vpc,
  defaultCloudMapNamespace: 'my-service.local',
});

const api = new EcsFargateService(this, {
  config,
  serviceName: 'api',
  cluster: cluster.getCluster(),
  container: { image, portMappings: [{ containerPort: 3000 }] },
  cloudMapOptions: { name: 'api' },
});

const worker = new EcsFargateService(this, {
  config,
  serviceName: 'worker',
  cluster: cluster.getCluster(),
  container: {
    image,
    environment: { API_URL: 'http://api.my-service.local:3000' },
  },
  cloudMapOptions: { name: 'worker' },
});
```

## Public API

### EcsCluster

| Method | Description |
|---|---|
| `getCluster()` | Underlying `ICluster` to pass into services |
| `getArn()` | Cluster ARN |
| `outputArn()` | Export the ARN as a CloudFormation output |

### EcsFargateService

| Method | Description |
|---|---|
| `getService()` | Underlying `FargateService` |
| `getTaskDefinition()` | Underlying `FargateTaskDefinition` |
| `getTaskRole()` | The task `IRole` |
| `getArn()` | Service ARN |
| `outputArn()` | Export the ARN as a CloudFormation output |
| `addPermissions(...stmt)` | Add to the task (runtime) role |
| `addExecutionRolePermissions(...stmt)` | Add to the execution role |
| `grantPolicies(role)` | Grant an external role deployment permissions |
| `setCloudWatchAlarms(...actions)` | Create the CPU, memory, and task-count alarms |
| `resourceRemovalPolicy(policy)` | `RETAIN` or `DESTROY` |

## Notes

- During `cdk synth` you may see a deprecation warning for `CfnTaskDefinition#inferenceAccelerators`. This is emitted by CDK's internal L1 code inside `aws-cdk-lib`, not by this construct. It does not use inference accelerators.
