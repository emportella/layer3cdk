# Taco Shop CDK

Example project demonstrating how to use [Layer3CDK](../../README.md) to define multiple service stacks for a domain.

## Architecture

```
TacoAlarmHub (alarm aggregation)
  |
  +-- TacoProcessorServiceStack    (event consumer, DynamoDB, Redis, Lambda, SSM, Secrets)
  +-- NachoAgencyServiceStack      (event publisher, ECS Fargate, Cloud Map)
  +-- SalsaNotifierServiceStack    (notification fan-in, FIFO queues, SSM)
  +-- GuacWarehouseServiceStack    (data warehouse ingestion, Lambda)
  +-- ChurroDashboardStack         (S3 static site + CloudFront)
```

All service stacks depend on the alarm hub for centralized CloudWatch alarm actions (Slack via Chatbot + OpsGenie).

## Stacks

### TacoAlarmHub (`taco-alarm-hub`)

Centralized alarm infrastructure for the domain.

| Resource | Type | Name |
|----------|------|------|
| Chatbot Slack channel | `AWS::Chatbot::SlackChannelConfiguration` | `dev-pltf-chatBot-slack-alarm` |
| OpsGenie SNS topic | `AWS::SNS::Topic` | `dev-pltf-alarm-action-opsGenie` |
| Alarm SNS action | `AlarmSnsAction` | Wraps OpsGenie topic ARN for reuse |
| Chatbot IAM role | `AWS::IAM::Role` | `dev-pltf-chatbot-role` |

Exposes `getAlarmActions()` which all other stacks consume to wire their alarms.

### TacoProcessorServiceStack (`taco-processor`)

Event-driven service that processes incoming orders and state changes. Demonstrates the widest variety of constructs.

| Resource | Type | Name |
|----------|------|------|
| ECR repository | `AWS::ECR::Repository` | `dev/pltf-taco-processor-service` |
| IAM service account | `AWS::IAM::Role` | EKS OIDC-federated |
| DLQ | `AWS::SQS::Queue` | `dev-dlq-TacoProcessor` |
| SQS: OrderPlaced | `AWS::SQS::Queue` | `dev-st-TacoProcessor-OrderPlaced` |
| SQS: RecipeUpdated | `AWS::SQS::Queue` | `dev-st-TacoProcessor-RecipeUpdated` |
| SQS: TacoScoreChanged | `AWS::SQS::Queue` | `dev-st-TacoProcessor-TacoScoreChanged` |
| SQS: SauceStatusUpdated | `AWS::SQS::Queue` | `dev-st-TacoProcessor-SauceStatusUpdated` |
| SQS: BurritoSubmitted | `AWS::SQS::Queue` | `dev-st-TacoProcessor-BurritoSubmitted` |
| Background task queue | `AWS::SQS::Queue` | `dev-task-TacoProcessor-RecalculateTacoScore` |
| DynamoDB table | `AWS::DynamoDB::GlobalTable` | `dev-TacoProcessor-Orders` |
| Redis cluster | `AWS::ElastiCache::ReplicationGroup` | `dev-pltf-TacoProcessor` |
| SSM (global) | `AWS::SSM::Parameter` | `/dev/global/taco-api-base-url` |
| SSM (service) | `AWS::SSM::Parameter` | `/dev/taco-processor/max-concurrent-orders` |
| Secret | `AWS::SecretsManager::Secret` | `taco-db-credentials` |
| Lambda (NodejsFunction) | `AWS::Lambda::Function` | `dev-TacoProcessor-CalculateTacoScore` |
| Lambda LogGroup | `AWS::Logs::LogGroup` | `/aws/lambda/dev-TacoProcessor-CalculateTacoScore` |
| CloudWatch alarms | `AWS::CloudWatch::Alarm` | 19 alarms (DLQ, queues, DynamoDB, Lambda) |

### NachoAgencyServiceStack (`nacho-agency`)

Publishes ingredient state transfer events and runs containerized services on ECS Fargate.

