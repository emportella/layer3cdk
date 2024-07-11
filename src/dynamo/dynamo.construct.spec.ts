import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AttributeType, Billing, Capacity } from 'aws-cdk-lib/aws-dynamodb';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { ABConfig, ABEnvProps } from '../common';
import { ABDynamoTable } from './dynamo.construct';
import { ABDynamoProps, ABDynamoConfig } from './dynamo.default.props';
import { testAbConfig } from '../test/common.test.const';

describe('ABDynamoTable', () => {
  let stack: Stack;
  let config: ABConfig;
  let tableName: string;
  let dynamoProps: ABDynamoProps;
  let dynamoConfig: ABDynamoConfig;
  let envDynamicProps: ABEnvProps<ABDynamoProps>;
  let envDynamicConfig: ABEnvProps<ABDynamoConfig>;
  let dynamoTable: ABDynamoTable;

  beforeEach(() => {
    stack = new Stack();
    config = testAbConfig;
    tableName = 'myTable';
    dynamoProps = {
      partitionKey: { name: 'id', type: AttributeType.STRING },
    };
    dynamoConfig = {
      billing: Billing.provisioned({
        readCapacity: Capacity.autoscaled({
          minCapacity: 5,
          maxCapacity: 100,
          targetUtilizationPercent: 80,
        }),
        writeCapacity: Capacity.autoscaled({
          minCapacity: 5,
          maxCapacity: 100,
        }),
      }),
      alarmReadThreshold: 90,
      alarmWriteThreshold: 90,
    };
    envDynamicConfig = {
      default: dynamoConfig,
      prod: dynamoConfig,
    };

    envDynamicProps = {
      default: dynamoProps,
      prod: dynamoProps,
    };
    dynamoTable = new ABDynamoTable(
      stack,
      tableName,
      config,
      envDynamicProps,
      envDynamicConfig,
    );
  });
  it('should create a DynamoDB table with the correct name', () => {
    Template.fromStack(stack).hasResourceProperties(
      'AWS::DynamoDB::GlobalTable',
      {
        TableName: 'dev-RpjTestApp-MyTable',
      },
    );
  });
  it('should be a standard table class', () => {
    Template.fromStack(stack).hasResourceProperties(
      'AWS::DynamoDB::GlobalTable',
      {
        Replicas: [
          {
            TableClass: 'STANDARD',
          },
        ],
      },
    );
  });
  it('should have defined attributes and billing mode', () => {
    Template.fromStack(stack).hasResourceProperties(
      'AWS::DynamoDB::GlobalTable',
      {
        AttributeDefinitions: [
          {
            AttributeName: 'id',
            AttributeType: 'S',
          },
        ],
        BillingMode: 'PROVISIONED',
      },
    );
  });
  it('should have Write Provisioned Throughput Settings', () => {
    Template.fromStack(stack).hasResourceProperties(
      'AWS::DynamoDB::GlobalTable',
      {
        WriteProvisionedThroughputSettings: {
          WriteCapacityAutoScalingSettings: {
            MaxCapacity: 100,
            MinCapacity: 5,
            TargetTrackingScalingPolicyConfiguration: { TargetValue: 70 },
          },
        },
      },
    );
  });
  it('should have Read Provisioned Throughput Settings', () => {
    Template.fromStack(stack).hasResourceProperties(
      'AWS::DynamoDB::GlobalTable',
      {
        Replicas: [
          {
            ReadProvisionedThroughputSettings: {
              ReadCapacityAutoScalingSettings: {
                MaxCapacity: 100,
                MinCapacity: 5,
                TargetTrackingScalingPolicyConfiguration: { TargetValue: 80 },
              },
            },
          },
        ],
      },
    );
  });
  it('should create a table with RemovalPolicy Retain', () => {
    Template.fromStack(stack).hasResource('AWS::DynamoDB::GlobalTable', {
      UpdateReplacePolicy: 'Retain',
      DeletionPolicy: 'Retain',
    });
  });
  it('should update a table RemovalPolicy to Destroy ', () => {
    dynamoTable.resourceRemovalPolicy(RemovalPolicy.DESTROY);
    Template.fromStack(stack).hasResource('AWS::DynamoDB::GlobalTable', {
      UpdateReplacePolicy: 'Delete',
      DeletionPolicy: 'Delete',
    });
  });
  it('should have ContributorInsightsSpecification, PointInTimeRecoverySpecification disabled in dev envs', () => {
    Template.fromStack(stack).hasResourceProperties(
      'AWS::DynamoDB::GlobalTable',
      {
        Replicas: [
          {
            ContributorInsightsSpecification: { Enabled: false },
            PointInTimeRecoverySpecification: {
              PointInTimeRecoveryEnabled: false,
            },
          },
        ],
      },
    );
  });
  it('should have ContributorInsightsSpecification, PointInTimeRecoverySpecification, DeletionProtectionEnabled enabled in production envs', () => {
    config = new ABConfig(
      config.domain,
      config.env,
      config.stackName,
      config.tags,
      'prod',
      config.serviceName,
      config.description,
    );

    new ABDynamoTable(
      stack,
      tableName,
      config,
      envDynamicProps,
      envDynamicConfig,
    );
    Template.fromStack(stack).hasResourceProperties(
      'AWS::DynamoDB::GlobalTable',
      {
        Replicas: [
          {
            ContributorInsightsSpecification: { Enabled: true },
            PointInTimeRecoverySpecification: {
              PointInTimeRecoveryEnabled: true,
            },
            DeletionProtectionEnabled: true,
          },
        ],
      },
    );
  });
  it('should grant read/write data permissions to an IAM role', () => {
    const role = new Role(stack, 'TestRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    dynamoTable.grantPolicies(role);
    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'dynamodb:BatchGetItem',
              'dynamodb:GetRecords',
              'dynamodb:GetShardIterator',
              'dynamodb:Query',
              'dynamodb:GetItem',
              'dynamodb:Scan',
              'dynamodb:ConditionCheckItem',
              'dynamodb:BatchWriteItem',
              'dynamodb:PutItem',
              'dynamodb:UpdateItem',
              'dynamodb:DeleteItem',
              'dynamodb:DescribeTable',
            ],
            Effect: 'Allow',
          },
        ],
        Version: '2012-10-17',
      },
    });
  });
  it('should grant only custom access permissions to an IAM role (Only one action)', () => {
    const role = new Role(stack, 'TestRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    dynamoTable.grantCustomPolicies(role, 'dynamodb:BatchGetItem');
    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 'dynamodb:BatchGetItem',
            Effect: 'Allow',
          },
        ],
        Version: '2012-10-17',
      },
    });
  });
  it('should grant only custom access permissions to an IAM role (Two or more actions)', () => {
    const role = new Role(stack, 'TestRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    dynamoTable.grantCustomPolicies(
      role,
      'dynamodb:BatchGetItem',
      'dynamodb:BatchWriteItem',
    );
    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: ['dynamodb:BatchGetItem', 'dynamodb:BatchWriteItem'],
            Effect: 'Allow',
          },
        ],
        Version: '2012-10-17',
      },
    });
  });
  it('should create CloudWatch alarms for consumed read/write capacity and throttled requests', () => {
    dynamoTable.setCloudWatchAlarms();

    Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: `${dynamoTable.resourceName} Consumed Read Capacity Units Alarm`,
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      EvaluationPeriods: 3,
      DatapointsToAlarm: 3,
      Threshold: 90,
      TreatMissingData: 'ignore',
      ActionsEnabled: false,
    });

    Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: `${dynamoTable.resourceName} Consumed Write Capacity Units Alarm`,
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      EvaluationPeriods: 3,
      DatapointsToAlarm: 3,
      Threshold: 90,
      TreatMissingData: 'ignore',
      ActionsEnabled: false,
    });

    Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: `${dynamoTable.resourceName} Throttled Requests`,
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      EvaluationPeriods: 2,
      DatapointsToAlarm: 1,
      Threshold: 1,
      TreatMissingData: 'ignore',
      ActionsEnabled: false,
    });
  });
});
