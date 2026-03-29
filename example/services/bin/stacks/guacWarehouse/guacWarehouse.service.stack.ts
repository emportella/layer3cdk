import * as path from 'path';
import {
  BaseStack,
  ServiceAccountRole,
  EDASns,
  DLQ,
  EDAStandardQueue,
  ApplicationRepository,
  LambdaFunction,
} from 'layer3cdk';
import { App, Duration } from 'aws-cdk-lib';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { AlarmActionConfig } from '../tacoProcessor/tacoProcessor.service.stack';

const DEV_WAREHOUSE_ACCOUNT = '333333333333';
const PRD_WAREHOUSE_ACCOUNT = '444444444444';

const DEV_WAREHOUSE_BUCKET = 'tacoingestionstack-s3bucket-dev-wacky1234abcd';
const PRD_WAREHOUSE_BUCKET = 'tacoingestionstack-s3bucket-prd-spicy5678efgh';

export class GuacWarehouseServiceStack extends BaseStack {
  private readonly serviceAccount: ServiceAccountRole;
  private readonly ecr: ApplicationRepository;
  private readonly dlq: DLQ;
  private readonly config: AlarmActionConfig;

  constructor(scope: App, config: AlarmActionConfig) {
    super(scope, config);
    this.config = config;
    this.serviceAccount = this.createServiceAccount();
    this.ecr = this.createECR();
    this.dlq = this.createDLQ();
    this.createSpicyRecipeFileCreatedQueue();
    this.createRecipeUpdatedTopic();
    this.createFileIngestionLambda();
  }

  private createServiceAccount() {
    const serviceAccountRole = new ServiceAccountRole(this, {
      config: this.config,
      oidcProviderArns: {
        dev: 'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/FAKE_DEV_CLUSTER',
        stg: 'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/FAKE_STG_CLUSTER',
        prd: 'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/FAKE_PRD_CLUSTER',
      },
    });
    const bucket =
      this.config.stackEnv == 'prd'
        ? PRD_WAREHOUSE_BUCKET
        : DEV_WAREHOUSE_BUCKET;

    serviceAccountRole.addPolicyStatements(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject', 's3:GetObjectVersion'],
        resources: [`arn:aws:s3:::${bucket}/*`],
      }),
    );
    return serviceAccountRole;
  }

  private createECR() {
    return ApplicationRepository.create(this, {
      config: this.config,
      repositoryName: 'pltf-guac-warehouse-service',
    }) as ApplicationRepository;
  }

  private createDLQ(): DLQ {
    const dlq = new DLQ(this, this.config);
    dlq.setCloudWatchAlarms(...this.config.alarmActions);
    return dlq;
  }

  private createSpicyRecipeFileCreatedQueue() {
    const warehouseAccount =
      this.config.stackEnv == 'prd'
        ? PRD_WAREHOUSE_ACCOUNT
        : DEV_WAREHOUSE_ACCOUNT;
    const bucket =
      this.config.stackEnv == 'prd'
        ? PRD_WAREHOUSE_BUCKET
        : DEV_WAREHOUSE_BUCKET;

    const queue = new EDAStandardQueue(this, {
      config: this.config,
      eventName: 'SpicyRecipeFileCreated',
      dlq: this.dlq.getDlq(),
    });

    queue.setCloudWatchAlarms(...this.config.alarmActions);
    queue.grantPolicies(this.serviceAccount.getRole());
    queue.addPolicyStatements(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sqs:SendMessage'],
        resources: [queue.getArn()],
        principals: [new ServicePrincipal('s3.amazonaws.com')],
        conditions: {
          ArnLike: { 'aws:SourceArn': `arn:aws:s3:*:*:${bucket}` },
          StringEquals: { 'aws:SourceAccount': `${warehouseAccount}` },
        },
      }),
    );
  }

  private createRecipeUpdatedTopic() {
    const topic = new EDASns(this, {
      config: this.config,
      eventName: 'RecipeUpdated',
    });
    topic.outputArn();
    topic.setCloudWatchAlarms(...this.config.alarmActions);
    topic.grantPolicies(this.serviceAccount.getRole());
  }

  // --- LambdaFunction (generic, any runtime) ---
  // Demonstrates Code.fromAsset for file-based Lambda code

  private createFileIngestionLambda() {
    const bucket =
      this.config.stackEnv == 'prd'
        ? PRD_WAREHOUSE_BUCKET
        : DEV_WAREHOUSE_BUCKET;

    const lambda = new LambdaFunction(this, {
      config: this.config,
      functionName: 'ingest-recipe-file',
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      codeProvider: () =>
        Code.fromAsset(path.join(__dirname, '../../handlers/ingest-recipe-file')),
      lambdaConfig: {
        default: { memorySize: 512, timeout: Duration.minutes(2) },
        prd: { memorySize: 1024 },
      },
    });
    lambda.addPermissions(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject', 's3:GetObjectVersion'],
        resources: [`arn:aws:s3:::${bucket}/*`],
      }),
    );
    lambda.setCloudWatchAlarms(...this.config.alarmActions);
  }
}
