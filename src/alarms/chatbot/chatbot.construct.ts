import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import {
  LoggingLevel,
  SlackChannelConfiguration,
  SlackChannelConfigurationProps,
} from 'aws-cdk-lib/aws-chatbot';
import { IAlarmAction } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import {
  Effect,
  IManagedPolicy,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import {
  ABConstruct,
  ABEnvironment,
  generateChatBotRoleName,
  generateConstructId,
  generateOutputArnExportName,
  generateSlackConfigurationName,
  generateSnsActionTopicName,
} from '../../common';
import { ABConfig } from '../../common/ab.config';

/**
 * Slack channel configuration for AWS Chatbot
 * It is advisable that for each environment, you create a separate Slack channel.
 * For example, you can create a channel called #alarms-<env>-<domain>. This way we can easily identify which environment the alarm is coming from.
 * For teh ChannelId, choose the channel that you want to use. AWS Chatbot supports both public and private channels.
 * To configure a private channel with AWS Chatbot:
 * In Slack, copy the Channel ID of the private channel by right-clicking on the channel name in the left pane and choosing Copy Link. The Channel ID is the string at the end of the URL (for example, AB3BBLZZ8YY).
 * Run the /invite `@AWS` command in Slack to invite the AWS Chatbot to the channel.
 * @see https://docs.aws.amazon.com/chatbot/latest/adminguide/slack-setup.html
 */
export type ChatbotSlackChannelIds = {
  [key in ABEnvironment]: string;
};

export class ChatbotSlackChannnel extends ABConstruct<SlackChannelConfiguration> {
  protected readonly resource: SlackChannelConfiguration;
  private readonly defaultProps: SlackChannelConfigurationProps;
  private readonly topic: Topic;
  private readonly snsAction: SnsAction;

  constructor(
    scope: Construct,
    slackChannelIds: ChatbotSlackChannelIds,
    config: ABConfig,
  ) {
    const resourceName = `${config.abEnv}-${config.domain}-chatBot-slack-alarm`;
    super(scope, 'chatbot', resourceName, config);
    this.topic = this.createTopic(config);
    this.defaultProps = {
      slackChannelConfigurationName: generateSlackConfigurationName(
        config.abEnv,
        config.domain,
      ),
      slackChannelId: this.getSlackChannelId(slackChannelIds),
      slackWorkspaceId: 'T04TK4S51',
      notificationTopics: [this.topic],
      loggingLevel: LoggingLevel.NONE,
      logRetention: RetentionDays.INFINITE,
      role: this.slackChannelRole(scope, config),
      guardrailPolicies: this.guardRailsPolicies(),
    };
    this.resource = new SlackChannelConfiguration(
      scope,
      generateConstructId(config.stackName, 'chatbot-slack', resourceName),
      this.defaultProps,
    );
    this.snsAction = new SnsAction(this.topic);
  }

  /**
   * Get the Slack channel ID based on the environment
   * @param slackChannelIds
   * @returns string
   */
  private getSlackChannelId(slackChannelIds: ChatbotSlackChannelIds): string {
    try {
      return slackChannelIds[this.config.abEnv];
    } catch (error) {
      throw new Error(
        `Slack channel ID is not defined for ${this.config.abEnv} environment`,
      );
    }
  }

  /**
   * Guardrails policies required for the Slack channel configuration:
   * - CloudWatchReadOnlyAccess
   * @returns IManagedPolicy[]
   */
  private guardRailsPolicies(): IManagedPolicy[] {
    return [ManagedPolicy.fromAwsManagedPolicyName('CloudWatchReadOnlyAccess')];
  }

  /**
   * Based on the AWS Chatbot documentation, the following policies are required for the Slack channel configuration:
   * - AWSChatbotServicePolicy
   * - CloudWatchReadOnlyAccess
   * - AmazonSNSReadOnlyAccess
   * Role name: <env>-<domain>-chatbot-slack-role
   * @returns Role
   */
  private slackChannelRole(scope: Construct, config: ABConfig): Role {
    return new Role(
      scope,
      generateConstructId(config.stackName, 'chatbot-slack', 'role'),
      {
        roleName: generateChatBotRoleName(config.abEnv, config.domain),
        description: 'Chatbot role for Slack channel configuration for ',
        assumedBy: new ServicePrincipal('chatbot.amazonaws.com'),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName('CloudWatchReadOnlyAccess'),
          ManagedPolicy.fromAwsManagedPolicyName('AmazonSNSReadOnlyAccess'),
        ],
      },
    );
  }

  /**
   * Create the SNS topic for the Slack channel configuration
   * @returns Topic
   */
  private createTopic(config: ABConfig): Topic {
    const topic = new Topic(
      this,
      generateConstructId(config.stackName, 'sns-cwaction', this.resourceName),
      {
        topicName: generateSnsActionTopicName(config.abEnv, config.domain),
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
   * Output the ARN of the SNS topic So other Stack can use to create their SNS action for CloudWatch alarms.
   * @param topic
   */
  public outputSNSTopicArn(): void {
    const exportName = generateOutputArnExportName(this.topic.topicName);
    new CfnOutput(this, exportName + '-id', {
      value: this.topic.topicArn,
      exportName: exportName,
      description: `The ARN of the Alarm SNS topic  `,
    });
  }

  /**
   * Get the ARN of the Slack channel configuration
   * @returns string
   * @override
   * @see ABConstruct
   */
  public getArn(): string {
    return this.resource.slackChannelConfigurationArn;
  }

  /**
   * ChatbotSlackChannnel provides a SNS action for CloudWatch alarms so that the alarm can send notifications to the Slack channel.
   * @returns snsAction
   */
  public getSnsAction(): IAlarmAction {
    return this.snsAction;
  }

  /**
   * Not implemented | ChatbotSlackChannnel does not provide any output
   */
  protected outputArn(): void {
    throw new Error('Method not implemented.');
  }
  /**
   * Not implemented | ChatbotSlackChannnel does not need to grant any policies
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected grantPolicies(iamRole: Role): void {
    throw new Error('Method not implemented.');
  }
  addPolicyStatements(...statements: PolicyStatement[]): void {
    statements.forEach((statement) => {
      this.resource.addToRolePolicy(statement);
    });
  }
  /**
   * Not implemented | ChatbotSlackChannnel does not need to set any CloudWatch alarms
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected setCloudWatchAlarms(...alarmActions: IAlarmAction[]): void {
    throw new Error('Method not implemented.');
  }
  protected resourceRemovalPolicy(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    removalPolicy: RemovalPolicy.DESTROY | RemovalPolicy.RETAIN,
  ): void {
    throw new Error('Method not implemented.');
  }
}
