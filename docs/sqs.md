# SQS Package

Constructs for building event-driven and background-task workflows on SQS, with sensible defaults, built-in CloudWatch alarms, SNS subscription helpers, and FIFO variants.

## Overview

| Construct | Purpose | Default permissions granted to the service role |
|---|---|---|
| `DLQ` / `DLQFifo` | Dead-letter queue (14-day retention) | — |
| `StandardQueue` / `StandardQueueFifo` | Event-driven consumer queue | consume only |
| `BackgroundTasksQueue` / `BackgroundTasksQueueFifo` | Self-service async work queue | consume + send |
| `FaninQueue` / `FaninQueueFifo` | Cross-service aggregation queue | consume only; remote producers opt in via `grantFaninPublishing` |

All queue constructs inherit from a common base and share the same alarm and SNS-subscription API.

## DLQ

A dead-letter queue receives messages that consumers fail to process. Every event-driven queue requires one.

```typescript
import { DLQ } from 'layer3cdk';

const dlq = new DLQ(scope, config);
dlq.setCloudWatchAlarms(snsAction); // alarm fires when any message lands in the DLQ
```

The alarm fires on the first visible message (`metricApproximateNumberOfMessagesVisible >= 1`) with a 1-minute evaluation period.

### FIFO DLQ

FIFO queues require a FIFO DLQ. `DLQFifo` can be shared across all FIFO queues in a service or scoped to a single event:

```typescript
import { DLQFifo } from 'layer3cdk';

// Shared FIFO DLQ for the whole service
const sharedDlq = new DLQFifo(scope, { config });

// Event-specific FIFO DLQ
const orderCreatedDlq = new DLQFifo(scope, { config, eventName: 'OrderCreated' });
```

Wire the DLQ into a queue construct via `dlq.getDlq(maxReceiveCount?)` (default `maxReceiveCount = 20`).

## StandardQueue

A plain SQS queue intended as an event-driven consumer. The owning service is granted **consume-only** permissions by default — the producer is expected to be a different service publishing via SNS.

```typescript
import { StandardQueue } from 'layer3cdk';

const orderCreated = new StandardQueue(scope, {
  config,
  eventName: 'OrderCreated',
  dlq: dlq.getDlq(),
});

orderCreated.setCloudWatchAlarms(snsAction);
orderCreated.grantConsumeMessages(serviceAccountRole);

// Subscribe via ARN created in the same stack
orderCreated.subscribeFromSNSTopicArn('arn:aws:sns:...:OrderEvents');

// Or via a CloudFormation export from another stack
orderCreated.subscribeFromSNSTopicImport('<exported-topic-arn-name>');
```

Two alarms are created by `setCloudWatchAlarms`:

| Alarm | Metric | Threshold | Evaluation |
|---|---|---|---|
| Stale messages | Oldest message age (max) | ≥ 60 seconds | 2 × 2 min |
| Backlog depth | Messages visible (max) | ≥ 100 | 2 × 2 min |

## BackgroundTasksQueue

For asynchronous work where the producer and consumer are the **same** service. The owning role is granted both `sqs:SendMessage` and `sqs:ReceiveMessage` via `grantPolicies`.

Use `StandardQueue` instead when producers live in other services.

```typescript
import { BackgroundTasksQueue } from 'layer3cdk';

const reindex = new BackgroundTasksQueue(scope, {
  config,
  eventName: 'ReindexDocument',
  dlq: dlq.getDlq(),
});

reindex.setCloudWatchAlarms(snsAction);
reindex.grantPolicies(serviceAccountRole);
```

## FaninQueue

A consumer-owned queue that many producing services publish into. The consumer creates the queue and owns the message contract; producers opt in via `grantFaninPublishing`, which adds an inline IAM statement to the producer's role.

```typescript
import { FaninQueue, grantFaninPublishing } from 'layer3cdk';

// Consumer side
const sendNotification = new FaninQueue(scope, {
  config,
  eventName: 'SendNotification',
  dlq: dlq.getDlq(),
});
sendNotification.grantPolicies(serviceAccountRole);

// Producer side (in another stack / service)
grantFaninPublishing({
  role: producerRole,
  faninQueues: [
    { eventName: 'SendNotification', serviceName: 'notifier' },
  ],
  region: config.env.region!,
  accountId: config.env.account!,
  env: config.stackEnv,
});
```

The consumer owns the message schema; producers must publish messages that conform to it. If producers need delivery confirmation, either expose a status lookup endpoint keyed by a producer-generated ID, or publish a completion event on an SNS topic that producers can subscribe to.

## FIFO Variants

Every queue construct ships a `*Fifo` variant: `StandardQueueFifo`, `BackgroundTasksQueueFifo`, `FaninQueueFifo`. FIFO queues:

- Have a `.fifo` suffix on the AWS queue name (required).
- Enable `contentBasedDeduplication` by default. You may also provide an explicit `MessageDeduplicationId` per message — preferable when message bodies can repeat intentionally.
- Require a FIFO DLQ (`DLQFifo`). Construction fails validation otherwise.
- Support `DeduplicationScope` and `FifoThroughputLimit` through the `queueProps` override if you need high-throughput mode.

See [FIFO queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html) and [exactly-once processing](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html) for the AWS-side constraints.

## SNS Subscriptions

All queue constructs expose three subscription helpers:

| Method | Use when |
|---|---|
| `subscribeFromSNSTopicArn(arn)` | Simple subscription, no filters |
| `subscribeFromSnsTopicArnWithProps(arn, props)` | Pass through CDK `SqsSubscriptionProps` |
| `subscribeFromSNSTopicImport(exportName, props?)` | Import a topic ARN from another stack's CloudFormation export |
| `subscribeWithCfnSubscription({ arn, filterPolicyScope, filterPolicy })` | Complex [filter policies](https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html) scoped to `MessageBody` or `MessageAttributes` |

## Escape Hatch

`getQueue()` returns the underlying CDK `Queue` for integrations not covered by the Layer3CDK API:

```typescript
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

lambdaFn.getFunction().addEventSource(new SqsEventSource(queue.getQueue()));
```

## Public API

| Method | Description |
|---|---|
| `getQueue()` | Underlying CDK `Queue` |
| `getArn()` | Queue ARN |
| `outputArn()` | Export the ARN as a CloudFormation output |
| `setCloudWatchAlarms(...actions)` | Creates the stale-message and backlog alarms |
| `grantPolicies(role)` | Construct-specific permission grant |
| `grantConsumeMessages(role)` | Grant consume (on `StandardQueue`) |
| `addPolicyStatements(...statements)` | Append to the queue's resource policy |
| `resourceRemovalPolicy(policy)` | `RETAIN` or `DESTROY` |
| `subscribeFromSNSTopicArn(arn)` | Simple SNS subscription |
| `subscribeFromSnsTopicArnWithProps(arn, props)` | SNS subscription with CDK props |
| `subscribeFromSNSTopicImport(exportName, props?)` | SNS subscription via CFN import |
| `subscribeWithCfnSubscription(props)` | SNS subscription with filter policy |

DLQ-specific:

| Method | Description |
|---|---|
| `getDlq(maxReceiveCount?)` | Returns a `DeadLetterQueue` to wire into a queue construct (default 20) |
