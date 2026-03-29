import { Code, FunctionProps, Runtime } from 'aws-cdk-lib/aws-lambda';
import { BaseConstructProps } from '../core/base.construct.props';
import { BaseEnvProps } from '../core/base.construct.env.props';
import { LambdaConfig } from './lambda.default.props';
import { StackEnv } from '../core/constants';

/**
 * Props for the {@link lambdaFunctionName} naming function.
 */
export interface LambdaFunctionNameProps {
  /** Stack environment (e.g. `'dev'`, `'prd'`). */
  env: StackEnv;
  /** Service name — will be PascalCased in the output. */
  serviceName: string;
  /** Logical function name — will be PascalCased in the output. */
  functionName: string;
}

/**
 * Callback that returns the Lambda {@link Code} bundle.
 *
 * Consumers provide a zero-argument function that returns a `Code` object.
 * This defers code resolution to construct-instantiation time, which is useful
 * when the code path depends on config or environment.
 *
 * @example
 * ```typescript
 * // From a local directory (most common — CDK zips and uploads to S3)
 * codeProvider: () => Code.fromAsset(path.join(__dirname, 'handlers/process-orders'))
 *
 * // Inline code (small scripts only, max 4 KB)
 * codeProvider: () => Code.fromInline('exports.handler = async () => ({ statusCode: 200 })')
 *
 * // Pre-uploaded S3 artifact
 * codeProvider: () => Code.fromBucket(deployBucket, 'lambda/process-orders.zip')
 *
 * // Docker-based build
 * codeProvider: () => Code.fromDockerBuild(path.join(__dirname, 'handlers/process-orders'))
 * ```
 */
export type LambdaCodeProvider = () => Code;

/**
 * Props for the {@link LambdaFunction} construct.
 *
 * Use this construct for **any Lambda runtime** (Node.js, Python, Go, Java, .NET, etc.).
 * Code is provided via a `codeProvider` callback — see {@link LambdaCodeProvider}.
 *
 * For Node.js/TypeScript projects with automatic esbuild bundling,
 * prefer {@link NodejsLambdaFunctionProps} instead.
 *
 * ### Generated resource names
 * - **Function**: `<env>-<ServiceName>-<FunctionName>` (e.g. `dev-BananaLauncher-ProcessOrders`)
 * - **LogGroup**: `/aws/lambda/<env>-<ServiceName>-<FunctionName>`
 *
 * ### Environment-specific defaults
 * Memory, timeout, tracing, log retention, and alarm thresholds are resolved from
 * {@link LAMBDA_ENVIRONMENTS_PROPS}. Override per-environment via `lambdaConfig`.
 * Any CDK-level property can be overridden via `functionProps` (spread last).
 *
 * @example
 * ```typescript
 * new LambdaFunction(stack, {
 *   config,
 *   functionName: 'process-orders',
 *   runtime: Runtime.NODEJS_20_X,
 *   handler: 'index.handler',
 *   codeProvider: () => Code.fromAsset(path.join(__dirname, 'handlers/process-orders')),
 * });
 * ```
 */
export interface LambdaFunctionProps extends BaseConstructProps {
  /**
   * Logical function name used in resource naming.
   * Will be PascalCased in the generated AWS function name.
   * @example 'process-orders' → 'dev-BananaLauncher-ProcessOrders'
   */
  functionName: string;

  /**
   * Lambda runtime.
   * @example Runtime.NODEJS_20_X, Runtime.PYTHON_3_12, Runtime.PROVIDED_AL2023
   */
  runtime: Runtime;

  /**
   * The entry point handler in the format `<file>.<export>`.
   * @example 'index.handler', 'app.lambda_handler'
   */
  handler: string;

  /**
   * Callback that returns the Lambda code bundle.
   * Called once during construction. See {@link LambdaCodeProvider} for examples.
   */
  codeProvider: LambdaCodeProvider;

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
  lambdaConfig?: BaseEnvProps<Partial<LambdaConfig>>;

  /**
   * Optional raw CDK `FunctionProps` overrides.
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
  functionProps?: Partial<FunctionProps>;
}