| Resource | Type | Name |
|----------|------|------|
| ECR repository | `AWS::ECR::Repository` | `dev/pltf-nacho-agency-service` |
| IAM service account | `AWS::IAM::Role` | EKS OIDC-federated |
| SNS topic (standard) | `AWS::SNS::Topic` | `dev-IngredientStateTransfer` |
| SNS topic (FIFO) | `AWS::SNS::Topic` | `dev-OrderedIngredientUpdate.fifo` |
| ECS Cluster | `AWS::ECS::Cluster` | `dev-NachoAgency-Cluster` |
| Cloud Map namespace | `AWS::ServiceDiscovery::PrivateDnsNamespace` | `nacho-agency.local` |
| Fargate: API | `AWS::ECS::Service` | `dev-NachoAgency-IngredientApi` |
| Fargate: Worker | `AWS::ECS::Service` | `dev-NachoAgency-IngredientWorker` |
| Task definitions | `AWS::ECS::TaskDefinition` | `dev-NachoAgency-IngredientApi`, `dev-NachoAgency-IngredientWorker` |
| ECS LogGroups | `AWS::Logs::LogGroup` | `/ecs/dev-NachoAgency-IngredientApi`, `/ecs/dev-NachoAgency-IngredientWorker` |
| Auto-scaling (API) | `AWS::ApplicationAutoScaling::*` | CPU target tracking, min 1 / max 4 |
| CloudWatch alarms | `AWS::CloudWatch::Alarm` | 8 alarms (SNS, ECS CPU/memory/task count) |

### SalsaNotifierServiceStack (`salsa-notifier`)

Fan-in notification consumer with both standard and FIFO queue variants.

| Resource | Type | Name |
|----------|------|------|
| ECR repository | `AWS::ECR::Repository` | `dev/pltf-salsa-notifier-service` |
| IAM service account | `AWS::IAM::Role` | EKS OIDC-federated |
| DLQ (standard) | `AWS::SQS::Queue` | `dev-dlq-SalsaNotifier` |
| DLQ (FIFO) | `AWS::SQS::Queue` | `dev-dlq-SalsaNotifier.fifo` |
| SQS: OrderPlaced | `AWS::SQS::Queue` | `dev-st-SalsaNotifier-OrderPlaced` |
| Fan-in queue | `AWS::SQS::Queue` | `dev-fanin-SalsaNotifier-SendNotification` |
| FIFO queue | `AWS::SQS::Queue` | `dev-st-SalsaNotifier-OrderedNotificationDelivery.fifo` |
| SSM (department) | `AWS::SSM::Parameter` | `/dev/pltf/notification-sender-email` |
| CloudWatch alarms | `AWS::CloudWatch::Alarm` | 7 alarms (DLQ, queues) |

### GuacWarehouseServiceStack (`guac-warehouse`)

Data warehouse publisher that ingests files from S3 and publishes update events.

| Resource | Type | Name |
|----------|------|------|
| ECR repository | `AWS::ECR::Repository` | `dev/pltf-guac-warehouse-service` |
| IAM service account | `AWS::IAM::Role` | EKS OIDC-federated + S3 read |
| DLQ | `AWS::SQS::Queue` | `dev-dlq-GuacWarehouse` |
| SQS: SpicyRecipeFileCreated | `AWS::SQS::Queue` | `dev-st-GuacWarehouse-SpicyRecipeFileCreated` |
| SNS: RecipeUpdated | `AWS::SNS::Topic` | `dev-RecipeUpdated` |
| Lambda (generic) | `AWS::Lambda::Function` | `dev-GuacWarehouse-IngestRecipeFile` |
| Lambda LogGroup | `AWS::Logs::LogGroup` | `/aws/lambda/dev-GuacWarehouse-IngestRecipeFile` |
| CloudWatch alarms | `AWS::CloudWatch::Alarm` | 7 alarms (DLQ, queue, SNS, Lambda) |

### ChurroDashboardStack (`churro-dashboard`)

Static site dashboard hosted on S3 + CloudFront with custom domain.

| Resource | Type | Name |
|----------|------|------|
| S3 bucket | `AWS::S3::Bucket` | `dev-churro-dashboard-churro-dashboard-assets` |
| CloudFront distribution | `AWS::CloudFront::Distribution` | HTTPS redirect, security headers |
| ACM certificate | `AWS::CertificateManager::Certificate` | `dashboard.taco-shop.example.com` |
| Route 53 A record | `AWS::Route53::RecordSet` | `dashboard.taco-shop.example.com` |
| Route 53 AAAA record | `AWS::Route53::RecordSet` | `dashboard.taco-shop.example.com` |
| OAC | `AWS::CloudFront::OriginAccessControl` | S3 origin access |
| Response headers policy | `AWS::CloudFront::ResponseHeadersPolicy` | HSTS, X-Frame-Options, etc. |

