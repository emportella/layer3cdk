# Alarms package

All resources related to supporting alarms are created in this package.

## ChatbotSlackChannel

AWS Chatbot is used to send notifications to Slack channels. 
This specific implementation aims to provide the infrastructure needed to enable AlarmActions to be sent to provided Slack channels.
CDK does not provide implementation to the initial setup of the Slack Workspace, therefore this needs to be done manually.
The following resources are created:

1. AWS Chatbot Slack Channel;
2. The topic for AlarmActions;
3. ChatBot Role to allow interactions with AWS resources and to send messages to Slack;

It exports the following:

* `ChatbotSlackChannelIds` - The IDs of the created Slack channels;
* `ChatbotSlackChannnel` - BaseConstruct that handles the creation of the integration, role and topic. It also exports the Arn of the Topic to be used in other stacks of the domain for the creation of alarms.

> [!NOTE]
> The below implementation requires individual channels for each environment. This is the prefered way to handle the notifications, as it allows for better control of the notifications and the ability to have different channels for different environments.
> There are ways to share channels between environments, but this is not recommended.
    
### Usage

```typescript

    //provide the channels ids
    const channelIds: ChatbotSlackChannelIds = {
      dev: 'DEV3BBLZZ8YY',
      preprod: 'PREPROD3BBLZZ8YY',
      perf: 'PERF3BBLZZ8YY',
      prod: 'PROD3BBLZZ8YY',
    };

    //Build the Slack integration, this will build all the needed resources including the SNS topic, roles and chatbot integration
    const chatbotSlackChannel = new ChatbotSlackChannel(this, channelIds, config);

    //Get the AlarmAction (SnsAction) to be used in the alarms  for the same stack
    const domainSnsAction = chatbotSlackChannel.getSnsAction();
    
    //Or output the Arn of the SNS topic to be used in other stacks
    chatbotSlackChannel.outputSNSTopicArn();
```
#### how to use the SNSAction between stacks within the same project

```typescript
    //Use BaseConfigExtended to extend the BaseConfig with the AlarmActions
   export type BaseConfigWithExports = BaseConfigExtended<{
      alarmActions: IAlarmAction[];
    }>;
    
  
    app = new App();
    stack1 = new Stack(app, 'stack1', config);

    const dwPublisherConfig: BaseConfigWithExports = {
      ...new BaseConfig(
        'rpj',
        config.getEnvironment(),
        dwpublisherStackName,
        config.getUpdatedResourceTags(DW_PUBLISHER_TAGS),
        config.getStackEnv(),
        DW_PUBLISHER_NAME,
        'Data Warehouse Publisher CDK Stack',
      ),
      alarmActions: snsActions,
    };
    stack2 = new Stack(app, 'stack2', {
      ...config,
      snsAction: stack1.snsAction,
    }});

    //stack2 depends on stack1
    stack2.addDependency(stack1);
```
## SnsAction

This construct is used to import topics from other projects and use them as AlarmActions.
Alarme channels are individual for each domain and it is only created once on the main domain stack and then imported to the other stacks.

#### AlarmActionMap 

The AlarmActionMap is a map that contains the name of the action and the ARN of the topic. This map is used to create the SnsAction.

```typescript
   export type AlarmActionMap = { [key in AlarmActionType]?: string | undefined };
```

### Usage

```typescript
   
    const snsAlarmActionMap: AlarmActionMap = {
      opsGenie: 'arn:aws:sns:us-east-1:123456789012:opsGenieTopic',
      slack: 'arn:aws:sns:us-east-1:123456789012:slackTopic',
      googleChat: 'arn:aws:sns:us-east-1:123456789012:googleChatTopic',
    };
  
    //create the SnsAction within the stack
    const snsAction: AlarmSnsAction[] = new AlarmSnsAction(scope, config, snsAlarmActionMap).getSnsActions();

    //use the snsAction in the alarm
    const alarm = new Alarm(scope, 'alarm', {
      metric: metric,
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'alarm',
      alarmName: 'alarm',
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      actionsEnabled: true,
      alarmActions: snsAction,
    });
```

## OpsGenie
Like the Slack integration, the OpsGenie integration is also created manually. The OpsGenie integration is used to send notifications to OpsGenie.

OpsGenie is a modern incident management platform that ensures critical incidents are never missed, and actions are taken by the right people in the shortest possible time.

Different from ChatBot, OpsGenie requires only a simple integration with AWS SNS. The integration is done by creating an SNS topic and subscribing to it via HTTP the OpsGenie service.

### Usage
  
  ```typescript
      //provide the channels ids
      const apiKeys: OpsGenieApiKeys = {
        dev: 'dev-key',
        preprod: 'preprod-key',
        perf: 'perf-key',
        prod: 'prod-key',
      };
  
      //Build the OpsGenie integration, this will build all the needed resources including the SNS topic.
      const opsgenieChannel = new OpsGenie(this, apiKeys, config);

  ```
> [!NOTE]
> Note that it is user choice to have individual apikeys (integration) for each environment or share the same apikey between environments. The same apikey can be used for all environments.