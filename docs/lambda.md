# Lambda Package

Provides constructs for creating AWS Lambda functions with standardized naming, environment-aware defaults, CloudWatch alarms, and IAM integration.

## Why Two Constructs?

Lambda functions come in two flavors depending on the runtime and bundling needs:

- **`LambdaFunction`** — Generic construct for **any runtime** (Node.js, Python, Go, Java, .NET). Code is provided via a `codeProvider` callback that returns a CDK `Code` object. The consumer controls how code is packaged.
- **`NodejsLambdaFunction`** — Specialized for **Node.js/TypeScript**. Wraps CDK's `NodejsFunction` with automatic esbuild bundling. Point it at a `.ts` file and esbuild handles transpilation, tree-shaking, and bundling into a zip uploaded to S3 on deploy.

Both extend a shared `LambdaBase` abstract class that provides all the common functionality (alarms, grants, permissions, outputs, removal policy). This avoids duplicating alarm logic across variants.

## Why a Code Callback?

`LambdaFunction` accepts `codeProvider: () => Code` instead of a raw `code: Code` property. This is intentional:

1. It defers code resolution to construct-instantiation time, which is useful when the code path depends on config or environment.
2. It clearly signals that the consumer is responsible for packaging — the library stays agnostic to bundling strategy.
3. It mirrors the `consumer` callback pattern used in `setCustomAlarms`.

## LambdaBase (shared)

All Lambda variants inherit these capabilities:

- **Naming**: `<env>-<ServiceName>-<FunctionName>` (e.g. `dev-TacoProcessor-ProcessOrder`)
- **LogGroup**: `/aws/lambda/<env>-<ServiceName>-<FunctionName>` with environment-specific retention
- **CloudWatch Alarms**: 3 built-in alarms (errors, duration, throttles) with environment-aware thresholds
- **`grantPolicies(role)`**: Grants `lambda:InvokeFunction` to an external IAM role
- **`addPermissions(...statements)`**: Adds IAM policies to the Lambda's execution role (runtime permissions)
- **`addEventSources(...sources)`**: Connects SQS, SNS, DynamoDB Streams, Kinesis, etc.
- **`outputArn()`**: Exports the function ARN as a CloudFormation output
- **`resourceRemovalPolicy()`**: Controls retain/destroy behavior
- **`getFunction()`**: Escape hatch to the underlying CDK `Function`/`NodejsFunction`

## Environment Defaults

The library ships `LAMBDA_ENVIRONMENTS_PROPS` with sensible defaults:

| Property | default (dev/stg) | prd |
|----------|------------------|-----|
| memorySize | 256 MB | 512 MB |
| timeout | 30 s | 30 s |
| tracing | DISABLED | ACTIVE |
| logRetentionDays | ONE_WEEK (7 d) | ONE_MONTH (30 d) |
| removalPolicy | DESTROY | RETAIN |
| alarmErrorThreshold | 5 | 1 |
| alarmDurationThresholdMs | 25,000 | 25,000 |
| alarmThrottleThreshold | 3 | 1 |

Override per-environment via `lambdaConfig`. This accepts `BaseEnvProps<Partial<LambdaConfig>>` — you only specify the fields you want to change:

```typescript
lambdaConfig: {
  default: { memorySize: 512 },
  prd: { memorySize: 1024, alarmErrorThreshold: 0 },
}
```

## Examples

### NodejsLambdaFunction (TypeScript with esbuild)

The most common pattern for Node.js services. Requires `esbuild` as a dev dependency in the consumer project.

```typescript
import { NodejsLambdaFunction } from 'layer3cdk';

const fn = new NodejsLambdaFunction(this, {
  config,
  functionName: 'process-order',
  entry: path.join(__dirname, '../src/handlers/process-order.ts'),
  handler: 'handler', // optional, defaults to 'handler'
  bundling: { minify: true, sourceMap: true },
  lambdaConfig: {
    default: { memorySize: 512 },
    prd: { memorySize: 1024 },
  },
});

// Grant runtime permissions
fn.addPermissions(
  new PolicyStatement({ actions: ['dynamodb:Query'], resources: [tableArn] }),
);

// Wire alarms
fn.setCloudWatchAlarms(opsGenieAction);

// Connect to SQS event source
fn.addEventSources(new SqsEventSource(queue.getQueue()));
```

### LambdaFunction (generic, any runtime)

Use when you need Python, Go, Java, or any non-Node.js runtime, or when you want full control over code packaging.

```typescript
import { LambdaFunction } from 'layer3cdk';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';

// Code.fromAsset — local directory zipped and uploaded to S3
const fn = new LambdaFunction(this, {
  config,
  functionName: 'ingest-file',
  runtime: Runtime.NODEJS_20_X,
  handler: 'index.handler',
  codeProvider: () => Code.fromAsset(path.join(__dirname, 'handlers/ingest-file')),
});

// Python example
const pyFn = new LambdaFunction(this, {
  config,
  functionName: 'ml-inference',
  runtime: Runtime.PYTHON_3_12,
  handler: 'app.lambda_handler',
  codeProvider: () => Code.fromAsset(path.join(__dirname, 'python-handlers/ml-inference')),
});

// Raw CDK overrides via functionProps
const customFn = new LambdaFunction(this, {
  config,
  functionName: 'with-vpc',
  runtime: Runtime.NODEJS_20_X,
  handler: 'index.handler',
  codeProvider: () => Code.fromAsset('./handlers/with-vpc'),
  functionProps: {
    vpc: myVpc,
    environment: { TABLE_NAME: 'my-table' },
  },
});
```

### Lambda → Lambda Invocation

```typescript
const fnA = new NodejsLambdaFunction(this, { config, functionName: 'fn-a', entry: '...' });
const fnB = new NodejsLambdaFunction(this, { config, functionName: 'fn-b', entry: '...' });

// Grant fn-a permission to invoke fn-b
fnB.grantPolicies(fnA.getFunction().role as Role);
fnA.getFunction().addEnvironment('FN_B_NAME', fnB.lambdaName);
```

## Alarms

Three alarms are created by `setCloudWatchAlarms()`:

| Alarm | Metric | Period | Eval | Missing Data |
|-------|--------|--------|------|-------------|
| Errors | `Errors` SUM | 1 min | 3 periods, 2 datapoints | NOT_BREACHING |
| Duration | `Duration` AVG | 1 min | 3 periods, 2 datapoints | NOT_BREACHING |
| Throttles | `Throttles` SUM | 1 min | 2 periods, 1 datapoint | NOT_BREACHING |

All use `TreatMissingData.NOT_BREACHING` because Lambda functions may not be invoked continuously — missing data points should not trigger alerts.

## File Structure

```
src/lambda/
  lambda.base.ts                  # Abstract base with shared alarm/grant/permission logic
  lambda.construct.ts             # LambdaFunction (generic, any runtime)
  lambda.construct.props.ts       # Props for LambdaFunction + LambdaCodeProvider type
  lambda.nodejs.construct.ts      # NodejsLambdaFunction (esbuild bundling)
  lambda.nodejs.construct.props.ts # Props for NodejsLambdaFunction
  lambda.default.props.ts         # LambdaConfig + LAMBDA_ENVIRONMENTS_PROPS
  lambda.name.conventions.ts      # lambdaFunctionName()
  lambda.construct.spec.ts        # Tests for LambdaFunction
  lambda.nodejs.construct.spec.ts # Tests for NodejsLambdaFunction
  lambda.name.conventions.spec.ts # Tests for naming
  index.ts                        # Barrel exports
```
