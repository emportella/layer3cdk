import { CfnOutput } from 'aws-cdk-lib';
import {
  LoggingLevel,
  SlackChannelConfiguration,
  SlackChannelConfigurationProps,
} from 'aws-cdk-lib/aws-chatbot';
import { IAlarmAction } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import {
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
  BaseConstruct,
  StackEnv,
  constructId,
  arnExportName,
} from '../../core';
import { chatbotRoleName, slackConfigName } from '../alarms.name.conventions';
import { createAlarmTopic } from '../alarm.topic';
import { BaseConfig } from '../../core/base.config';
import { ChatbotSlackChannelProps } from '../alarms.construct.props';

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
  [key in StackEnv]: string;
};

/**
 * AWS Chatbot Slack channel integration for CloudWatch alarm notifications.
 * Creates an SNS topic, a Slack channel configuration, and the required IAM role.
 * Call {@link ChatbotSlackChannnel.getSnsAction} to wire alarms to Slack.
 *
 * @param slackChannelIds - Map of Slack channel IDs per environment (dev, stg, prd).
 * @param slackWorkspaceId - The Slack workspace ID configured in AWS Chatbot.
 */
export class ChatbotSlackChannnel extends BaseConstruct<SlackChannelConfiguration> {
  protected readonly resource: SlackChannelConfiguration;
  private readonly defaultProps: SlackChannelConfigurationProps;
  private readonly topic: Topic;
  private readonly snsAction: SnsAction;

  constructor(scope: Construct, props: ChatbotSlackChannelProps) {
    const { config, slackChannelIds, slackWorkspaceId } = props;
    const resourceName = `${config.stackEnv}-${config.domain}-chatBot-slack-alarm`;
    super(scope, 'chatbot', resourceName, config);
    this.topic = this.createTopic(config);
    this.defaultProps = {
      slackChannelConfigurationName: slackConfigName(
        config.stackEnv,
        config.domain,
      ),
      slackChannelId: this.getSlackChannelId(slackChannelIds),
      slackWorkspaceId,
      notificationTopics: [this.topic],
      loggingLevel: LoggingLevel.NONE,
      logRetention: RetentionDays.INFINITE,
      role: this.slackChannelRole(scope, config),
      guardrailPolicies: this.guardRailsPolicies(),
    };
    this.resource = new SlackChannelConfiguration(
      scope,
      constructId(config.stackName, 'chatbot-slack', resourceName),
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
    const channelId = slackChannelIds[this.config.stackEnv];
    if (!channelId) {
      throw new Error(
        `Slack channel ID is not defined for ${this.config.stackEnv} environment`,
      );
    }
    return channelId;
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
  private slackChannelRole(scope: Construct, config: BaseConfig): Role {
    return new Role(
      scope,
      constructId(config.stackName, 'chatbot-slack', 'role'),
      {
        roleName: chatbotRoleName(config.stackEnv, config.domain),
        description: 'Chatbot role for Slack channel configuration for ',
        assumedBy: new ServicePrincipal('chatbot.amazonaws.com'),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName('CloudWatchReadOnlyAccess'),
          ManagedPolicy.fromAwsManagedPolicyName('AmazonSNSReadOnlyAccess'),
        ],
      },
    );
  }

  private createTopic(config: BaseConfig): Topic {
    return createAlarmTopic(this, config, this.resourceName);
  }

  /**
   * Output the ARN of the SNS topic So other Stack can use to create their SNS action for CloudWatch alarms.
   * @param topic
   */
  public outputSNSTopicArn(): void {
    const exportName = arnExportName(this.topic.topicName);
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
   * @see BaseConstruct
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

  addPolicyStatements(...statements: PolicyStatement[]): void {
    statements.forEach((statement) => {
      this.resource.addToRolePolicy(statement);
    });
  }
}
