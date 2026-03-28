import { Function as LambdaFn, FunctionProps } from 'aws-cdk-lib/aws-lambda';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { resolveAndMergeEnvProps } from '../core/base.construct.env.props';
import { LambdaFunctionProps } from './lambda.construct.props';
import { lambdaFunctionName } from './lambda.name.conventions';
import { LambdaBase } from './lambda.base';
import {
  LambdaAlarmThresholds,
  LAMBDA_ENVIRONMENTS_PROPS,
} from './lambda.default.props';

/**
 * Generic Lambda function construct for **any runtime** (Node.js, Python, Go, Java, .NET, etc.).
 *
 * Code is provided via a `codeProvider` callback — a zero-argument function that returns
 * a CDK `Code` object. This keeps the construct agnostic to where the code lives
 * (local directory, S3, Docker, inline string).
 *
 * For **Node.js/TypeScript** with automatic esbuild bundling,
 * prefer {@link NodejsLambdaFunction} instead.
 *
 * ### What gets created
 * - `AWS::Lambda::Function` — named `<env>-<ServiceName>-<FunctionName>`
 * - `AWS::Logs::LogGroup` — named `/aws/lambda/<env>-<ServiceName>-<FunctionName>`
 *   with environment-specific retention (7 days dev, 30 days prd)
 *
 * ### Inherited capabilities (from {@link LambdaBase})
 * - `setCloudWatchAlarms()` — errors, duration, throttles
 * - `grantPolicies(role)` — grant invoke to another IAM role
 * - `addPermissions(...)` — add IAM policies to the Lambda's execution role
 * - `outputArn()` — export the function ARN as a CloudFormation output
 * - `resourceRemovalPolicy()` — control retain/destroy
 * - `getFunction()` — escape hatch to the underlying CDK `Function`
 *
 * @example
 * ```typescript
 * // Basic usage with Code.fromAsset (most common)
 * const fn = new LambdaFunction(stack, {
 *   config,
 *   functionName: 'process-orders',
 *   runtime: Runtime.NODEJS_20_X,
 *   handler: 'index.handler',
 *   codeProvider: () => Code.fromAsset(path.join(__dirname, 'handlers/process-orders')),
 * });
 *
 * // Grant the Lambda permissions to read from DynamoDB
 * fn.addPermissions(
 *   new PolicyStatement({ actions: ['dynamodb:Query'], resources: [table.tableArn] }),
 * );
 *
 * // Wire up alarms to OpsGenie
 * fn.setCloudWatchAlarms(opsGenieSnsAction);
 *
 * // Override defaults per environment
 * new LambdaFunction(stack, {
 *   config,
 *   functionName: 'heavy-compute',
 *   runtime: Runtime.PYTHON_3_12,
 *   handler: 'app.lambda_handler',
 *   codeProvider: () => Code.fromAsset(path.join(__dirname, 'python-handlers')),
 *   lambdaConfig: {
 *     default: { memorySize: 1024, timeout: Duration.minutes(5) },
 *     prd: { memorySize: 3008 },
 *   },
 *   functionProps: {
 *     environment: { TABLE_NAME: 'my-table' },
 *   },
 * });
 * ```
 */
export class LambdaFunction extends LambdaBase {
  readonly resource: LambdaFn;
  protected readonly alarmThresholds: LambdaAlarmThresholds;

  constructor(scope: Construct, props: LambdaFunctionProps) {
    const {
      config,
      functionName,
      runtime,
      handler,
      codeProvider,
      lambdaConfig,
      functionProps,
    } = props;

    const name = lambdaFunctionName({
      env: config.stackEnv,
      serviceName: config.serviceName,
      functionName,
    });

    super(scope, functionName, config, name);

    const resolvedConfig = resolveAndMergeEnvProps(
      LAMBDA_ENVIRONMENTS_PROPS,
      config,
      lambdaConfig,
    );

    this.alarmThresholds = resolvedConfig;

    const code = codeProvider();

    const logGroup = new LogGroup(this, `${this.lambdaName}-logs`, {
      logGroupName: `/aws/lambda/${this.lambdaName}`,
      retention: resolvedConfig.logRetentionDays,
    });

    const finalProps: FunctionProps = {
      functionName: this.lambdaName,
      runtime,
      handler,
      code,
      memorySize: resolvedConfig.memorySize,
      timeout: resolvedConfig.timeout,
      tracing: resolvedConfig.tracing,
      logGroup,
      ...functionProps,
    };

    this.resource = new LambdaFn(
      this,
      this.resolver.childId('lambda'),
      finalProps,
    );
  }
}
