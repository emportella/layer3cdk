import { kebabToPascalCase } from '../util';
import { LambdaFunctionNameProps } from './lambda.construct.props';

/**
 * Generates a Lambda function name following the Layer3CDK convention.
 *
 * Format: `<env>-<ServiceName>-<FunctionName>`
 *
 * Both `serviceName` and `functionName` are PascalCased. Accepts kebab-case
 * or PascalCase input — both produce the same output.
 *
 * This name is used for:
 * - The AWS Lambda function name
 * - The CloudWatch LogGroup: `/aws/lambda/<name>`
 * - CloudWatch alarm prefixes
 *
 * @example
 * ```typescript
 * lambdaFunctionName({ env: 'dev', serviceName: 'banana-launcher', functionName: 'process-orders' })
 * // → 'dev-BananaLauncher-ProcessOrders'
 *
 * lambdaFunctionName({ env: 'prd', serviceName: 'BananaLauncher', functionName: 'ProcessOrders' })
 * // → 'prd-BananaLauncher-ProcessOrders'
 * ```
 */
export const lambdaFunctionName = (props: LambdaFunctionNameProps): string => {
  const { env, serviceName, functionName } = props;
  return `${env}-${kebabToPascalCase(serviceName)}-${kebabToPascalCase(functionName)}`;
};
