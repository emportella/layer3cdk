import { BaseConstructProps } from '../core/base.construct.props';
import { Domain, StackEnv } from '../core/constants';
import { ChatbotSlackChannelIds } from './chatbot/chatbot.construct';
import { OpsGenieApiKeys } from './OpsGenie/opsgenie.construct';
import {
  AlarmActionMap,
  AlarmActionType,
} from './alarmAction/alarmActions.constants';

/**
 * Props for {@link alarmTopicName} naming function.
 */
export interface AlarmTopicNameProps {
  env: StackEnv;
  domain: Domain;
  alarmActionType?: AlarmActionType;
}

/**
 * Props for {@link ChatbotSlackChannnel} construct.
 */
export interface ChatbotSlackChannelProps extends BaseConstructProps {
  slackChannelIds: ChatbotSlackChannelIds;
  slackWorkspaceId: string;
}

/**
 * Props for {@link OpsGenie} construct.
 */
export interface OpsGenieProps extends BaseConstructProps {
  apiKeys: OpsGenieApiKeys;
}

/**
 * Props for {@link AlarmSnsAction} construct.
 */
export interface AlarmSnsActionProps extends BaseConstructProps {
  snsArns: AlarmActionMap;
}
