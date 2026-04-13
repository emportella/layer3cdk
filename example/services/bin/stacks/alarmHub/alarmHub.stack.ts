import {
  BaseConfig,
  BaseStack,
  ChatbotSlackChannelIds,
  ChatbotSlackChannnel,
  OpsGenie,
  OpsGenieApiKeys,
} from '@emportella/layer3cdk';
import AlarmSnsAction from '@emportella/layer3cdk/dist/alarms/alarmAction/snsAction.construct';
import { App } from 'aws-cdk-lib';
import { IAlarmAction } from 'aws-cdk-lib/aws-cloudwatch';

export class TacoAlarmHub extends BaseStack {
  private chatbot: ChatbotSlackChannnel;
  private opsgenie: OpsGenie;
  private alarmSnsAction: AlarmSnsAction;
  private readonly config: BaseConfig;

  constructor(scope: App, config: BaseConfig) {
    super(scope, config);
    this.config = config;
    this.chatbot = this.createChatbot();
    this.opsgenie = this.createOpsGenie();
    this.alarmSnsAction = this.createAlarmSnsAction();
  }

  private createChatbot(): ChatbotSlackChannnel {
    const channelIds: ChatbotSlackChannelIds = {
      dev: 'CSLACK0DEV01',
      stg: 'CSLACK0STG01',
      prd: 'CSLACK0PRD01',
    };
    return new ChatbotSlackChannnel(this, {
      config: this.config,
      slackChannelIds: channelIds,
      slackWorkspaceId: 'WKSP1234TACO',
    });
  }

  private createOpsGenie(): OpsGenie {
    const opsGenieKeys: OpsGenieApiKeys = {
      dev: 'fake-dev-0000-0000-000000000000',
      stg: 'fake-stg-0000-0000-000000000000',
      prd: 'fake-prd-0000-0000-000000000000',
    };
    return new OpsGenie(this, { config: this.config, apiKeys: opsGenieKeys });
  }

  // AlarmSnsAction — wraps SNS topic ARNs into SnsAction objects
  // Useful when importing alarm topics from other stacks by ARN
  private createAlarmSnsAction(): AlarmSnsAction {
    this.opsgenie.outputArn();
    return new AlarmSnsAction(this, {
      config: this.config,
      snsArns: {
        opsGenie: 'arn:aws:sns:us-east-1:123456789012:fake-opsgenie-topic',
      },
    });
  }

  public getAlarmActions(): IAlarmAction[] {
    return [
      this.chatbot.getSnsAction(),
      ...this.alarmSnsAction.getSnsActions(),
    ];
  }
}
