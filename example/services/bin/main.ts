import { BaseStackConfig } from 'layer3cdk';
import { App } from 'aws-cdk-lib';
import { IAlarmAction } from 'aws-cdk-lib/aws-cloudwatch';
import {
  ALARM_HUB_STACK_NAME,
  ALARM_HUB_TAGS,
  TacoAlarmHub,
  TACO_PROCESSOR_NAME,
  TACO_PROCESSOR_TAGS,
  TacoProcessorServiceStack,
  AlarmActionConfig,
  NACHO_AGENCY_NAME,
  NACHO_AGENCY_TAGS,
  NachoAgencyServiceStack,
  SALSA_NOTIFIER_NAME,
  SALSA_NOTIFIER_TAGS,
  SalsaNotifierServiceStack,
  GUAC_WAREHOUSE_NAME,
  GUAC_WAREHOUSE_TAGS,
  GuacWarehouseServiceStack,
  CHURRO_DASHBOARD_NAME,
  CHURRO_DASHBOARD_TAGS,
  ChurroDashboardStack,
} from './stacks';

const app = new App();
const stackConfig = BaseStackConfig.getInstance(app);

// Main Domain Stack (alarm hub)
const alarmHubConfig = stackConfig.createBaseConfig({
  serviceName: ALARM_HUB_STACK_NAME,
  stackName: ALARM_HUB_STACK_NAME,
  tags: ALARM_HUB_TAGS,
  description: 'Taco Shop Alarm Hub Stack',
});

const alarmHub = new TacoAlarmHub(app, alarmHubConfig);
const snsActions: IAlarmAction[] = alarmHub.getAlarmActions();

// Helper to create alarm-enabled configs
const createAlarmConfig = (
  serviceName: string,
  stackName: string,
  tags: Record<string, string>,
  description: string,
): AlarmActionConfig =>
  Object.assign(
    stackConfig.createBaseConfig({ serviceName, stackName, tags, description }),
    { alarmActions: snsActions },
  );

// Taco Processor — event consumer with SQS queues
const tacoProcessorStack = new TacoProcessorServiceStack(
  app,
  createAlarmConfig(
    TACO_PROCESSOR_NAME,
    TACO_PROCESSOR_NAME,
    TACO_PROCESSOR_TAGS,
    'Taco Processor CDK Stack',
  ),
);
tacoProcessorStack.addDependency(alarmHub);

// Nacho Agency — SNS publisher for ingredient state
const nachoAgencyStack = new NachoAgencyServiceStack(
  app,
  createAlarmConfig(
    NACHO_AGENCY_NAME,
    NACHO_AGENCY_NAME,
    NACHO_AGENCY_TAGS,
    'Nacho Agency CDK Stack',
  ),
);
nachoAgencyStack.addDependency(alarmHub);

// Salsa Notifier — fan-in notification consumer
const salsaNotifierStack = new SalsaNotifierServiceStack(
  app,
  createAlarmConfig(
    SALSA_NOTIFIER_NAME,
    SALSA_NOTIFIER_NAME,
    SALSA_NOTIFIER_TAGS,
    'Salsa Notifier CDK Stack',
  ),
);
salsaNotifierStack.addDependency(alarmHub);

// Guac Warehouse — data warehouse publisher (S3 → SQS → SNS)
const guacWarehouseStack = new GuacWarehouseServiceStack(
  app,
  createAlarmConfig(
    GUAC_WAREHOUSE_NAME,
    GUAC_WAREHOUSE_NAME,
    GUAC_WAREHOUSE_TAGS,
    'Guac Warehouse Publisher CDK Stack',
  ),
);
guacWarehouseStack.addDependency(alarmHub);

// Churro Dashboard — notifications dashboard
const churroDashboardConfig = stackConfig.createBaseConfig({
  serviceName: CHURRO_DASHBOARD_NAME,
  stackName: CHURRO_DASHBOARD_NAME,
  tags: CHURRO_DASHBOARD_TAGS,
  description: 'Churro Dashboard CDK Stack',
});
new ChurroDashboardStack(app, churroDashboardConfig);

app.synth();
