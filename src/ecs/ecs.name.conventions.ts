import { kebabToPascalCase } from '../util';
import { StackEnv } from '../core/constants';

/**
 * Props for ECS naming functions.
 */
export interface EcsNameProps {
  env: StackEnv;
  serviceName: string;
}

/**
 * Props for ECS resource naming functions that include a logical resource name.
 */
export interface EcsResourceNameProps extends EcsNameProps {
  name: string;
}

/**
 * Generates an ECS cluster name.
 * Format: `<env>-<ServiceName>-Cluster`
 *
 * @example
 * ```typescript
 * ecsClusterName({ env: 'dev', serviceName: 'banana-launcher' })
 * // → 'dev-BananaLauncher-Cluster'
 * ```
 */
export const ecsClusterName = (props: EcsNameProps): string => {
  const { env, serviceName } = props;
  return `${env}-${kebabToPascalCase(serviceName)}-Cluster`;
};

/**
 * Generates an ECS Fargate service name.
 * Format: `<env>-<ServiceName>-<Name>`
 *
 * @example
 * ```typescript
 * ecsServiceName({ env: 'dev', serviceName: 'banana-launcher', name: 'api-gateway' })
 * // → 'dev-BananaLauncher-ApiGateway'
 * ```
 */
export const ecsServiceName = (props: EcsResourceNameProps): string => {
  const { env, serviceName, name } = props;
  return `${env}-${kebabToPascalCase(serviceName)}-${kebabToPascalCase(name)}`;
};

/**
 * Generates an ECS task definition family name.
 * Format: `<env>-<ServiceName>-<Name>`
 *
 * @example
 * ```typescript
 * ecsTaskDefinitionFamily({ env: 'dev', serviceName: 'banana-launcher', name: 'api-gateway' })
 * // → 'dev-BananaLauncher-ApiGateway'
 * ```
 */
export const ecsTaskDefinitionFamily = (
  props: EcsResourceNameProps,
): string => {
  const { env, serviceName, name } = props;
  return `${env}-${kebabToPascalCase(serviceName)}-${kebabToPascalCase(name)}`;
};

/**
 * Generates a CloudWatch log group name for an ECS service.
 * Format: `/ecs/<env>-<ServiceName>-<Name>`
 *
 * @example
 * ```typescript
 * ecsLogGroupName({ env: 'dev', serviceName: 'banana-launcher', name: 'api-gateway' })
 * // → '/ecs/dev-BananaLauncher-ApiGateway'
 * ```
 */
export const ecsLogGroupName = (props: EcsResourceNameProps): string => {
  const { env, serviceName, name } = props;
  return `/ecs/${env}-${kebabToPascalCase(serviceName)}-${kebabToPascalCase(name)}`;
};
