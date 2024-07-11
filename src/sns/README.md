# SNS Package
All SNS-related constructs should be built in this package.

### 1. SNS for Event-Driven Architecture

EDASns is an [SNS Topic](./sns.eda.construct.ts) that can be used for event-driven architecture. The constructor handles all the naming and configurations needed for the topic.

```typescript
import { EDASns } from '@applyboard/cdk-constructs';

const taskCreatedSNS = new EDASns(scope, 'TaskCreated', AbConfig);
taskCreatedSNS.setCloudWatchAlarms(snsAction);// optional sns action until implemented.
taskCreatedSNS.outputArn(); // outputs the ARN of the SNS topic to be used in other stacks.
taskCreatedSNS.grantPolicies(serviceAccountRole); // grants the service account to publish to the topic.

```
### 2. FIFO SNS
EDASnsFifo is an SNS topic that is configured as a FIFO topic. The constructor handles all the naming and configurations needed for the topic.


