import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { ITopic, Topic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { BaseConfig, BaseConstruct, constructId } from '../../core';
import { alarmTopicName } from '../alarms.name.conventions';
import { AlarmActionMap, AlarmActionType } from './alarmActions.constants';

/**
 * SNS action construct
 * This construct is used to manage SNS actions for CloudWatch alarms, created elsewhere.
 * @constructor
 * @param scope - The parent construct (Construct).
 * @param config - The configuration object (BaseConfig).
 * @param snsArns - The ARNs of the SNS topics to associate with the SNS actions (AlarmActionMap)
 */
export default class AlarmSnsAction extends BaseConstruct<
  Map<string, SnsAction>
> {
  protected resource: Map<string, SnsAction> = new Map();
  private topic: ITopic[];

  constructor(scope: Construct, config: BaseConfig, snsArns: AlarmActionMap) {
    super(
      scope,
      'sns-cwaction',
      alarmTopicName(config.stackEnv, config.domain),
      config,
    );
    this.topic = [];
    for (const [key, value] of Object.entries(snsArns)) {
      if (value) {
        const topic = Topic.fromTopicArn(
          scope,
          constructId(config.stackName, 'sns-cwaction', `topic-${key}`),
          value,
        ) as Topic;
        this.topic.push(topic);
        this.resource.set(key, new SnsAction(topic));
      }
    }
  }

  /**
   * Retrieves the SNS action for the specified alarm action type.
   *
   * @param type - The type of alarm action.
   * @returns The SNS action for the specified type.
   */
  public getSnsAction(type: AlarmActionType): SnsAction {
    return this.resource.get(type) as SnsAction;
  }

  /**
   * Retrieves the SNS actions associated with this construct.
   *
   * @returns A map of SNS actions, where the key is the action name and the value is the SnsAction object.
   */
  public getMapSnsActions(): Map<string, SnsAction> {
    return this.resource;
  }

  /**
   * Retrieves an array of SnsAction objects.
   *
   * @returns An array of SnsAction objects.
   */
  public getSnsActions(): SnsAction[] {
    return Array.from(this.resource.values());
  }

  /**
   * Retrieves the ARNs of the SNS topics associated with this construct.
   *
   * @returns The ARNs of the SNS topics.
   */
  public getArns(): string[] {
    return this.topic.flatMap((topic) => topic.topicArn);
  }
}
