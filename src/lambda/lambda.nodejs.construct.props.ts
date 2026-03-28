import {
  BundlingOptions,
  NodejsFunctionProps,
} from 'aws-cdk-lib/aws-lambda-nodejs';
import { BaseConstructProps } from '../core/base.construct.props';
import { BaseEnvProps } from '../core/base.construct.env.props';
import { LambdaConfig } from './lambda.default.props';

/**
 * Props for the {@link NodejsLambdaFunction} construct.
 *
 * Use this construct for **Node.js / TypeScript** Lambda functions.
 * It wraps CDK's `NodejsFunction` with automatic esbuild bundling,
 * Layer3CDK naming, alarms, and environment-specific defaults.
 *
 * Requires `esbuild` as a dev dependency in the consumer project (`npm i -D esbuild`).
 *
 * For other runtimes (Python, Go, Java, etc.), use {@link LambdaFunctionProps} instead.
 *
 * ### Generated resource names
 * - **Function**: `<env>-<ServiceName>-<FunctionName>` (e.g. `dev-BananaLauncher-ProcessOrders`)
 * - **LogGroup**: `/aws/lambda/<env>-<ServiceName>-<FunctionName>`
 *
 * ### How bundling works
 * 1. Point `entry` to a `.ts` or `.js` file in your project.
 * 2. esbuild transpiles, tree-shakes, and bundles it into a single file.
 * 3. `cdk deploy` uploads the bundle to the CDK bootstrap S3 bucket.
 * 4. AWS Lambda pulls the code from S3 when creating/updating the function.
 *
 * @example
 * ```typescript
 * // Minimal — esbuild auto-discovers tsconfig and lock file
 * new NodejsLambdaFunction(stack, {
 *   config,
 *   functionName: 'process-orders',
 *   entry: path.join(__dirname, '../src/handlers/process-orders.ts'),
 * });
 *
 * // With bundling options and custom handler
 * new NodejsLambdaFunction(stack, {
 *   config,
 *   functionName: 'send-email',
 *   entry: path.join(__dirname, '../src/handlers/send-email.ts'),
 *   handler: 'main',
 *   bundling: { minify: true, sourceMap: true, externalModules: ['@aws-sdk/*'] },
 * });
 * ```
 */
export interface NodejsLambdaFunctionProps extends BaseConstructProps {
  /**
   * Logical function name used in resource naming.
   * Will be PascalCased in the generated AWS function name.
   * @example 'process-orders' → 'dev-BananaLauncher-ProcessOrders'
   */
  functionName: string;

  /**
   * Absolute path to the entry TypeScript or JavaScript file.
   * esbuild uses this as the entrypoint for bundling.
   * @example path.join(__dirname, '../src/handlers/process-orders.ts')
   */
  entry: string;

  /**
   * Name of the exported handler function in the entry file.
   * @default 'handler'
   * @example 'handler', 'main', 'processEvent'
   */
  handler?: string;

  /**
   * esbuild bundling options.
   * Controls minification, source maps, external modules, etc.
   * @see https://esbuild.github.io/api/
   *
   * @example
   * ```typescript
   * bundling: {
   *   minify: true,
   *   sourceMap: true,
   *   externalModules: ['@aws-sdk/*'],
   *   define: { 'process.env.NODE_ENV': '"production"' },
   * }
   * ```
   */
  bundling?: BundlingOptions;

  /**
   * Optional environment-aware overrides for library defaults.
   * Deep-merged on top of {@link LAMBDA_ENVIRONMENTS_PROPS}.
   *
   * @example
   * ```typescript
   * lambdaConfig: {
   *   default: { memorySize: 512, alarmErrorThreshold: 10 },
   *   prd: { memorySize: 1024 },
   * }
   * ```
   */
  lambdaConfig?: BaseEnvProps<LambdaConfig>;

  /**
   * Optional raw CDK `NodejsFunctionProps` overrides.
   * Spread last — wins over everything including resolved library defaults.
   * Use for properties not modelled by `LambdaConfig` (e.g. VPC, layers, environment variables).
   *
   * @example
   * ```typescript
   * functionProps: {
   *   environment: { TABLE_NAME: 'my-table' },
   *   vpc: myVpc,
   * }
   * ```
   */
  functionProps?: Partial<NodejsFunctionProps>;
}
