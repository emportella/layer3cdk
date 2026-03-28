import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Tracing } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { BaseEnvProps } from '../core';

/**
 * Alarm threshold configuration for Lambda constructs.
 * These values determine when CloudWatch alarms fire for errors, duration, and throttles.
 */
export type LambdaAlarmThresholds = {
  /** Error count threshold. Alarm fires when errors >= this value. */
  alarmErrorThreshold: number;
  /** Duration threshold in milliseconds. Alarm fires when average duration >= this value. */
  alarmDurationThresholdMs: number;
  /** Throttle count threshold. Alarm fires when throttles >= this value. */
  alarmThrottleThreshold: number;
};

/**
 * Environment-resolved Lambda configuration.
 *
 * Controls memory, timeout, tracing, log retention, removal policy,
 * and alarm thresholds. All values are overridable per-environment
 * via {@link BaseEnvProps}.
 *
 * @see {@link LAMBDA_ENVIRONMENTS_PROPS} for the built-in defaults.
 */
export type LambdaConfig = {
  /** Memory allocated to the Lambda function in MB. */
  memorySize: number;
  /** Maximum execution time before the function is killed. */
  timeout: Duration;
  /** AWS X-Ray tracing mode. */
  tracing: Tracing;
  /** CloudWatch Logs retention period for the function's log group. */
  logRetentionDays: RetentionDays;
  /** Stack removal policy — DESTROY in dev, RETAIN in prd. */
  removalPolicy: RemovalPolicy;
} & LambdaAlarmThresholds;

/**
 * Built-in environment-specific defaults for Lambda constructs.
 *
 * | Property | default (dev/stg) | prd |
 * |----------|------------------|-----|
 * | memorySize | 256 MB | 512 MB |
 * | timeout | 30 s | 30 s |
 * | tracing | DISABLED | ACTIVE |
 * | logRetentionDays | ONE_WEEK (7 d) | ONE_MONTH (30 d) |
 * | removalPolicy | DESTROY | RETAIN |
 * | alarmErrorThreshold | 5 | 1 |
 * | alarmDurationThresholdMs | 25 000 | 25 000 |
 * | alarmThrottleThreshold | 3 | 1 |
 *
 * Override per-environment via `lambdaConfig` on the construct props:
 * ```typescript
 * lambdaConfig: {
 *   default: { memorySize: 512 },
 *   prd: { memorySize: 2048, alarmErrorThreshold: 0 },
 * }
 * ```
 */
export const LAMBDA_ENVIRONMENTS_PROPS: BaseEnvProps<LambdaConfig> = {
  default: {
    memorySize: 256,
    timeout: Duration.seconds(30),
    tracing: Tracing.DISABLED,
    logRetentionDays: RetentionDays.ONE_WEEK,
    removalPolicy: RemovalPolicy.DESTROY,
    alarmErrorThreshold: 5,
    alarmDurationThresholdMs: 25000,
    alarmThrottleThreshold: 3,
  },
  prd: {
    memorySize: 512,
    timeout: Duration.seconds(30),
    tracing: Tracing.ACTIVE,
    logRetentionDays: RetentionDays.ONE_MONTH,
    removalPolicy: RemovalPolicy.RETAIN,
    alarmErrorThreshold: 1,
    alarmDurationThresholdMs: 25000,
    alarmThrottleThreshold: 1,
  },
};

export { LogGroup, RetentionDays };
