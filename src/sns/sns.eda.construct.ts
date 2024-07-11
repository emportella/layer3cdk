import { CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  Alarm,
  ComparisonOperator,
  IAlarmAction,
  Stats,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Topic, TopicProps } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import {
  ABConfig,
  ABConstruct,
  generateEdaTopicName,
  generateOutputArnExportName,
  generateConstructId,
} from '../common';

const validateSnsFifoProps = (topicProps: TopicProps): void => {
  if (!topicProps.fifo) {
    throw new Error('EDA Standard SNS FIFO requires fifo=true');
  }
};

class SNSBase extends ABConstruct<Topic> {
  protected readonly resource: Topic;
  readonly eventName: string;
  constructor(
    scope: Construct,
    eventName: string,
    topicName: string,
    config: ABConfig,
    topicProps: TopicProps,
  ) {
    super(scope, 'eda-sns', topicName, config);
    this.eventName = eventName;
    this.resource = this.createTopic(scope, topicProps);
  }

  private createTopic(scope: Construct, topicProps: TopicProps): Topic {
    return new Topic(
      scope,
      generateConstructId(
        this.config.stackName,
        'sns',
        this.eventName + `${topicProps.fifo ? '.fifo' : ''}`,
      ),
      topicProps,
    );
  }

  public getArn(): string {
    return this.resource.topicArn;
  }

  public outputArn(): void {
    const exportName = generateOutputArnExportName(this.resourceName);
    new CfnOutput(this, exportName + '-id', {
      value: this.resource.topicArn,
      exportName: exportName,
      description: `The ARN of the EDA SNS topic ${this.resourceName} `,
    });
  }

  public grantPolicies(iamRole: Role): void {
    this.resource.grantPublish(iamRole);
  }

  public addPolicyStatements(...statements: PolicyStatement[]): void {
    statements.forEach((statement) => {
      this.resource.addToResourcePolicy(statement);
    });
  }

  public setCloudWatchAlarms(...alarmActions: IAlarmAction[]): void {
    const alarm = new Alarm(
      this,
      generateConstructId(this.config.stackName, 'cw-alarm', this.resourceName),
      {
        metric: this.resource.metricNumberOfNotificationsFailed({
          period: Duration.minutes(2),
          statistic: Stats.MAXIMUM,
        }),
        alarmName: this.resourceName + ' Notification Failed Alarm',
        threshold: 1,
        evaluationPeriods: 2,
        alarmDescription: 'Alarm if any notification fails',
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: TreatMissingData.IGNORE,
        actionsEnabled: alarmActions.length > 0 ? true : false,
      },
    );
    this.setAlarmActions(alarm, ...alarmActions);
  }

  public resourceRemovalPolicy(
    removalPolicy: RemovalPolicy.DESTROY | RemovalPolicy.RETAIN,
  ): void {
    this.resource.applyRemovalPolicy(removalPolicy);
  }
}

export class EDASns extends SNSBase {
  constructor(
    scope: Construct,
    eventName: string,
    config: ABConfig,
    topicProps?: TopicProps,
  ) {
    const defaultProp = {
      topicName: generateEdaTopicName(config.abEnv, eventName),
    };
    topicProps = { ...defaultProp, ...topicProps };
    const topicName = generateEdaTopicName(config.abEnv, eventName);
    super(scope, eventName, topicName, config, topicProps);
  }
}

export class EDASnsFifo extends SNSBase {
  constructor(
    scope: Construct,
    eventName: string,
    config: ABConfig,
    topicProps?: TopicProps,
  ) {
    const defaultProp = {
      topicName: generateEdaTopicName(config.abEnv, eventName, true),
      fifo: true,
      contentBasedDeduplication: true,
    };
    topicProps = { ...defaultProp, ...topicProps };
    validateSnsFifoProps(topicProps);
    const topicName = generateEdaTopicName(config.abEnv, eventName, true);
    super(scope, eventName, topicName, config, topicProps);
  }
}
