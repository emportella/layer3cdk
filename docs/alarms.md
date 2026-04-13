# Alarms Package

Constructs that turn CloudWatch alarms into actionable notifications. Two delivery channels are supported out of the box: AWS Chatbot → Slack, and OpsGenie via an SNS → HTTP subscription. Both produce an `IAlarmAction` that any Layer3CDK construct can consume via `setCloudWatchAlarms(...)`.

## ChatbotSlackChannnel

Creates the resources needed to forward CloudWatch alarms to a Slack channel through AWS Chatbot:

- An SNS topic for alarm notifications.
- An AWS Chatbot Slack channel configuration.
- An IAM role assumed by Chatbot with `CloudWatchReadOnlyAccess` and `AmazonSNSReadOnlyAccess` managed policies.

> The initial Slack ↔ AWS Chatbot workspace handshake must be done **manually** in the AWS Chatbot console before this construct can be used — CDK does not support that step.

### Usage

```typescript
import { ChatbotSlackChannnel, ChatbotSlackChannelIds } from 'layer3cdk';

const slackChannelIds: ChatbotSlackChannelIds = {
  dev: 'C01234ABCDE',
  stg: 'C01234FGHIJ',
  prd: 'C01234KLMNO',
};

const chatbot = new ChatbotSlackChannnel(this, {
  config,
  slackChannelIds,
  slackWorkspaceId: 'T01234ABCDE',
});

const snsAction = chatbot.getSnsAction();    // IAlarmAction
chatbot.outputSNSTopicArn();                  // CloudFormation export for other stacks

// Pass the action to any construct that exposes setCloudWatchAlarms
queue.setCloudWatchAlarms(snsAction);
service.setCloudWatchAlarms(snsAction);
```

Use one Slack channel per environment (e.g. `#alarms-dev-orders`, `#alarms-prd-orders`). The channel ID comes from Slack's right-click → Copy Link — it is the string at the end of the URL. For private channels, `/invite @AWS` in Slack to invite the Chatbot before deploying.

### Generated Resource Names

| Resource | Name |
|---|---|
| SNS topic | `<env>-<department>-alarm-action` |
| Slack channel configuration | `<env>-<department>-chatBot-slack-alarm` |
| Chatbot IAM role | `<env>-<department>-chatbot-role` |

## OpsGenie

Creates an SNS topic subscribed to the OpsGenie HTTPS ingestion endpoint. No extra IAM or integration is required — OpsGenie treats SNS as a generic webhook source.

```typescript
import { OpsGenie, OpsGenieApiKeys } from 'layer3cdk';

const apiKeys: OpsGenieApiKeys = {
  dev: '<dev-opsgenie-api-key>',
  stg: '<stg-opsgenie-api-key>',
  prd: '<prd-opsgenie-api-key>',
};

const opsgenie = new OpsGenie(this, { config, apiKeys });
const opsGenieAction = opsgenie.getSnsAction();

service.setCloudWatchAlarms(opsGenieAction);
```

### Generated Resource Names

| Resource | Name |
|---|---|
| SNS topic | `<env>-<department>-alarm-action-opsGenie` |

## AlarmSnsAction

Imports pre-existing SNS topic ARNs and turns them into `SnsAction` objects indexed by channel. Use this when your alarm topics are owned by a different stack (or provisioned outside CDK) and you just want to wire them into constructs in the current stack.

```typescript
import AlarmSnsAction from 'layer3cdk/alarms';

const actions = new AlarmSnsAction(this, {
  config,
  snsArns: {
    slack:    'arn:aws:sns:us-east-1:123456789012:slackTopic',
    opsGenie: 'arn:aws:sns:us-east-1:123456789012:opsGenieTopic',
  },
});

service.setCloudWatchAlarms(actions.getSnsAction('slack'));
queue.setCloudWatchAlarms(actions.getSnsAction('opsGenie'));
```

`AlarmActionType` values: `'slack' | 'opsGenie' | 'googleChat'` (`googleChat` is reserved — not currently supported).

## Pattern: Multiple Action Types

`setCloudWatchAlarms(...actions)` accepts any number of `IAlarmAction` values. Combine channels per severity:

```typescript
service.setCloudWatchAlarms(opsGenieAction, slackAction); // page + notify
queue.setCloudWatchAlarms(slackAction);                    // notify only
```

## Public API

### ChatbotSlackChannnel

| Method | Description |
|---|---|
| `getSnsAction()` | `IAlarmAction` for `setCloudWatchAlarms` |
| `outputSNSTopicArn()` | Export the SNS topic ARN as a CloudFormation output |
| `getArn()` | Slack channel configuration ARN |
| `addPolicyStatements(...stmts)` | Append statements to the Chatbot role |

### OpsGenie

| Method | Description |
|---|---|
| `getSnsAction()` | `SnsAction` for `setCloudWatchAlarms` |
| `outputArn()` | Export the SNS topic ARN |
| `resourceRemovalPolicy(policy)` | `RETAIN` or `DESTROY` on the SNS topic |

### AlarmSnsAction

| Method | Description |
|---|---|
| `getSnsAction(type)` | `SnsAction` for the given `AlarmActionType` |
| `getSnsActions()` | All `SnsAction` objects as an array |
| `getMapSnsActions()` | `Map<string, SnsAction>` keyed by action type |
| `getArns()` | ARNs of all imported topics |
