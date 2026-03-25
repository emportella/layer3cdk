import { Stack } from 'aws-cdk-lib';
import { BaseConfig } from '../../core';
import AlarmSnsAction from './snsAction.construct';
import { testconfig } from '../../test/common.test.const';

describe('SNSAction', () => {
  let stack: Stack;
  let config: BaseConfig;
  let snsAction: AlarmSnsAction;
  beforeEach(() => {
    stack = new Stack();
    config = testconfig;
  });
  it('should create an SNS action construct', () => {
    snsAction = new AlarmSnsAction(stack, config, {
      opsGenie: 'arn:aws:sns:us-east-1:123456789012:opsGenieTopic',
    });
    expect(snsAction).toBeDefined();
  });
  it('should return the map of SNS actions', () => {
    snsAction = new AlarmSnsAction(stack, config, {
      opsGenie: 'arn:aws:sns:us-east-1:123456789012:opsGenieTopic',
    });
    const actionsMap = snsAction.getMapSnsActions();
    expect(actionsMap.size).toEqual(1);
    expect(actionsMap.has('opsGenie')).toBe(true);
  });
  it('should retrieve the SNS action for the specified alarm action type', () => {
    snsAction = new AlarmSnsAction(stack, config, {
      opsGenie: 'arn:aws:sns:us-east-1:123456789012:opsGenieTopic',
    });
    const snsActionType = 'opsGenie';
    const retrievedSnsAction = snsAction.getSnsAction(snsActionType);
    expect(retrievedSnsAction).toBeDefined();
  });
  it('should retrieve the ARNs of the SNS topics associated with this construct', () => {
    snsAction = new AlarmSnsAction(stack, config, {
      opsGenie: 'arn:aws:sns:us-east-1:123456789012:opsGenieTopic',
    });
    const snsTopicArns = snsAction.getArns();
    expect(snsTopicArns.length).toEqual(1);
    expect(snsTopicArns[0]).toEqual(
      'arn:aws:sns:us-east-1:123456789012:opsGenieTopic',
    );
  });
});
