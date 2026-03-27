import { Topic } from 'aws-cdk-lib/aws-sns';
import { UrlSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { OPSGENIE_PATH } from './opsgenie.constants';
import {
  BaseConfig,
  BaseConstruct,
  constructId,
  arnExportName,
} from '../../core';
import { OpsGenieProps } from '../alarms.construct.props';
import { createAlarmTopic } from '../alarm.topic';
import { Construct } from 'constructs';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';

/**
 * Represents a mapping of OpsGenie API keys for different environments.
 */
export type OpsGenieApiKeys = Record<string, string>;

/**
 * Represents an OpsGenie construct.
 */
export class OpsGenie extends BaseConstruct<SnsAction> {
  private readonly apiKey: string;
  private readonly topic: Topic;
  protected readonly resource: SnsAction;

  /**
   * Constructs an instance of the OpsGenieConstruct.
   *
   * @param scope - The parent construct.
   * @param apiKeys - The OpsGenie API keys.
   * @param config - The configuration object.
   */
  public constructor(scope: Construct, props: OpsGenieProps) {
    const { config, apiKeys } = props;
    const resourceName = `${config.stackEnv}-${config.department}-opsgenie`;
    super(
      scope,
      'sns-cwaction',
      constructId(config.stackName, 'sns-cwaction', resourceName),
      config,
    );
    this.apiKey = apiKeys[config.stackEnv];
    this.topic = this.createTopic(scope, config);
    this.resource = new SnsAction(this.topic);
    this.subscribe();
  }

  /**
   * Subscribes to the OpsGenie topic.
   */
  private subscribe() {
    this.topic.addSubscription(
      new UrlSubscription(`${OPSGENIE_PATH}${this.apiKey}`),
    );
  }

  private createTopic(scope: Construct, config: BaseConfig): Topic {
    return createAlarmTopic(scope, config, 'opsgenie-topic', 'opsGenie');
  }

  /**
   * Gets the SNS action for OpsGenie.
   * @returns The SNS action.
   */
  public getSnsAction(): SnsAction {
    return this.resource;
  }

  /**
   * Retrieves the ARN (Amazon Resource Name) of the topic associated with this OpsGenie construct.
   * @returns The ARN of the topic.
   */
  protected getArn(): string {
    return this.topic.topicArn;
  }

  public outputArn(): void {
    const exportName = arnExportName(this.resourceName);
    new CfnOutput(this, exportName + '-id', {
      value: this.topic.topicArn,
      exportName: exportName,
      description: `The ARN of the OpsGenie SNS topic ${this.resourceName}`,
    });
  }

  public resourceRemovalPolicy(
    removalPolicy: RemovalPolicy.DESTROY | RemovalPolicy.RETAIN,
  ): void {
    this.topic.applyRemovalPolicy(removalPolicy);
  }
}
