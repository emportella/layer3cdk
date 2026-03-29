import { RemovalPolicy } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { BaseEnvProps } from '../core';

/**
 * Alarm threshold configuration for ECS Fargate services.
 */
export type EcsServiceAlarmThresholds = {
  /** CPU utilization percentage threshold. Alarm fires when AVG >= this value. */
  alarmCpuThreshold: number;
  /** Memory utilization percentage threshold. Alarm fires when AVG >= this value. */
  alarmMemoryThreshold: number;
  /** Minimum running task count. Alarm fires when running tasks < this value. */
  alarmMinRunningTasks: number;
};

/**
 * Environment-resolved ECS Fargate service configuration.
 *
 * Controls CPU, memory, desired task count, logging, and alarm thresholds.
 * All values are overridable per-environment via {@link BaseEnvProps}.
 *
 * @see {@link ECS_SERVICE_ENVIRONMENTS_PROPS} for the built-in defaults.
 */
export type EcsServiceConfig = {
  /** Fargate CPU units (256, 512, 1024, 2048, 4096). */
  cpu: number;
  /** Fargate memory in MiB. Must be a valid combination with `cpu`. */
  memoryLimitMiB: number;
  /** Number of tasks to run. */
  desiredCount: number;
  /** CloudWatch Logs retention period for the service's log group. */
  logRetentionDays: RetentionDays;
  /** Stack removal policy — DESTROY in dev, RETAIN in prd. */
  removalPolicy: RemovalPolicy;
  /** Enable Container Insights on the cluster. */
  containerInsights: boolean;
} & EcsServiceAlarmThresholds;

/**
 * Built-in environment-specific defaults for ECS Fargate services.
 *
 * | Property | default (dev/stg) | prd |
 * |----------|------------------|-----|
 * | cpu | 256 | 512 |
 * | memoryLimitMiB | 512 | 1024 |
 * | desiredCount | 1 | 2 |
 * | logRetentionDays | ONE_WEEK (7 d) | ONE_MONTH (30 d) |
 * | removalPolicy | DESTROY | RETAIN |
 * | containerInsights | false | true |
 * | alarmCpuThreshold | 80% | 70% |
 * | alarmMemoryThreshold | 80% | 70% |
 * | alarmMinRunningTasks | 1 | 2 |
 *
 * Override per-environment via `ecsServiceConfig` on the construct props.
 */
export const ECS_SERVICE_ENVIRONMENTS_PROPS: BaseEnvProps<EcsServiceConfig> = {
  default: {
    cpu: 256,
    memoryLimitMiB: 512,
    desiredCount: 1,
    logRetentionDays: RetentionDays.ONE_WEEK,
    removalPolicy: RemovalPolicy.DESTROY,
    containerInsights: false,
    alarmCpuThreshold: 80,
    alarmMemoryThreshold: 80,
    alarmMinRunningTasks: 1,
  },
  prd: {
    cpu: 512,
    memoryLimitMiB: 1024,
    desiredCount: 2,
    logRetentionDays: RetentionDays.ONE_MONTH,
    removalPolicy: RemovalPolicy.RETAIN,
    containerInsights: true,
    alarmCpuThreshold: 70,
    alarmMemoryThreshold: 70,
    alarmMinRunningTasks: 2,
  },
};
