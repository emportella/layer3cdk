# SQS Package
All SQS-related constructs should be built in this package.

## Important updates


### Version 2.4.3
FIFO queues are enabled for all EDA queues. By default, the queue is both `fifo` and `contentBasedDeduplication` enabled. The `contentBasedDeduplication` is set to `true` by default. FIFO queues must have a DLQ that is also FIFO. For details on [Exactly-once processing](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html) and [CreateQueues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_CreateQueue.html). You must either provide a `MessageDeduplicationId` (preferable) or, if you select `ContentBasedDeduplication= true` SQS will generate on SHA-256 hash from the body of your message. Consider adding `DeduplicationScope` and `FifoThroughputLimit` to your queueProps.
For more details on FIFO queues see [FIFO Queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html).
FIFO queues are much more limited compared to standard queues.


### Version 2.3.0
All queues now have the method `hasResourceProperties` that can be used to set the deletion policy of the queue. The default value is `DELETE` and that is how it should be always set to. The method can be used to set the deletion policy to `RETAIN` which allows for retaining the queue even if it is deleted from the stack or the stack itself is deleted. This is useful when you intend to migrate queues between stacks and don't wish to lose messages in the queue.


### 1. DLQ for SQS
A dead Letter Queue ([DLQ](./sqs.dlq.construct.ts)) for SQS is used to store messages that can't be processed. The messages are stored in a separate queue and can be inspected and processed later.
The constructor handles all the naming and configurations needed for the DLQ. The DLQ is created with a retention period of 14 days.
CloudWatch Alarms are set to trigger more than 0 messages.

```typescript
import { DLQ } from 'layer3cdk';

    const dlq = new DLQ(scope, config);
    dlq.setCloudWatchAlarms(snsAction); // optional sns action until implemented.
  
```

#### 1.1 DLQ for FIFO SQS Queues
A FIFO Queue requires a DLQ with the same properties. The [DLQFifo](./sqs.dlq.construct.ts) for FIFO queues is used to store messages that can't be processed. The messages are stored in a separate queue and can be inspected and processed later.
This DLQ can be created for service and be the same for all FIFO queues in the service, or optionally you can create a DLQ for a specific FIFO Queue by passing the Event Name to the constructor.

```typescript
import { DLQFifo } from 'layer3cdk';

    const dlq = new DLQFifo(scope, config);// As a generic Fifo DLQ for the service
    const dlq = new DLQFifo(scope, config, 'TaskCreated');// As a specific Fifo DLQ for a specific event
    
```
> [!NOTE]
> There method dlq.getDlq() now (v2.4.3) allows to pass a custom _maxReceiveCount_ value (default=20).

### 2. SQS for Event-Driven Architecture

#### 2.1 EDAStandardQueue

The [EDAStandardQueue](./sqs.eda.standard.construct.ts) is a standard queue that can be used for event-driven architecture. The constructor handles all the naming and configurations needed for the queue. 

There are 2 alarms set on the queue:
1. The alarm on Stale Messages: The alarm is triggered when there are messages in the queue for more than 60 seconds for more than 2 minutes.
2. Alarm on High Number of Messages: The alarm is triggered when there are more than 100 messages in the queue for more than 2 minutes.

Important:
1. You must call the alarm methods to set the alarms on the queue.
2. Don't forget to grant the service account to consume from the queue.
3. And subscribe the queue to an SNS topic.

```typescript
import { EDAStandardQueue } from 'layer3cdk';

    const taskCreatedStQueue = new EDAStandardQueue(
      scope,
      'TaskCreated',//event name
      dlq, // instance of the service DLQ
      config
    );
    taskCreatedStQueue.setCloudWatchAlarms(snsAction); // optional sns action until implemented.
    //subscribe the queue from a Topic ARN exported from another stack*
    //Core package has `arnExportName` method that can help dynamically define the export name for the resource
     taskCreatedStQueue.subscribeFromSNSTopicImport(
      '<Value exported from the SNS topic>',
    );
    //OR Subscribe the queue from a Topic ARN created in the same stack
    taskCreatedStQueue.subscribeFromSNSTopicArn('<arn of the SNS topic>');
    //Don't forget to grant the service account to consume from the queue
    taskCreatedStQueue.grantConsumeMessages(serviceAccountRole);
```

#### 2.2 EDASqsBackgroundTasks

