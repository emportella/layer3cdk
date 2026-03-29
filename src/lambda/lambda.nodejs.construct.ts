import {
  NodejsFunction,
  NodejsFunctionProps,
} from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { resolveEnvProps } from '../core/base.construct.env.props';
import { NodejsLambdaFunctionProps } from './lambda.nodejs.construct.props';
import { lambdaFunctionName } from './lambda.name.conventions';
import { LambdaBase } from './lambda.base';
import {
  LambdaAlarmThresholds,
  LAMBDA_ENVIRONMENTS_PROPS,
} from './lambda.default.props';

/**
 * Node.js / TypeScript Lambda construct with **automatic esbuild bundling**.
 *
 * Wraps CDK's `NodejsFunction` with Layer3CDK naming, CloudWatch alarms,
 * and environment-specific defaults. Point `entry` to a `.ts` or `.js` file
 * and esbuild handles transpilation, tree-shaking, and bundling.
 *
 * Requires `esbuild` as a dev dependency in the consumer project: `npm i -D esbuild`.
 *
 * For **other runtimes** (Python, Go, Java, etc.), use {@link LambdaFunction} instead.
 *
 * ### What gets created
 * - `AWS::Lambda::Function` — named `<env>-<ServiceName>-<FunctionName>`
 * - `AWS::Logs::LogGroup` — named `/aws/lambda/<env>-<ServiceName>-<FunctionName>`
 *   with environment-specific retention (7 days dev, 30 days prd)
 * - esbuild-bundled code asset uploaded to the CDK bootstrap S3 bucket on deploy
 *
 * ### How bundling works
 * 1. `entry` points to a TypeScript/JavaScript file in the consumer's project.
 * 2. During `cdk synth`, esbuild transpiles and bundles the file + dependencies.
 * 3. The bundle is written to `cdk.out/` as a zip asset.
 * 4. `cdk deploy` uploads the zip to the CDK bootstrap S3 bucket.
 * 5. AWS Lambda pulls the code from S3 when creating/updating the function.
 *
 * ### Inherited capabilities (from {@link LambdaBase})
 * - `setCloudWatchAlarms()` — errors, duration, throttles
 * - `grantPolicies(role)` — grant invoke to another IAM role
 * - `addPermissions(...)` — add IAM policies to the Lambda's execution role
 * - `outputArn()` — export the function ARN as a CloudFormation output
 * - `resourceRemovalPolicy()` — control retain/destroy
 * - `getFunction()` — escape hatch to the underlying CDK `NodejsFunction`
 *
 * @example
 * ```typescript
 * // Minimal — esbuild auto-discovers tsconfig and lock file
 * const fn = new NodejsLambdaFunction(stack, {
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
 *   bundling: {
 *     minify: true,
 *     sourceMap: true,
 *     externalModules: ['@aws-sdk/*'],
 *   },
 * });
 *
 * // Override defaults per environment and add permissions
 * const fn = new NodejsLambdaFunction(stack, {
 *   config,
 *   functionName: 'heavy-compute',
 *   entry: path.join(__dirname, '../src/handlers/heavy-compute.ts'),
 *   lambdaConfig: {
 *     default: { memorySize: 1024 },
 *     prd: { memorySize: 3008 },
 *   },
 *   functionProps: {
 *     environment: { TABLE_NAME: 'my-table' },
 *   },
 * });
 * fn.addPermissions(
 *   new PolicyStatement({ actions: ['dynamodb:*'], resources: [tableArn] }),
 * );
 * fn.setCloudWatchAlarms(opsGenieSnsAction);
 * ```
 */
export class NodejsLambdaFunction extends LambdaBase {
  readonly resource: NodejsFunction;
  protected readonly alarmThresholds: LambdaAlarmThresholds;

  constructor(scope: Construct, props: NodejsLambdaFunctionProps) {
    const {
      config,
      functionName,
      entry,
      handler,
      bundling,
      lambdaConfig,
      functionProps,
    } = props;

    const name = lambdaFunctionName({
      env: config.stackEnv,
      serviceName: config.serviceName,
      functionName,
    });

    super(scope, functionName, config, name);

    const base = resolveEnvProps(LAMBDA_ENVIRONMENTS_PROPS, config);
    const overrides = lambdaConfig ? resolveEnvProps(lambdaConfig, config) : {};
    const resolvedConfig = { ...base, ...overrides };

    this.alarmThresholds = resolvedConfig;

    const logGroup = new LogGroup(this, `${this.lambdaName}-logs`, {
      logGroupName: `/aws/lambda/${this.lambdaName}`,
      retention: resolvedConfig.logRetentionDays,
    });

    const finalProps: NodejsFunctionProps = {
      functionName: this.lambdaName,
      entry,
      handler: handler ?? 'handler',
      memorySize: resolvedConfig.memorySize,
      timeout: resolvedConfig.timeout,
      tracing: resolvedConfig.tracing,
      logGroup,
      bundling,
      ...functionProps,
    };

    this.resource = new NodejsFunction(
      this,
      this.resolver.childId('lambda'),
      finalProps,
    );
  }
}
