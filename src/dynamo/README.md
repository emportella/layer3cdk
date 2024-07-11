# DynamoDB Package

Provides a construct for creating a DynamoDB table.

## ABDynamoTable
`ABDynamoTable` is a construct that creates a DynamoDB table with the specified properties.

### Properties

We choose to break down the properties of the original aws-cdk DynamoDB properties `TablePropsV2` into two categories: Configurations and Properties. That was done to separate the properties that are used to configure the table from the properties that are used to define the table.

- `ABDynamoConfig` - Configuration properties for the table.
  - That is an _*Optional*_ property that can be used to configure the table.
  - The Default values are defined as the ideal configuration for a DynamoDB table for Applyboard
  - This is a subset of the `TablePropsV2` properties and handles the following properties:
    - `tableClass`
    - `billing`
    - `removalPolicy`
    - `encryption`
    - `pointInTimeRecovery`
    - `contributorInsights`
    - `deletionProtection`
    - `replicas`
    - `dynamoStream`
    - `kinesisStream`
    - `tags`
  - Besides the above properties, we also have the following properties: `alarmReadThreshold` and `alarmWriteThreshold`. 
- `ABDynamoProps` - Properties that define the table.
  - This is a required property that is used to define the table.
  - This is a subset of the `TablePropsV2` properties and handles the following properties:
    - `partitionKey`
    - `sortKey`
    - `timeToLiveAttribute`
    - `globalSecondaryIndexes`
    - `localSecondaryIndexes`

### Example

As the DynamoDB is a complex and costly resource, we have defined different configurations for different environments. 
Both "Props" need to be created using the `ABEnvProps` for defining different environments. The following example shows how to create a DynamoDB table with the ideal configuration for a DynamoDB table for Applyboard, where prod has a different configuration for billing.

```typescript
 // DynamoDB Table - creates a simple DynamoDB table with a partition key and a field to store the TTL, which is used to delete the items after a certain time. Default configuration is used for dev and preprod, and prod has a different configuration for billing. As the the `ABEnvProds.default` is required we pass the required properties for ABDynamoConfig which are `alarmReadThreshold` and `alarmWriteThreshold`.
  const tableName = 'ProcessedApplicationDomainEvents';
    const envDynamoProps: ABEnvProps<ABDynamoProps> = {
      default: {
        partitionKey: { // That is required field and represents the primary key of the table
          name: 'table-name',
          type: AttributeType.NUMBER,
        },
        timeToLiveAttribute: 'created_at', // That is an optional field and represents the TTL attribute of the table
      },
    };

    const envDynamoConfig: ABEnvProps<ABDynamoConfig> = {
      default: {
        alarmReadThreshold: 20,
        alarmWriteThreshold: 20,
      },
      prod: {
        billing: Billing.onDemand(),// onDemand billing is used for prod in this case, that allows the table to scale automatically, but attention is required to avoid high costs. 
        alarmReadThreshold: 100, // The alarmReadThreshold and alarmWriteThreshold are required for the default configuration, so we need to pass them for the prod configuration as well. Even if we opted for onDemand billing, we still need to pass the alarmReadThreshold and alarmWriteThreshold so we can have visibility of the table's usage.
        alarmWriteThreshold: 100,
      },
    };
    const dynamotable = new ABDynamoTable(
      this,
      tableName,
      this.config,
      envDynamoProps,
      envDynamoConfig,
    );
    dynamotable.grantPolicies(this.serviceAccont.getTole());// That is a method that grants read and write permissions to the table. Depending on the use case, there are other methods that can be used to grant permissions to the table: `grantReadOnlyPolicies` and `grantCustomPolicies`.
    dynamotable.setCloudWatchAlarms(this.config.alarmAction); // There are 3 different alarms defined for the table: Consumed Write Capacity, Consumed Read Capacity and Throttled Requests. The `setCloudWatchAlarms` method is used to create the alarms for the table.
    ```

