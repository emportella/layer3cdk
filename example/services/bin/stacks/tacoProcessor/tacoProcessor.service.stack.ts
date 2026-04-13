import * as path from 'path';
import {
  BaseConfig,
  BaseStack,
  ServiceAccountRole,
  DLQ,
  StandardQueue,
  BackgroundTasksQueue,
  grantFaninPublishing,
  ApplicationRepository,
  DynamoTable,
  RedisReplicationGroup,
  GlobalSSMStringParameter,
  ServiceSSMStringParameter,
  GlobalSecrets,
  NodejsLambdaFunction,
} from '@emportella/layer3cdk';
import { App } from 'aws-cdk-lib';
import { AttributeType, Billing, Capacity } from 'aws-cdk-lib/aws-dynamodb';
import { IAlarmAction } from 'aws-cdk-lib/aws-cloudwatch';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

export type AlarmActionConfig = BaseConfig & {
  alarmActions: IAlarmAction[];
};

export class TacoProcessorServiceStack extends BaseStack {
  private readonly serviceAccount: ServiceAccountRole;
  private readonly ecr: ApplicationRepository;
  private readonly dlq: DLQ;
  private readonly config: AlarmActionConfig;

  constructor(scope: App, config: AlarmActionConfig) {
    super(scope, config);
    this.config = config;
    this.serviceAccount = this.createServiceAccount();
    this.dlq = this.createDLQ();
    this.ecr = this.createECR();

    // SQS queues
    this.createOrderPlacedQueue();
    this.createRecipeUpdatedQueue();
    this.createTacoScoreChangedQueue();
    this.createSauceStatusUpdatedQueue();
    this.createBurritoSubmittedQueue();
    this.subscribeToFaninQueues();

    // Background tasks queue
    this.createScoreRecalculationTask();

    // DynamoDB table
    this.createOrdersTable();

    // Redis cache
    this.createOrderCache();

    // SSM parameters
    this.createSSMParameters();

    // Secrets
    this.createSecrets();

    // Lambda for async processing
    this.createScoreCalculatorLambda();
  }

  private createServiceAccount() {
    return new ServiceAccountRole(this, {
      config: this.config,
      oidcProviderArns: {
        dev: 'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/FAKE_DEV_CLUSTER',
        stg: 'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/FAKE_STG_CLUSTER',
        prd: 'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/FAKE_PRD_CLUSTER',
      },
    });
  }

  private createECR() {
    return ApplicationRepository.create(this, {
      config: this.config,
      repositoryName: 'pltf-taco-processor-service',
    }) as ApplicationRepository;
  }

  private createDLQ(): DLQ {
    const dlq = new DLQ(this, this.config);
    dlq.setCloudWatchAlarms(...this.config.alarmActions);
    return dlq;
  }

  // --- SQS Standard Queues ---

  private createOrderPlacedQueue() {
    const queue = new StandardQueue(this, {
      config: this.config,
      eventName: 'OrderPlaced',
      dlq: this.dlq.getDlq(),
    });
    queue.subscribeFromSNSTopicImport(
      `output-${this.config.stackEnv}-OrderPlaced-arn`,
    );
    queue.setCloudWatchAlarms(...this.config.alarmActions);
    queue.grantPolicies(this.serviceAccount.getRole());
  }

  private createSauceStatusUpdatedQueue() {
    const queue = new StandardQueue(this, {
      config: this.config,
      eventName: 'SauceStatusUpdated',
      dlq: this.dlq.getDlq(),
    });
    queue.subscribeFromSNSTopicImport(
      `output-${this.config.stackEnv}-SauceStatusUpdated-arn`,
    );
    queue.setCloudWatchAlarms(...this.config.alarmActions);
    queue.grantPolicies(this.serviceAccount.getRole());
  }

  private createBurritoSubmittedQueue() {
    const ACCOUNT =
      this.config.stackEnv == 'prd' ? '111111111111' : '222222222222';

    const queue = new StandardQueue(this, {
      config: this.config,
      eventName: 'BurritoSubmitted',
      dlq: this.dlq.getDlq(),
    });
    queue.subscribeFromSNSTopicArn(
      `arn:aws:sns:us-east-1:${ACCOUNT}:${this.config.stackEnv}-BurritoSubmitted`,
    );
    queue.setCloudWatchAlarms(...this.config.alarmActions);
    queue.grantPolicies(this.serviceAccount.getRole());
  }

  private createRecipeUpdatedQueue() {
    const queue = new StandardQueue(this, {
      config: this.config,
      eventName: 'RecipeUpdated',
      dlq: this.dlq.getDlq(),
    });
    queue.subscribeFromSNSTopicImport(
      `output-${this.config.stackEnv}-RecipeUpdated-arn`,
    );
    queue.setCloudWatchAlarms(...this.config.alarmActions);
    queue.grantPolicies(this.serviceAccount.getRole());
  }

