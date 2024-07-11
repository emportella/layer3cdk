import { Topic } from 'aws-cdk-lib/aws-sns';
import { UrlSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { OPSGENIE_PATH } from './opsgenie.constants';
import {
  ABConfig,
  ABConstruct,
  ABEnvironment,
  generateConstructId,
  generateOutputArnExportName,
  generateSnsActionTopicName,
} from '../../common';
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { IAlarmAction } from 'aws-cdk-lib/aws-cloudwatch';

/**
 * Represents a mapping of OpsGenie API keys for different environments.
 */
export type OpsGenieApiKeys = {
  [key in ABEnvironment]: string;
};

/**
 * Represents an OpsGenie construct.
 */
export class OpsGenie extends ABConstruct<SnsAction> {
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
  public constructor(
    scope: Construct,
    apiKeys: OpsGenieApiKeys,
    config: ABConfig,
  ) {
    const resourceName = `${config.abEnv}-${config.domain}-opsgenie`;
    super(
      scope,
      'sns-cwaction',
      generateConstructId(config.stackName, 'sns-cwaction', resourceName),
      config,
    );
    this.apiKey = apiKeys[config.abEnv];
    this.topic = this.createTopic(scope, config);
    this.resource = new SnsAction(this.topic);
    this.subscribe();
    this.outputArn();
  }

  /**
   * Subscribes to the OpsGenie topic.
   */
  private subscribe() {
    this.topic.addSubscription(
      new UrlSubscription(`${OPSGENIE_PATH}${this.apiKey}`),
    );
  }

  /**
   * Creates an SNS topic for OpsGenie.
   * @param scope The construct scope.
   * @param config The ABConfig object.
   * @returns The created SNS topic.
   */
  private createTopic(scope: Construct, config: ABConfig): Topic {
    const topic = new Topic(
      scope,
      generateConstructId(config.stackName, 'sns-cwaction', 'opsgenie-topic'),
      {
        topicName: generateSnsActionTopicName(
          config.abEnv,
          config.domain,
          'opsGenie',
        ),
      },
    );
    topic.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sns:Publish'],
        resources: [topic.topicArn],
        principals: [new ServicePrincipal('cloudwatch.amazonaws.com')],
      }),
    );
    return topic;
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

  protected outputArn(): void {
    const exportName = generateOutputArnExportName(this.resourceName);
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected grantPolicies(iamRole: Role): void {
    throw new Error('Method not implemented.');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected addPolicyStatements(...statements: PolicyStatement[]): void {
    throw new Error('Method not implemented.');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected setCloudWatchAlarms(...alarmActions: IAlarmAction[]): void {
    throw new Error('Method not implemented.');
  }
}