## Layer3CDK Constructs Coverage

Every construct in the library is demonstrated in this example:

| Construct | Stack |
|-----------|-------|
| `BaseStack`, `BaseStackConfig`, `BaseConfig` | All stacks |
| `ChatbotSlackChannnel` | AlarmHub |
| `OpsGenie` | AlarmHub |
| `AlarmSnsAction` | AlarmHub |
| `ServiceAccountRole` | TacoProcessor, NachoAgency, SalsaNotifier, GuacWarehouse |
| `ApplicationRepository` (ECR) | TacoProcessor, NachoAgency, SalsaNotifier, GuacWarehouse |
| `DLQ` | TacoProcessor, SalsaNotifier, GuacWarehouse |
| `DLQFifo` | SalsaNotifier |
| `EDAStandardQueue` | TacoProcessor, SalsaNotifier, GuacWarehouse |
| `EDAStandardQueueFifo` | SalsaNotifier |
| `EDABackgroundTasksQueue` | TacoProcessor |
| `EDAFaninQueue` | SalsaNotifier |
| `grantFaninPublishing` | TacoProcessor |
| `EDASns` | NachoAgency, GuacWarehouse |
| `EDASnsFifo` | NachoAgency |
| `DynamoTable` | TacoProcessor |
| `RedisReplicationGroup` | TacoProcessor |
| `NodejsLambdaFunction` | TacoProcessor |
| `LambdaFunction` (generic) | GuacWarehouse |
| `EcsCluster` | NachoAgency |
| `EcsFargateService` | NachoAgency (x2: API + Worker) |
| `GlobalSSMStringParameter` | TacoProcessor |
| `ServiceSSMStringParameter` | TacoProcessor |
| `DepartmentSSMStringParameter` | SalsaNotifier |
| `GlobalSecrets` | TacoProcessor |
| `SSS3` (S3 + CloudFront) | ChurroDashboard |

## Configuration

Centralized config is defined in `cdk.json`:

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

This sets the team and department for all stacks via `BaseStackConfig`. Individual stacks use `createBaseConfig()` to generate their `BaseConfig` with standardized naming, tags, and environment resolution.

## Patterns Demonstrated

- **`BaseStackConfig.createBaseConfig()`** for clean config creation per stack
- **Domain-level default tags** extended per service via spread (`TACO_SHOP_DOMAIN_DEFAULT_TAGS`)
- **Alarm action propagation** from a central hub stack to all service stacks
- **`AlarmSnsAction`** for wrapping SNS topic ARNs into reusable alarm actions
- **Stack dependencies** (`addDependency`) ensuring alarm hub deploys first
- **Cross-account SNS subscription** via full ARN
- **Cross-stack SNS subscription** via CloudFormation output import
- **Fan-in queue pattern** with `grantFaninPublishing` for cross-service publishing
- **S3 → SQS event notification** with resource-based policy for cross-account access
- **ECR repository** per service with environment-aware prefixing
- **DynamoDB** with env-specific provisioned capacity and alarms
- **Redis** with cluster mode and multi-AZ in production
- **Lambda** — both generic (`LambdaFunction` with `Code.fromAsset`) and Node.js (`NodejsLambdaFunction` with esbuild bundling)
- **ECS Fargate** — shared cluster with multiple services, Cloud Map service discovery, auto-scaling
- **SSM parameters** at three scope levels: global, department, service
- **Secrets Manager** for sensitive credentials
- **Static site** (SSS3) with S3 + CloudFront + ACM + Route 53
- **FIFO variants** — `DLQFifo`, `EDAStandardQueueFifo`, `EDASnsFifo` for ordered processing
- **Background tasks queue** for async processing patterns

## Commands

```bash
npm run build                    # TypeScript compilation
npx cdk synth \
  -c account=123456789012 \
  -c env=dev \
  -c region=us-east-1           # Generate CloudFormation templates
npx cdk deploy --all            # Deploy all stacks
npx cdk diff                    # Preview changes
```
