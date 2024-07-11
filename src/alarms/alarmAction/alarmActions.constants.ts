/**
 * Represents the type of alarm action.
 * Possible values are 'opsGenie', 'googleChat'(not currently supported), or slack.
 */
export type AlarmActionType = 'opsGenie' | 'googleChat' | 'slack';

/**
 * Represents a mapping of alarm action types to their corresponding SNS topic ARNs.
 */
export type AlarmActionMap = { [key in AlarmActionType]?: string | undefined };
