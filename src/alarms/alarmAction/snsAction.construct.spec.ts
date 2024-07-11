import { Stack } from 'aws-cdk-lib';
import { ABConfig } from '../../common';
import ABSnsAction from './snsAction.construct';
import { testAbConfig } from '../../test/common.test.const';

describe('SNSAction', () => {
  let stack: Stack;
  let config: ABConfig;
  let snsAction: ABSnsAction;
  beforeEach(() => {
    stack = new Stack();
    config = testAbConfig;
  });
  it('should create an SNS action construct', () => {
    snsAction = new ABSnsAction(stack, config, {
      opsGenie: 'arn:aws:sns:us-east-1:123456789012:opsGenieTopic',
    });
    expect(snsAction).toBeDefined();
  });
  it('should create an SNS action construct', () => {
    snsAction = new ABSnsAction(stack, config, {
      opsGenie: 'arn:aws:sns:us-east-1:123456789012:opsGenieTopic',
    });
    expect(snsAction).toBeDefined();
  });
  it('should retrieve the SNS action for the specified alarm action type', () => {
    snsAction = new ABSnsAction(stack, config, {
      opsGenie: 'arn:aws:sns:us-east-1:123456789012:opsGenieTopic',
    });
    const snsActionType = 'opsGenie';
    const retrievedSnsAction = snsAction.getSnsAction(snsActionType);
    expect(retrievedSnsAction).toBeDefined();
  });
  it('should retrieve the ARNs of the SNS topics associated with this construct', () => {
    snsAction = new ABSnsAction(stack, config, {
      opsGenie: 'arn:aws:sns:us-east-1:123456789012:opsGenieTopic',
    });
    const snsTopicArns = snsAction.getArns();
    expect(snsTopicArns.length).toEqual(1);
    expect(snsTopicArns[0]).toEqual(
      'arn:aws:sns:us-east-1:123456789012:opsGenieTopic',
    );
  });
});
