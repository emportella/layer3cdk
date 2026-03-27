# Layer3CDK

[![Integration](https://github.com/emportella/layer3cdk/actions/workflows/integration.yml/badge.svg)](https://github.com/emportella/layer3cdk/actions/workflows/integration.yml)
[![npm version](https://img.shields.io/npm/v/layer3cdk.svg)](https://www.npmjs.com/package/layer3cdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**Production-ready AWS CDK L3 constructs that eliminate boilerplate and enforce best practices.**

Layer3CDK sits on top of [AWS CDK](https://aws.amazon.com/cdk/) and provides high-level, opinionated constructs for the services teams use every day -- SQS, SNS, DynamoDB, ElastiCache Redis, ECR, SSM, Secrets Manager, IAM, and CloudWatch Alarms. Instead of wiring up 50+ lines of CDK per resource, you write one construct call with a props object and get consistent naming, tagging, alarms, IAM grants, and environment-aware configuration out of the box.

```typescript
import { BaseConfig, DynamoTable, EDAStandardQueue, DLQ, EDASns } from 'layer3cdk';

const config = new BaseConfig({
  domain: 'rpj',
  env: { account: '123456789012', region: 'us-east-1' },
  stackName: 'rpj-tasks',
  tags: { /* ... */ },
  stackEnv: 'prod',
  serviceName: 'rp-tasks',
});

// DynamoDB table with production guardrails and alarms
const table = new DynamoTable(this, {
  config,
  tableName: 'Orders',
  dynamoProps: { default: { partitionKey: { name: 'pk', type: AttributeType.STRING } } },
});

// Dead-letter queue + event queue with alarms
const dlq = new DLQ(this, config);
const queue = new EDAStandardQueue(this, {
  config,
  eventName: 'OrderCreated',
  dlq: dlq.getDlq(),
});

// SNS topic
const topic = new EDASns(this, { config, eventName: 'OrderCreated' });
```

---

## Why Layer3CDK?

| Problem | Layer3CDK Solution |
|---|---|
| Every team names resources differently | Standardized naming conventions for every resource type |
| Alarms are forgotten or inconsistent | Built-in CloudWatch alarms with sensible defaults |
| Dev/prod configs drift apart | `BaseEnvProps<T>` lets you declare per-environment overrides with a required `default` fallback |
| Constructors with 5+ positional params are error-prone | Every construct uses a single **props object** with full IDE autocomplete |
| IAM policies are too broad or too narrow | Typed grant methods (`grantPolicies`, `grantReadOnlyPolicies`, `grantCustomPolicies`) |
| Production resources lack safeguards | Automatic validation (e.g., DynamoDB deletion protection and PITR in prod) |

---

## Quick Start

### Prerequisites

- Node.js >= 20
- AWS CDK v2 (`aws-cdk-lib` ^2.100.0)

### Installation

```bash
npm install layer3cdk
```

> `aws-cdk-lib` and `constructs` are **peer dependencies** -- install them separately if you haven't already.

### Your First Stack

```typescript
import { Stack, App } from 'aws-cdk-lib';
import { BaseConfig, DLQ, EDAStandardQueue, EDASns, ServiceAccountRole } from 'layer3cdk';

const app = new App();
const stack = new Stack(app, 'MyServiceStack');

const config = new BaseConfig({
  domain: 'rpj',
  env: { account: '123456789012', region: 'us-east-1' },
  stackName: 'rpj-my-service',
  tags: {
    'tag:tagSchemaVersion': '0.1',
    'tag:env': 'dev',
    'tag:ownership:department': 'productDevelopment',
    'tag:ownership:team': 'myTeam',
  },
  stackEnv: 'dev',
  serviceName: 'my-service',
});

// IAM role for your Kubernetes service account
const serviceAccount = new ServiceAccountRole(stack, {
  config,
  oidcProviderArns: { dev: 'arn:aws:iam::oidc-provider/...', /* ... */ },
});

// Dead-letter queue
const dlq = new DLQ(stack, config);

// Event queue with built-in stale-message and depth alarms
const queue = new EDAStandardQueue(stack, {
  config,
  eventName: 'TaskCreated',
  dlq: dlq.getDlq(),
});

// SNS topic with notification-failure alarm
const topic = new EDASns(stack, { config, eventName: 'TaskCreated' });

// Wire everything together
topic.grantPolicies(serviceAccount.getRole());
queue.subscribeFromSNSTopicArn(topic.getArn());
queue.grantPolicies(serviceAccount.getRole());
```

---

## Constructs

| Module | Constructs | Description |
|---|---|---|
| **SQS** | `DLQ`, `DLQFifo`, `EDAStandardQueue/Fifo`, `EDABackgroundTasksQueue/Fifo`, `EDAFaninQueue/Fifo` | Event-driven queues with DLQs, alarms, and fan-in support |
| **SNS** | `EDASns`, `EDASnsFifo` | Event topics with notification-failure alarms |
| **DynamoDB** | `DynamoTable` | Tables with capacity alarms, throttle detection, and prod validation |
| **Redis** | `RedisReplicationGroup` | ElastiCache with enforced encryption and subnet management |
| **ECR** | `ApplicationRepository` | Environment-aware container repositories |
| **IAM** | `ServiceAccountRole` | EKS OIDC-federated service account roles |
| **SSM** | `GlobalSSMStringParameter`, `DomainSSMStringParameter`, `ServiceSSMStringParameter` | Scoped parameter store entries (global, domain, service) |
| **Secrets** | `GlobalSecrets` | Secrets Manager secrets with IAM grants |
| **Static Site S3** | `SSS3` | S3 + CloudFront + ACM + Route 53 + optional WAF + API proxying for static sites and SPAs |
| **Alarms** | `ChatbotSlackChannnel`, `OpsGenie`, `AlarmSnsAction` | Alarm routing to Slack, OpsGenie, or any SNS topic |
| **Config** | `EksClusterConfig` | EKS cluster OIDC and namespace configuration |

---

## Core Concepts

### Props-Based API

Every construct takes `(scope, props)` where `props` is a typed interface extending `BaseConstructProps`. This gives you full IDE autocomplete -- type `{` and see every available option:

```typescript
// All props interfaces are exported from the package
import { EDAQueueProps } from 'layer3cdk';

// EDAQueueProps extends BaseConstructProps, which carries `config`
const queue = new EDAStandardQueue(this, {
  config,          // BaseConfig -- required by all constructs
  eventName: 'OrderCreated',
  dlq: dlq.getDlq(),
  queueProps: {},  // optional CDK-level overrides
});
```

Props interfaces live in dedicated `*.construct.props.ts` files, one per module -- all flat-exported from the package.

### Environment-Aware Configuration

Define different settings per environment using `BaseEnvProps<T>`. Only override what differs -- `default` is always the fallback:

```typescript
import { BaseEnvProps } from 'layer3cdk';
import { DynamoConfig } from 'layer3cdk';

const dynamoConfig: BaseEnvProps<DynamoConfig> = {
  default: {
    alarmReadThreshold: 20,
    alarmWriteThreshold: 20,
  },
  prod: {
    billing: Billing.onDemand(),
    alarmReadThreshold: 100,
    alarmWriteThreshold: 100,
    pointInTimeRecovery: true,
    deletionProtection: true,
  },
};
```

The library resolves the right config for the current environment using `resolveEnvProps()`, `resolveWithOverrides()`, and `resolveAndMergeEnvProps()`. Modules like DynamoDB and Redis ship their own `BaseEnvProps` defaults that your overrides are deep-merged on top of.

### Standardized Naming

All resources follow predictable naming conventions derived from `config.stackEnv`, `config.serviceName`, and resource-specific identifiers:

```
Queue:  dev-st-RpTasks-OrderCreated
Topic:  dev-OrderCreated
Table:  dev-RpTasks-Orders
DLQ:    dev-dlq-RpTasks
Role:   rp-tasks-eks-service-account-dev
```

No more naming collisions or inconsistencies across teams.

### Built-In Alarms

Constructs ship with CloudWatch alarms that reflect real operational concerns:

- **SQS** -- stale messages, queue depth
- **SNS** -- notification failures
- **DynamoDB** -- consumed read/write capacity, throttled requests
- **DLQ** -- any message landing in the dead-letter queue

Pass an alarm action (Slack, OpsGenie, or any SNS action) to wire notifications:

```typescript
queue.setCloudWatchAlarms(alarmAction);
table.setCloudWatchAlarms(alarmAction);
```

You can also define fully custom alarms on any construct:

```typescript
queue.setCustomAlarms(
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
| [Core](./docs/core.md) | `BaseConstruct`, `BaseConfig`, `BaseEnvProps`, naming conventions, environment resolution |
| [SQS](./docs/sqs.md) | Dead-letter queues, standard/background/fan-in queues, FIFO variants, subscriptions |
| [SNS](./docs/sns.md) | Event topics, FIFO topics |
| [DynamoDB](./docs/dynamo.md) | Table configuration, `DynamoProps` vs `DynamoConfig`, production validations |
| [Redis](./docs/redis.md) | Replication groups, encryption, subnet management |
| [ECR](./docs/ecr.md) | Application repositories, environment-aware creation |
| [IAM](./docs/iam.md) | Service account roles, EKS OIDC federation |
| [SSM](./docs/ssm.md) | Global, domain, and service-scoped parameters |
| [Static Site S3](./docs/static-site-s3.md) | S3 + CloudFront + ACM + Route 53, SPA support, API proxying, WAF integration |
| [Alarms](./docs/alarms.md) | Slack (Chatbot), OpsGenie, SNS action imports |
| [Config](./docs/config.md) | EKS cluster configuration |

---

## Project Structure

```
src/
  core/                          # Foundation: BaseConstruct, BaseConfig, naming, env resolution
  sqs/                           # SQS constructs (DLQ, Standard, BackgroundTasks, Fanin)
  sns/                           # SNS constructs (EDASns, EDASnsFifo)
  dynamo/                        # DynamoDB construct
  redis/                         # ElastiCache Redis construct
  ecr/                           # ECR repository construct
  iam/                           # IAM service account role construct
  ssm/                           # SSM parameter constructs
  secrets/                       # Secrets Manager construct
  alarms/                        # Alarm routing (Slack, OpsGenie, SNS)
  config/                        # EKS cluster configuration
  static-site-s3/                # SSS3: S3 + CloudFront + ACM + Route 53 + WAF
  index.ts                       # Flat re-exports everything
docs/                            # Detailed module documentation
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
npm run test         # Run tests
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

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Write your construct following the [module pattern](#project-structure)
4. Add tests (coverage thresholds: 75% statements, 75% branches, 60% functions, 75% lines)
5. Submit a pull request

Check the [Contributing Guide](./CONTRIBUTING.md) for more details.

## Change Log

See [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT](./LICENSE) - Eduardo Portella
