import {
  BaseStack,
  ServiceAccountRole,
  DLQ,
  DLQFifo,
  EDAStandardQueue,
  EDAStandardQueueFifo,
  EDAFaninQueue,
  ApplicationRepository,
  DepartmentSSMStringParameter,
} from 'layer3cdk';
import { App } from 'aws-cdk-lib';
import { AlarmActionConfig } from '../tacoProcessor/tacoProcessor.service.stack';

export class SalsaNotifierServiceStack extends BaseStack {
  private readonly serviceAccount: ServiceAccountRole;
  private readonly ecr: ApplicationRepository;
  private readonly dlq: DLQ;
  private readonly dlqFifo: DLQFifo;
  private readonly config: AlarmActionConfig;

  constructor(scope: App, config: AlarmActionConfig) {
    super(scope, config);
    this.config = config;
    this.serviceAccount = this.createServiceAccount();
    this.ecr = this.createECR();
    this.dlq = this.createDLQ();
    this.dlqFifo = this.createDLQFifo();

    // Standard queues
    this.createOrderPlacedQueue();
    this.createNotificationFanInQueue();

    // FIFO queues — ordered notification delivery
    this.createOrderedNotificationQueue();

    // SSM — department-level notification config
    this.createSSMParameters();
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
      repositoryName: 'pltf-salsa-notifier-service',
    }) as ApplicationRepository;
  }

  private createDLQ(): DLQ {
    const dlq = new DLQ(this, this.config);
    dlq.setCloudWatchAlarms(...this.config.alarmActions);
    return dlq;
  }

  // --- DLQ FIFO for ordered notification queues ---

  private createDLQFifo(): DLQFifo {
    return new DLQFifo(this, { config: this.config });
  }

  // --- Standard Queues ---

  private createOrderPlacedQueue() {
    const queue = new EDAStandardQueue(this, {
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

  private createNotificationFanInQueue() {
    const queue = new EDAFaninQueue(this, {
      config: this.config,
      eventName: 'SendNotification',
      dlq: this.dlq.getDlq(),
    });
    queue.setCloudWatchAlarms(...this.config.alarmActions);
    queue.grantPolicies(this.serviceAccount.getRole());
  }

  // --- FIFO Queue (guaranteed ordering for notification delivery) ---

  private createOrderedNotificationQueue() {
    const queue = new EDAStandardQueueFifo(this, {
      config: this.config,
      eventName: 'OrderedNotificationDelivery',
      dlq: this.dlqFifo.getDlq(),
    });
    queue.setCloudWatchAlarms(...this.config.alarmActions);
    queue.grantPolicies(this.serviceAccount.getRole());
  }

  // --- SSM Parameters ---

  private createSSMParameters() {
    // Department-level — shared across all notification services in the department
    new DepartmentSSMStringParameter(this, {
      config: this.config,
      parameterName: 'notification-sender-email',
      parameterValue: 'noreply@taco-shop.example.com',
    });
  }
}
