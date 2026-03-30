# DynamoDB Package

Provides a construct for creating a DynamoDB table.

## DynamoTable
`DynamoTable` is a construct that creates a DynamoDB table with the specified properties.

### Properties

We choose to break down the properties of the original aws-cdk DynamoDB properties `TablePropsV2` into two categories: Configurations and Properties. That was done to separate the properties that are used to configure the table from the properties that are used to define the table.

- `DynamoConfig` - Configuration properties for the table.
  - That is an _*Optional*_ property that can be used to configure the table.
  - The Default values are defined as the ideal configuration for a DynamoDB table for Layer3CDK
  - This is a subset of the `TablePropsV2` properties and handles the following properties:
    - `tableClass`
    - `billing`
    - `removalPolicy`
    - `encryption`
    - `pointInTimeRecoverySpecification`
    - `contributorInsightsSpecification`
    - `deletionProtection`
    - `replicas`
    - `dynamoStream`
    - `kinesisStream`
    - `tags`
  - Besides the above properties, we also have the following properties: `alarmReadThreshold` and `alarmWriteThreshold`. 
- `DynamoProps` - Properties that define the table.
  - This is a required property that is used to define the table.
  - This is a subset of the `TablePropsV2` properties and handles the following properties:
    - `partitionKey`
    - `sortKey`
    - `timeToLiveAttribute`
    - `globalSecondaryIndexes`
    - `localSecondaryIndexes`

### Example

As the DynamoDB is a complex and costly resource, we have defined different configurations for different environments. 
Both "Props" need to be created using the `BaseEnvProps` for defining different environments. The following example shows how to create a DynamoDB table with the ideal configuration for a DynamoDB table for Layer3CDK, where prd has a different configuration for billing.

```typescript
 // DynamoDB Table - creates a simple DynamoDB table with a partition key and a field to store the TTL, which is used to delete the items after a certain time. Default configuration is used for dev and stg, and prd has a different configuration for billing. As the the `BaseEnvProps.default` is required we pass the required properties for DynamoConfig which are `alarmReadThreshold` and `alarmWriteThreshold`.
  const tableName = 'ProcessedApplicationDomainEvents';
    const envDynamoProps: BaseEnvProps<DynamoProps> = {
      default: {
        partitionKey: { // That is required field and represents the primary key of the table
          name: 'table-name',
          type: AttributeType.NUMBER,
        },
        timeToLiveAttribute: 'created_at', // That is an optional field and represents the TTL attribute of the table
      },
    };
    const envDynamoConfig: BaseEnvProps<DynamoConfig> = {
      default: {
        alarmReadThreshold: 20,
        alarmWriteThreshold: 20,
      },
      prd: {
        billing: Billing.onDemand(),// onDemand billing is used for prd in this case, that allows the table to scale automatically, but attention is required to avoid high costs. 
        alarmReadThreshold: 100, // The alarmReadThreshold and alarmWriteThreshold are required for the default configuration, so we need to pass them for the prd configuration as well. Even if we opted for onDemand billing, we still need to pass the alarmReadThreshold and alarmWriteThreshold so we can have visibility of the table's usage.
        alarmWriteThreshold: 100,
      },
    };
    const dynamotable = new DynamoTable(this, {
      config: this.config,
      tableName,
      dynamoProps: envDynamoProps,
      dynamoConfig: envDynamoConfig,
    });
    dynamotable.grantPolicies(this.serviceAccont.getTole());// That is a method that grants read and write permissions to the table. Depending on the use case, there are other methods that can be used to grant permissions to the table: `grantReadOnlyPolicies` and `grantCustomPolicies`.
    dynamotable.setCloudWatchAlarms(this.config.alarmAction); // There are 3 different alarms defined for the table: Consumed Write Capacity, Consumed Read Capacity and Throttled Requests. The `setCloudWatchAlarms` method is used to create the alarms for the table.
    ```

> **Note:** During `cdk synth` you may see deprecation warnings for `TableGrantsProps#encryptedResource` and `TableGrantsProps#policyResource`. These are emitted by CDK's internal grant machinery inside `aws-cdk-lib`, not by Layer3CDK. Our code does not reference these properties. The warnings will be resolved in a future `aws-cdk-lib` release.
