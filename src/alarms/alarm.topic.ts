import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { BaseConfig, constructId } from '../core';
import { alarmTopicName } from './alarms.name.conventions';
import { AlarmActionType } from './alarmAction/alarmActions.constants';

/**
 * Creates an SNS topic with a CloudWatch `sns:Publish` resource policy.
 * Used by OpsGenie and Chatbot constructs to receive alarm notifications.
 *
 * @param scope - The construct scope.
 * @param config - The BaseConfig object.
 * @param topicId - A unique identifier for the topic construct ID.
 * @param alarmActionType - Optional alarm action type appended to the topic name.
 * @returns The created SNS topic.
 */
export const createAlarmTopic = (
  scope: Construct,
  config: BaseConfig,
  topicId: string,
  alarmActionType?: AlarmActionType,
): Topic => {
  const topic = new Topic(
    scope,
    constructId(config.stackName, 'sns-cwaction', topicId),
    {
      topicName: alarmTopicName(
        config.stackEnv,
        config.domain,
        alarmActionType,
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
};
