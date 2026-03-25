# Core package

All common logic, naming conventions, Stack config, etc... should be built in this package.

## Common Constants

- `StackEnv` allowed environments for Layer3CDK ('dev', 'prod', 'perf', 'preprod');
- `AWSRegion` all AWS regions;
- `ResourceType` helper modifier for id generation;
- `Domain` all domains for Layer3CDK;
- `AlarmActionType` all integration types for alarms;

## Naming Conventions

   1. `stackName` method to standardize the stack name.
   2. `constructId` method to standardize the construct id.
   3. `alarmConstructId` method to standardize the alarm construct id. (Used for alarms within a construct)
   4. `arnExportName` method to standardize the export name for the resources.
      (Moved to iam/iam.name.conventions.ts) method to standardize the service account name.
   6. `serviceAccountRoleName` method to standardize the service account role name.
   7. `sqsDlqName` method to standardize the DLQ name.
   8. `snsTopicName` method to standardize the SNS topic name.
   9. `sqsQueueName` method to standardize the SQS queue name.
   10. `slackConfigName` method to standardize the Slack configuration name.
   11. `chatbotRoleName` method to standardize the ChatBot role name.
   12. `alarmTopicName` method to standardize the SNSAlarm action topic name.
   13. `awsArn` helper method to generate ARNs.
   14. `dynamoTableName` method to standardize the DynamoDB table name.

## BaseConfig

The BaseConfig class extends `StackProps` and it is used to store all the configurations for the stack. Its use is a requirement for all the stacks. The BaseConfig class has the following properties besides the ones from `StackProps`:
1. `env` - The environment where the stack is deployed.
2. `domain` - The domain name for the stack.
3. `serviceName` - The name of the service the stack is built for.
4. `BaseConfigExtended` - Type to extend the `BaseConfig` to pass extra variables to the stack.

```typescript
import { BaseConfigExtended } from 'layer3cdk/core';

export type BaseConfigWithDLQAndAlarmActions: BaseConfigExtended<{dlq: DLQ, alarmActions: AlarmActions}>;

const configWithDLQAndAlarmActions: BaseConfigWithDLQAndAlarmActions = {
  ...config,
  dlq: dlq,
  alarmActions: alarmActions
}

```

## BaseStackConfig

The `BaseStackConfig` is the base class for initializing CDK Projects. It is responsible for getting variables passed by the pipeline and dynamically updating `env`, `account` and, `region`.
- It is Singleton and can be accessed by the `BaseStackConfig.getInstance()` method.
- It gathers the variables from the (`app.node.tryGetContext(<variable key>`) which is passed by `-c <key>=<value>` on the CDK command, and updates the `env`, `account` and, `region` properties.
- It includes methods to:
  - Provide the 3 variables currently needed.
  - Update ResourceTags.
  - Provide AWS StackEnv 
  

## BaseStack
A simple abstract class that extends `Stack` currently only provides Stack ID creation abstraction and consistency. Open for future additions. (Required for all stacks)

## BaseConstruct

This abstract class is used to enforce a common structure for all the constructs. It extends `Construct`. (Required for all constructs)

### ConstructProps & BaseEnvProps
The class `ConstructProps` is a utility Monad that provides multiple methods with logic for handling different configuration properties for different environments. It is used to provide a consistent way to handle the configuration properties for the constructs.
It utilizes the `BaseEnvProps<T>` type to provide the configuration properties for different environments.
Its use is mostly for internal use within this library and it is a requirement for all the constructs, especially the ones that would necessitate different Props for each different StackEnv.
`BaseEnvProps<T>` requires a "default" property, all other environment properties are optional. The "default" property is used to provide the default configuration properties for the construct. The "default" property is required and it is used as the fallback if the environment-specific property is not provided.

```typescript
import { ConstructProps, BaseEnvProps } from 'layer3cdk/core';

const envProps: BaseEnvProps<ResourceProps> = {
  default: {
    prop1: 'default',
    prop2: 'default',
  },
  dev: {
    prop1: 'dev',
    prop2: 'dev',
  },
  prod: {
    prop1: 'prod',
    prop2: 'prod',
  },
};
// The ConstructProps will use the "default" property as the fallback if the environment-specific property, is not provided.
const configEnvProp = ConstructProps.of(envProps, config).getProps();
// you can pass the "raw props" to the ConstructProps to get the env specific merged props
const mergedCustomProps = ConstructProps.of(envProps, config).getCustomMergedProps(customResourceProps);
//Or you pass a whole set of props for all environments and get the merged props
const mergedCustomProps = ConstructProps.of(envProps, config).getMergedPropsFromBaseEnvProps(customBaseEnvProps);
```
### envDependentBuild

`envDependentBuild<T>` is a helper function that is used to build the construct based on the environment. It requires a consumer function that provides the resource and the resource name as parameters and returns the resource, an array of environments where the consumer function must run. The function will use the `env` property from the `BaseConfig` to determine the environment and build the resource based on the environment.

```typescript
//The following PolicyStatement will be only built for the dev and prod environments 
const policy = envDependentBuild<PolicyStatement>(config, [`dev`, `prod`], () => {
  return new PolicyStatement({
    actions: ['s3:GetObject'],
    resources: ['*'],
  });
});
```

### Important update for Version 2.3.0
All queues now have the method `hasResourceProperties` that can be used to set the deletion policy of a construct which allows it. The default value is `DELETE` and that is how it should be always set to. The method can be used to set the deletion policy to `RETAIN` which allows for retaining the queue even if it is deleted from the stack or the stack itself is deleted. This is useful when you intend to migrate queues between stacks and don't wish to lose messages in the queue.
Construct which implements this method:
- All SQS constructs
- The SSMStringParameter construct
- The ServiceAccount construct

### BaseConstructs setCustomAlarms method
This method is used to set custom alarms for the construct. It requires a consumer function that provides the resource and resource name as parameters and returns the AlarmProps, a short name for the alarm, and optionally an array of `alarmActions`.

```typescript
const construct = new BaseConstruct(this, 'Construct', {
    constructId: 'Construct',
    stackName: 'Stack',
    config: config,
});

construct.setCustomAlarms((resource, resourceName) => {
    return  {
        metric: resource.metricApproximateNumberOfMessagesVisible({
          period: Duration.minutes(1),
          statistic: Stats.MAXIMUM,
        }),
        threshold: 1,
        alarmName: `${resourceName} Dead Letter Queue Alarm`,
        evaluationPeriods: 2,
        alarmDescription: `Alarm if any message is in the dead letter queue for ${resourceName}`,
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: TreatMissingData.IGNORE,
        actionsEnabled: true,
      };
}, 'metrics-name', [alarmAction]);
```
## ResourceTags

This interface is used to create the tags for the resources. It follows the [AWS Resource Tagging Standard]( with a few extra tags.