import {
  BaseStack,
  ServiceAccountRole,
  SnsTopic,
  SnsTopicFifo,
  ApplicationRepository,
  EcsCluster,
  EcsFargateService,
} from 'layer3cdk';
import { App } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { ContainerImage } from 'aws-cdk-lib/aws-ecs';
import { AlarmActionConfig } from '../tacoProcessor/tacoProcessor.service.stack';

export class NachoAgencyServiceStack extends BaseStack {
  private readonly serviceAccount: ServiceAccountRole;
  private readonly ecr: ApplicationRepository;
  private readonly config: AlarmActionConfig;

  constructor(scope: App, config: AlarmActionConfig) {
    super(scope, config);
    this.config = config;
    this.ecr = this.createECR();
    this.serviceAccount = this.createServiceAccount();
    this.createIngredientStateTransferTopic();
    this.createOrderedIngredientTopic();
    this.createEcsServices();
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
      repositoryName: 'pltf-nacho-agency-service',
    }) as ApplicationRepository;
  }

  // --- SNS Standard Topic ---

  private createIngredientStateTransferTopic() {
    const topic = new SnsTopic(this, {
      config: this.config,
      eventName: 'IngredientStateTransfer',
    });
    topic.setCloudWatchAlarms(...this.config.alarmActions);
    topic.outputArn();
    topic.grantPolicies(this.serviceAccount.getRole());
  }

  // --- SNS FIFO Topic (ordered ingredient events) ---

  private createOrderedIngredientTopic() {
    const topic = new SnsTopicFifo(this, {
      config: this.config,
      eventName: 'OrderedIngredientUpdate',
    });
    topic.setCloudWatchAlarms(...this.config.alarmActions);
    topic.outputArn();
    topic.grantPolicies(this.serviceAccount.getRole());
  }

  // --- ECS Fargate Services ---

  private createEcsServices() {
    const vpc = Vpc.fromLookup(this, 'NachoVpc', {
      vpcId: 'vpc-fake-nacho-001',
    });

    const cluster = new EcsCluster(this, {
      config: this.config,
      vpc,
      defaultCloudMapNamespace: 'nacho-agency.local',
    });

    // API service — serves ingredient data
    const api = new EcsFargateService(this, {
      config: this.config,
      serviceName: 'ingredient-api',
      cluster: cluster.getCluster(),
      container: {
        image: ContainerImage.fromRegistry(
          '123456789012.dkr.ecr.us-east-1.amazonaws.com/pltf-nacho-agency-service:latest',
        ),
        portMappings: [{ containerPort: 3000 }],
        environment: {
          PORT: '3000',
          NODE_ENV: 'production',
        },
      },
      cloudMapOptions: { name: 'ingredient-api' },
      autoScaling: {
        minCapacity: 1,
        maxCapacity: 4,
        targetCpuUtilization: 70,
      },
      ecsServiceConfig: {
        default: { cpu: 512, memoryLimitMiB: 1024 },
        prd: { cpu: 1024, memoryLimitMiB: 2048, desiredCount: 2 },
      },
    });
    api.setCloudWatchAlarms(...this.config.alarmActions);

    // Worker service — processes ingredient state changes
    const worker = new EcsFargateService(this, {
      config: this.config,
      serviceName: 'ingredient-worker',
      cluster: cluster.getCluster(),
      container: {
        image: ContainerImage.fromRegistry(
          '123456789012.dkr.ecr.us-east-1.amazonaws.com/pltf-nacho-agency-service:latest',
        ),
        command: ['node', 'dist/worker.js'],
        environment: {
          WORKER_MODE: 'ingredient-sync',
        },
      },
      cloudMapOptions: { name: 'ingredient-worker' },
    });
    worker.setCloudWatchAlarms(...this.config.alarmActions);
  }
}
