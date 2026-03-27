import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AttributeType, Billing, Capacity } from 'aws-cdk-lib/aws-dynamodb';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { BaseConfig, BaseEnvProps } from '../core';
import { DynamoTable } from './dynamo.construct';
import { DynamoProps, DynamoConfig } from './dynamo.default.props';
import { testconfig } from '../test/common.test.const';

describe('DynamoTable', () => {
  let stack: Stack;
  let config: BaseConfig;
  let tableName: string;
  let dynamoProps: DynamoProps;
  let dynamoConfig: DynamoConfig;
  let envDynamicProps: BaseEnvProps<DynamoProps>;
  let envDynamicConfig: BaseEnvProps<DynamoConfig>;
  let dynamoTable: DynamoTable;

  beforeEach(() => {
    stack = new Stack();
    config = testconfig;
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
      prd: dynamoConfig,
    };

    envDynamicProps = {
      default: dynamoProps,
      prd: dynamoProps,
    };
    dynamoTable = new DynamoTable(stack, {
      config,
      tableName,
      dynamoProps: envDynamicProps,
      dynamoConfig: envDynamicConfig,
    });
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
    config = new BaseConfig({
      department: config.department,
      env: config.env,
      stackName: config.stackName,
      tags: config.tags,
      stackEnv: 'prd',
      serviceName: config.serviceName,
      description: config.description,
    });

    new DynamoTable(stack, {
      config,
      tableName,
      dynamoProps: envDynamicProps,
      dynamoConfig: envDynamicConfig,
    });
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
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              'dynamodb:BatchGetItem',
              'dynamodb:GetItem',
              'dynamodb:Scan',
              'dynamodb:BatchWriteItem',
              'dynamodb:PutItem',
              'dynamodb:UpdateItem',
              'dynamodb:DeleteItem',
            ]),
            Effect: 'Allow',
          }),
        ]),
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
  it('should create a CfnOutput for the table ARN when outputArn is called', () => {
    dynamoTable.outputArn();
    Template.fromStack(stack).hasOutput('*', {
      Export: { Name: Match.stringLikeRegexp('.*arn$') },
      Description: `The ARN of the DynamoDB table ${dynamoTable.tableName}`,
    });
  });
  it('should grant read-only data permissions to an IAM role', () => {
    const role = new Role(stack, 'ReadOnlyRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    dynamoTable.grantReadOnlyPolicies(role);
    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              'dynamodb:BatchGetItem',
              'dynamodb:GetItem',
              'dynamodb:Scan',
            ]),
            Effect: 'Allow',
          }),
        ]),
        Version: '2012-10-17',
      },
    });
  });
  it('should apply removal policy RETAIN to the table', () => {
    dynamoTable.resourceRemovalPolicy(RemovalPolicy.RETAIN);
    Template.fromStack(stack).hasResource('AWS::DynamoDB::GlobalTable', {
      UpdateReplacePolicy: 'Retain',
      DeletionPolicy: 'Retain',
    });
  });
  it('should raise validation errors in prd when pointInTimeRecovery and deletionProtection are disabled', () => {
    const prdConfig = new BaseConfig({
      department: config.department,
      env: config.env,
      stackName: config.stackName,
      tags: config.tags,
      stackEnv: 'prd',
      serviceName: config.serviceName,
      description: config.description,
    });
    const prdProps: BaseEnvProps<DynamoProps> = {
      default: {
        partitionKey: { name: 'id', type: AttributeType.STRING },
      },
    };
    const prdDynamoConfig: BaseEnvProps<DynamoConfig> = {
      default: {
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
        pointInTimeRecovery: false,
        deletionProtection: false,
      },
      prd: {
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
        pointInTimeRecovery: false,
        deletionProtection: false,
      },
    };
    const prdStack = new Stack();
    const prdTable = new DynamoTable(prdStack, {
      config: prdConfig,
      tableName: 'prdTable',
      dynamoProps: prdProps,
      dynamoConfig: prdDynamoConfig,
    });
    const errors = prdTable.node.validate();
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Point in Time Recovery must be enabled'),
        expect.stringContaining('Deletion Protection must be enabled'),
      ]),
    );
  });
});
