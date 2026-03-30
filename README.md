# Layer3CDK

[![Integration](https://github.com/emportella/layer3cdk/actions/workflows/integration.yml/badge.svg)](https://github.com/emportella/layer3cdk/actions/workflows/integration.yml)
[![npm version](https://img.shields.io/npm/v/layer3cdk.svg)](https://www.npmjs.com/package/layer3cdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**Production-ready AWS CDK L3 constructs that eliminate boilerplate and enforce best practices.**

Layer3CDK sits on top of [AWS CDK](https://aws.amazon.com/cdk/) and provides high-level, opinionated constructs for the services teams use every day -- SQS, SNS, DynamoDB, ElastiCache Redis, ECR, Lambda, ECS Fargate, SSM, Secrets Manager, S3 static sites, IAM, and CloudWatch Alarms. Instead of wiring up 50+ lines of CDK per resource, you write one construct call with a props object and get consistent naming, tagging, alarms, IAM grants, and environment-aware configuration out of the box.

```typescript
import { BaseStackConfig, DynamoTable, StandardQueue, DLQ, SnsTopic, NodejsLambdaFunction } from 'layer3cdk';

// Centralized config from cdk.json context
const stackConfig = BaseStackConfig.getInstance(app);
const config = stackConfig.createBaseConfig({
  serviceName: 'taco-processor',
  stackName: 'taco-processor',
  tags: { 'Eng:Application': 'taco-processor' },
});

// DynamoDB table with production guardrails and alarms
const table = new DynamoTable(this, {
  config,
  tableName: 'Orders',
  dynamoProps: { default: { partitionKey: { name: 'pk', type: AttributeType.STRING } } },
});

// Dead-letter queue + event queue with alarms
const dlq = new DLQ(this, config);
const queue = new StandardQueue(this, { config, eventName: 'OrderCreated', dlq: dlq.getDlq() });

// SNS topic
const topic = new SnsTopic(this, { config, eventName: 'OrderCreated' });

// Lambda with esbuild bundling
const fn = new NodejsLambdaFunction(this, {
  config,
  functionName: 'process-order',
  entry: path.join(__dirname, 'handlers/process-order.ts'),
});
```

---

## Why Layer3CDK?

| Problem | Layer3CDK Solution |
|---|---|
| Every team names resources differently | Standardized naming conventions for every resource type |
| Alarms are forgotten or inconsistent | Built-in CloudWatch alarms with sensible defaults |
| Dev/prod configs drift apart | `BaseEnvProps<T>` lets you declare per-environment overrides with a required `default` fallback |
| Constructors with 5+ positional params are error-prone | Every construct uses a single **props object** with full IDE autocomplete |
| IAM policies are too broad or too narrow | Typed grant methods (`grantPolicies`, `addPermissions`, `grantReadOnlyPolicies`) |
| Production resources lack safeguards | Automatic validation (e.g., DynamoDB deletion protection and PITR in prod) |
| Tags are inconsistent across stacks | `DEFAULT_TAGS` with auto-set `Eng:Env` and `Eng:ManagedBy` |

---

## Quick Start

### Prerequisites

- Node.js >= 20
- AWS CDK v2 (`aws-cdk-lib` ^2.245.0)

### Installation

```bash
npm install layer3cdk
```

> `aws-cdk-lib` and `constructs` are **peer dependencies** -- install them separately if you haven't already.

### Configuration

Add the `layer3cdk` context to your `cdk.json` for centralized team and department config:

```json
{
  "context": {
    "layer3cdk": {
      "team": "Layer3",
      "department": "pltf"
    }
  }
}
```

This is picked up by `BaseStackConfig.getInstance(app)` and flows into every `createBaseConfig()` call.

### Your First Stack

```typescript
import { App } from 'aws-cdk-lib';
import { BaseStackConfig, BaseStack, DLQ, StandardQueue, SnsTopic, ServiceAccountRole } from 'layer3cdk';

const app = new App();
const stackConfig = BaseStackConfig.getInstance(app);

const config = stackConfig.createBaseConfig({
  serviceName: 'my-service',
  stackName: 'my-service',
  tags: { 'Eng:Application': 'my-service' },
});

// IAM role for your Kubernetes service account
const serviceAccount = new ServiceAccountRole(stack, {
  config,
  oidcProviderArns: { dev: 'arn:aws:iam::oidc-provider/...', stg: '...', prd: '...' },
});

// Dead-letter queue
const dlq = new DLQ(stack, config);

// Event queue with built-in stale-message and depth alarms
const queue = new StandardQueue(stack, {
  config,
  eventName: 'TaskCreated',
  dlq: dlq.getDlq(),
});

// SNS topic with notification-failure alarm
const topic = new SnsTopic(stack, { config, eventName: 'TaskCreated' });

// Wire everything together
topic.grantPolicies(serviceAccount.getRole());
queue.subscribeFromSNSTopicArn(topic.getArn());
queue.grantPolicies(serviceAccount.getRole());
```

---

## Constructs

| Module | Constructs | Description |
|---|---|---|
| **SQS** | `DLQ`, `DLQFifo`, `StandardQueue/Fifo`, `BackgroundTasksQueue/Fifo`, `FaninQueue/Fifo` | Event-driven queues with DLQs, alarms, and fan-in support |
| **SNS** | `SnsTopic`, `SnsTopicFifo` | Event topics with notification-failure alarms |
| **DynamoDB** | `DynamoTable` | Tables with capacity alarms, throttle detection, and prod validation |
| **Redis** | `RedisReplicationGroup` | ElastiCache with enforced encryption and subnet management |
| **ECR** | `ApplicationRepository` | Environment-aware container repositories |
| **Lambda** | `LambdaFunction`, `NodejsLambdaFunction` | Lambda with env defaults, alarms (errors/duration/throttles), and `addPermissions()`. `NodejsLambdaFunction` adds automatic esbuild bundling for TypeScript |
| **ECS** | `EcsCluster`, `EcsFargateService` | Fargate services with env defaults, alarms (CPU/memory/task count), auto-scaling, Cloud Map service discovery |
| **IAM** | `ServiceAccountRole` | EKS OIDC-federated service account roles |
| **SSM** | `GlobalSSMStringParameter`, `DepartmentSSMStringParameter`, `ServiceSSMStringParameter` | Scoped parameter store entries (global, department, service) |
| **Secrets** | `GlobalSecrets` | Secrets Manager secrets |
| **Static Site S3** | `SSS3` | S3 + CloudFront + ACM + Route 53 + optional WAF + API proxying for static sites and SPAs |
| **Alarms** | `ChatbotSlackChannnel`, `OpsGenie`, `AlarmSnsAction` | Alarm routing to Slack, OpsGenie, or any SNS topic |
| **Config** | `EksClusterConfig` | EKS cluster OIDC and namespace configuration |

---

## Core Concepts

### Props-Based API

Every construct takes `(scope, props)` where `props` is a typed interface extending `BaseConstructProps`. This gives you full IDE autocomplete:

```typescript
const queue = new StandardQueue(this, {
  config,          // BaseConfig -- required by all constructs
  eventName: 'OrderCreated',
  dlq: dlq.getDlq(),
  queueProps: {},  // optional CDK-level overrides
});
```

### Environment-Aware Configuration

Define different settings per environment using `BaseEnvProps<T>`. Only override what differs -- `default` is always the fallback:

```typescript
const dynamoConfig: BaseEnvProps<DynamoConfig> = {
  default: { alarmReadThreshold: 20, alarmWriteThreshold: 20 },
  prd: {
    billing: Billing.onDemand(),
    alarmReadThreshold: 100,
    alarmWriteThreshold: 100,
    pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    deletionProtection: true,
  },
};
```

Lambda and ECS accept `BaseEnvProps<Partial<Config>>` so you only specify the fields you want to change:

```typescript
new NodejsLambdaFunction(this, {
  config,
  functionName: 'process-order',
  entry: path.join(__dirname, 'handlers/process-order.ts'),
  lambdaConfig: {
    default: { memorySize: 512 },
    prd: { memorySize: 1024 },
  },
});
```

### Tags

Tags use PascalCase colon-namespaced convention. Default tag keys are shipped via `DEFAULT_TAGS`:

| Tag | Auto-set | Description |
|-----|----------|-------------|
| `Eng:Env` | Yes | From `stackEnv`, always wins |
| `Eng:ManagedBy` | Yes | Always `'cdk'` |
| `Ownership:Department` | No | Business unit |
| `Ownership:Organization` | No | Org domain |
| `Ownership:Team` | No | Team name |
| `Eng:Application` | No | Application name |
| `Eng:Repository` | No | Source repo |

Users can extend (add keys) or override (strip all defaults) via the `tags` section in `layer3cdk` context:

```json
{ "tags": { "mode": "extend", "values": { "Ownership:CostCenter": "CC-1234" } } }
```

### Standardized Naming

All resources follow predictable naming conventions:

```
Queue:      dev-st-TacoProcessor-OrderCreated
DLQ:        dev-dlq-TacoProcessor
Topic:      dev-OrderCreated
Table:      dev-TacoProcessor-Orders
Lambda:     dev-TacoProcessor-ProcessOrder
LogGroup:   /aws/lambda/dev-TacoProcessor-ProcessOrder
ECS Svc:    dev-NachoAgency-IngredientApi
ECS Logs:   /ecs/dev-NachoAgency-IngredientApi
Redis:      dev-pltf-TacoProcessor
SSM:        /dev/global/api-base-url
S3:         dev-churro-dashboard-churro-dashboard-assets
Role:       my-service-eks-service-account-dev
```

### Built-In Alarms

Constructs ship with CloudWatch alarms that reflect real operational concerns:

| Construct | Alarms |
|-----------|--------|
| **SQS** | Stale messages, queue depth |
| **SNS** | Notification failures |
| **DynamoDB** | Consumed read/write capacity, throttled requests |
| **DLQ** | Any message landing in the dead-letter queue |
| **Lambda** | Errors, duration, throttles |
| **ECS Fargate** | CPU utilization, memory utilization, running task count |

Pass an alarm action (Slack, OpsGenie, or any SNS action) to wire notifications:

```typescript
queue.setCloudWatchAlarms(alarmAction);
table.setCloudWatchAlarms(alarmAction);
lambdaFn.setCloudWatchAlarms(alarmAction);
ecsService.setCloudWatchAlarms(alarmAction);
```

You can also define fully custom alarms on any construct:

```typescript
dlq.setCustomAlarms(
  (resource, resourceName) => ({
    metric: resource.metricApproximateNumberOfMessagesVisible({ period: Duration.minutes(1) }),
    threshold: 500,
    alarmName: `${resourceName} High Backlog`,
    evaluationPeriods: 3,
    comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    treatMissingData: TreatMissingData.IGNORE,
  }),
  'high-backlog',
  alarmAction,
);
```

---

## Documentation

Detailed guides for each module:

| Document | Topics |
|---|---|
| [Core](./docs/core.md) | `BaseConstruct`, `BaseConfig`, `BaseStackConfig`, `BaseEnvProps`, naming, environment resolution, tags |
| [SQS](./docs/sqs.md) | Dead-letter queues, standard/background/fan-in queues, FIFO variants, subscriptions |
| [SNS](./docs/sns.md) | Event topics, FIFO topics |
| [DynamoDB](./docs/dynamo.md) | Table configuration, `DynamoProps` vs `DynamoConfig`, production validations |
| [Redis](./docs/redis.md) | Replication groups, encryption, subnet management |
| [ECR](./docs/ecr.md) | Application repositories, environment-aware creation |
| [Lambda](./docs/lambda.md) | `LambdaFunction` vs `NodejsLambdaFunction`, code callback pattern, esbuild bundling, alarms |
| [ECS Fargate](./docs/ecs.md) | Cluster, Fargate services, auto-scaling, Cloud Map, task/execution roles, multi-service patterns |
| [IAM](./docs/iam.md) | Service account roles, EKS OIDC federation |
| [SSM](./docs/ssm.md) | Global, department, and service-scoped parameters |
| [Secrets](./docs/secrets.md) | Secrets Manager secrets |
| [Static Site S3](./docs/static-site-s3.md) | S3 + CloudFront + ACM + Route 53, SPA support, API proxying, WAF integration |
| [Alarms](./docs/alarms.md) | Slack (Chatbot), OpsGenie, SNS action imports |
| [Config](./docs/config.md) | EKS cluster configuration |

---

## Example Project

The [`example/services/`](./example/services/) directory contains a full reference implementation demonstrating every construct in the library. It models a "Taco Shop" domain with 6 stacks:

- **TacoAlarmHub** — Chatbot + OpsGenie + AlarmSnsAction
- **TacoProcessor** — DynamoDB, Redis, SQS (standard + background tasks), Lambda (NodejsFunction), SSM, Secrets, ECR
- **NachoAgency** — ECS Fargate (cluster + 2 services with Cloud Map), SNS (standard + FIFO), ECR
- **SalsaNotifier** — SQS (standard + FIFO + fan-in), DLQFifo, SSM (department), ECR
- **GuacWarehouse** — Lambda (generic with Code.fromAsset), SQS with S3 event policy, SNS, ECR
- **ChurroDashboard** — SSS3 (S3 + CloudFront + ACM + Route 53)

See the [example README](./example/services/README.md) for the full resource breakdown with verified CloudFormation resource names from `cdk synth`.

---

## Project Structure

```
src/
  core/                          # Foundation: BaseConstruct, BaseConfig, BaseStackConfig, naming, env resolution, tags
  sqs/                           # SQS constructs (DLQ, Standard, BackgroundTasks, Fanin)
  sns/                           # SNS constructs (SnsTopic, SnsTopicFifo)
  dynamo/                        # DynamoDB construct
  redis/                         # ElastiCache Redis construct
  ecr/                           # ECR repository construct
  lambda/                        # Lambda constructs (LambdaFunction, NodejsLambdaFunction)
  ecs/                           # ECS constructs (EcsCluster, EcsFargateService)
  iam/                           # IAM service account role construct
  ssm/                           # SSM parameter constructs
  secrets/                       # Secrets Manager construct
  alarms/                        # Alarm routing (Slack, OpsGenie, SNS)
  config/                        # EKS cluster configuration
  static-site-s3/                # SSS3: S3 + CloudFront + ACM + Route 53 + WAF
  index.ts                       # Flat re-exports everything
example/
  services/                      # Full reference implementation (Taco Shop)
```

Each module follows a consistent file pattern:

```
*.construct.ts                   # Construct implementation
*.construct.props.ts             # Props interfaces (exported)
*.construct.spec.ts              # Tests
*.name.conventions.ts            # Naming functions
*.default.props.ts               # Library-provided env defaults (where applicable)
index.ts                         # Barrel exports
```

---

## Development

```bash
npm install          # Install dependencies
npm run build        # TypeScript compilation (tsc -> dist/)
npm run test         # Run tests (314 tests across 38 suites)
npm run test:cov     # Run tests with coverage (thresholds: 75/75/60/75)
npm run lint         # ESLint check
npm run lint:fix     # ESLint + Prettier auto-fix
```

### Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint. The Husky pre-commit hook runs formatting and linting automatically.

```
feat: add new construct for X
fix: correct alarm threshold in DynamoTable
refactor: simplify BaseEnvProps resolution
```

## Contributing

1. Clone the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Write your construct following the [module pattern](#project-structure)
4. Add tests (coverage thresholds: 75% statements, 75% branches, 60% functions, 75% lines)
5. Update the example project (`example/services/`) if adding new constructs
6. Submit a pull request

## License

[MIT](./LICENSE) - Eduardo Portella