The [EDASqsBackgroundTasks](./sqs.eda.background.tasks.construct.ts) is a background task queue that can be used for processing asynchronous tasks in a format of messages. As before the constructor handles all the naming and configurations needed for the queue.

This Queue is only intended to be used for background tasks where the producer and consumer are the same service. Although it is classified as an EDA queue, it is not intended to be used for event-driven architecture between services for this proposed use of the EDAStandardQueue.

##### Usage
```typescript
import { EDASqsBackgroundTasks } from 'layer3cdk';

    const taskCreatedBgQueue = new EDASqsBackgroundTasks(
      scope,
      'TaskCreated',//event name
      dlq, // instance of the service DLQ
      config
    );
    taskCreatedBgQueue.setCloudWatchAlarms(snsAction); // 
    //Don't forget to grant the service account to publish and consume from the queue
    taskCreatedBgQueue.grantPolicies(serviceAccountRole);
```

#### 2.3 EDAFaninQueue

The [EDAFaninQueue](./sqs.eda.fanin.construct.ts) is a fan-in queue that can be used for event-driven architecture. The constructor handles all the naming and configurations needed for the queue.

This Queue is intended to be used for a fan-in strategy where multiple services can publish messages to a single queue. The queue is owned by the ***Consumer*** and the ***Producers*** are granted permission to publish messages to the queue. The ***Consumer*** is responsible for processing the messages and deleting them from the queue.

***Producers*** must "subscribe" to Publish messages to the queue by calling the `grantFaninPublishing` Function. This method will add an inline policy to the ***Producers*** role to allow the ***Producers*** to publish messages to the queue.

##### Usage
```typescript

import { EDAFaninQueue } from 'layer3cdk';

    const taskCreatedFaninQueue = new EDAFaninQueue(
      scope,
      'SendNotification',//event name
      dlq, // instance of the service DLQ
      config
    );
    
    taskCreatedFaninQueue.grantPolicies(serviceAccountRole);

    //on the producer side
     grantFaninPublishing(
      this.serviceAccount.getRole(),
      [
        {
          eventName: 'SendNotification',
          serviceName: 'rp-notifications-consumer',
        },
      ],
      this.config.env.region ?? '',
      this.config.env.account ?? '',
      this.config.env,
    );
```
____________________________________________________
##### Fan-in Strategy
A fan-in strategy is used to fan-in multiple message producers into a single queue/consumer. Here the strategy is implemented by an SQS queue which is owned, like all other queues, by its ***Consumer***. The real difference is how the permissions are set, an extra resource policy is added to the queue to allow multiple ***Producers***. 

The ***Consumer*** owns the message contract. It is the team's responsibility to ensure that the message contract is well-defined and documented. The ***Producers*** are responsible for publishing messages that adhere to the message contract. It is also ***OPTIONAL*** for the ***Consumer*** to provide synchronous or asynchronous ways for ***Producers*** to know if the message was successfully processed or not. 

- A simple way to do this is to have the **Producer** generate a unique identifier in the message with which the **Consumer** will persist associate a changelog and provide a GET endpoint where the Producer can fetch the status of the message. 

- Or yet, the ***Consumer*** can also provide a way for the ***Producer*** to know if the message was successfully processed by publishing a message to an SNS topic. The ***Producer*** can subscribe to the SNS topic to know if the message was successfully processed.

____________________________________________________

#### 2.4 EDAFifoQueue

All versions of the EDA queues have a FIFO version (EDAStandardQueueFifo, EDABackgroundTasksQueueFifo, EDAFaninQueueFifo). A FIFO queue can be used for event-driven architecture. The constructor handles all the naming and configurations needed for the queue. Fifo queues are used when the order of the messages is important, they can be identified by the `.fifo` suffix in the queue name (AWS requirement).

### 3 Subscriptions

All queues have methods that can be used to subscribe the queue to an SNS topic. All the methods will also allow the queue to consume messages from the SNS topic. The methods are:
1. `subscribeFromSNSTopicArn` - This method takes the ARN of the SNS topic as a parameter and subscribes the queue to the topic.
2. `subscribeFromSnsTopicArnWithProps` - This method takes the ARN of the SNS topic and the subscription props as parameters and subscribes the queue to the topic. It allows for filtering of messages based on the message attributes and the message body.
3. `subscribeWithCfnSubscription` - This method takes the CFN subscription as a parameter and subscribes the queue to the topic. It allows for filtering of messages based on the message attributes and the message body. It allows for more complex [filter conditions](https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html)