  private createTacoScoreChangedQueue() {
    const queue = new StandardQueue(this, {
      config: this.config,
      eventName: 'TacoScoreChanged',
      dlq: this.dlq.getDlq(),
    });
    queue.subscribeFromSNSTopicImport(
      `output-${this.config.stackEnv}-TacoScoreChanged-arn`,
    );
    queue.setCloudWatchAlarms(...this.config.alarmActions);
    queue.grantPolicies(this.serviceAccount.getRole());
  }

  private subscribeToFaninQueues() {
    grantFaninPublishing({
      role: this.serviceAccount.getRole(),
      faninQueues: [
        {
          eventName: 'SendNotification',
          serviceName: 'salsa-notifier',
        },
      ],
      region: this.config.env.region ?? '',
      accountId: this.config.env.account ?? '',
      env: this.config.stackEnv,
    });
  }

  // --- Background Tasks Queue ---

  private createScoreRecalculationTask() {
    const queue = new BackgroundTasksQueue(this, {
      config: this.config,
      eventName: 'RecalculateTacoScore',
      dlq: this.dlq.getDlq(),
    });
    queue.setCloudWatchAlarms(...this.config.alarmActions);
    queue.grantPolicies(this.serviceAccount.getRole());
  }

  // --- DynamoDB ---

  private createOrdersTable() {
    const table = new DynamoTable(this, {
      config: this.config,
      tableName: 'Orders',
      dynamoProps: {
        default: {
          partitionKey: { name: 'orderId', type: AttributeType.STRING },
          sortKey: { name: 'createdAt', type: AttributeType.STRING },
        },
      },
      dynamoConfig: {
        default: {
          billing: Billing.provisioned({
            readCapacity: Capacity.autoscaled({
              minCapacity: 5,
              maxCapacity: 50,
            }),
            writeCapacity: Capacity.autoscaled({
              minCapacity: 5,
              maxCapacity: 50,
            }),
          }),
          alarmReadThreshold: 40,
          alarmWriteThreshold: 40,
        },
        prd: {
          billing: Billing.provisioned({
            readCapacity: Capacity.autoscaled({
              minCapacity: 20,
              maxCapacity: 200,
            }),
            writeCapacity: Capacity.autoscaled({
              minCapacity: 20,
              maxCapacity: 200,
            }),
          }),
          alarmReadThreshold: 70,
          alarmWriteThreshold: 70,
        },
      },
    });
    table.setCloudWatchAlarms(...this.config.alarmActions);
    table.grantPolicies(this.serviceAccount.getRole());
    table.outputArn();
  }

  // --- Redis ---

  private createOrderCache() {
    new RedisReplicationGroup(this, {
      config: this.config,
      elasticacheProps: {
        default: {
          subnets: [{ id: 'subnet-fake-1a' }, { id: 'subnet-fake-1b' }],
          replicationGroupDescription: 'Taco Processor order cache',
          securityGroupIds: ['sg-fake-redis-001'],
        },
      },
      elasticacheConfig: {
        default: {
          clusterMode: 'enabled',
          multiAzEnabled: false,
        },
        prd: {
          clusterMode: 'enabled',
          multiAzEnabled: true,
        },
      },
    });
  }

  // --- SSM Parameters ---

  private createSSMParameters() {
    // Global parameter — shared across all services
    new GlobalSSMStringParameter(this, {
      config: this.config,
      parameterName: 'taco-api-base-url',
      parameterValue: 'https://api.taco-shop.example.com',
    });

    // Service-level parameter — scoped to this service
    new ServiceSSMStringParameter(this, {
      config: this.config,
      parameterName: 'max-concurrent-orders',
      parameterValue: '100',
    });
  }

  // --- Secrets ---

  private createSecrets() {
    new GlobalSecrets(this, {
      config: this.config,
      parameterName: 'taco-db-credentials',
    });
  }

  // --- Lambda ---

  private createScoreCalculatorLambda() {
    const lambda = new NodejsLambdaFunction(this, {
      config: this.config,
      functionName: 'calculate-taco-score',
      entry: path.join(__dirname, '../../handlers/calculate-taco-score.ts'),
      lambdaConfig: {
        default: { memorySize: 512 },
        prd: { memorySize: 1024 },
      },
    });
    lambda.addPermissions(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['dynamodb:Query', 'dynamodb:GetItem'],
        resources: ['*'],
      }),
    );
    lambda.setCloudWatchAlarms(...this.config.alarmActions);
  }
}
