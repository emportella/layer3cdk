# Core Package

Shared foundation for every construct in the library: the `BaseConfig` object passed to all constructs, environment-aware property resolution, tag enrichment, CDK context parsing, and standardized naming conventions.

## Exports

- `BaseConfig` / `BaseConfigExtended` — the config object threaded through every construct.
- `BaseStack` — abstract `Stack` base that derives its construct ID from `BaseConfig`.
- `BaseStackConfig` — singleton that reads CDK context and builds `BaseConfig` instances.
- `BaseConstruct` — abstract construct base used by all library constructs.
- `BaseEnvProps<T>` + `resolveEnvProps`, `resolveWithOverrides`, `resolveAndMergeEnvProps`, `envDependentBuild` — environment-aware configuration helpers.
- `DEFAULT_ENVS`, `DEFAULT_DEPARTMENTS`, `DEFAULT_TAGS`, `StackEnv`, `Department`, `AWSRegion`, `ResourceType` — constants and types.
- `Layer3Config`, `ConfigMode`, `ConfigSection<T>` — shape of the optional `layer3cdk` CDK context config.
- Naming helpers: `stackName`, `constructId`, `alarmConstructId`, `arnExportName`, `outputExportName`, `awsArn`.
- `ConstructIdResolver` — builds deterministic construct IDs and export names.

## BaseConfig

The config object every construct receives via its `config` prop. Build it through `BaseStackConfig.createBaseConfig(...)` — do not instantiate directly in application code.

```typescript
interface BaseConfig {
  department: string;
  env: Environment;        // { account, region }
  stackName: string;        // e.g. 'dev-OrderPlatform'
  tags: ResourceTags;       // Record<string, string>
  stackEnv: string;         // e.g. 'dev'
  serviceName: string;      // e.g. 'order-platform'
  team?: string;
  description?: string;
}
```

Extend it for stack-specific extras:

```typescript
import { BaseConfigExtended } from 'layer3cdk';

type AppConfig = BaseConfigExtended<{
  oidcProviderArn: string;
  workerCount: number;
}>;
```

## BaseStackConfig

Singleton that reads CDK context values and the optional `layer3cdk` JSON config. Obtain via `BaseStackConfig.getInstance(app)`.

### Required CDK Context

- `-c account=<aws account number>`
- `-c region=<aws region>`
- `-c env=<environment>`

### Optional CDK Context

- `-c layer3cdk=<path.json | JSON string | object>`

### `layer3cdk` Context Config

Passed via `cdk.json` or `-c layer3cdk='{...}'`:

```json
{
  "layer3cdk": {
    "team": "Platform",
    "department": "pltf",
    "envs": { "mode": "extend", "values": ["qa", "perf"] },
    "departments": { "mode": "override", "values": ["eng", "ops", "data"] },
    "tags": { "mode": "extend", "values": { "Ownership:CostCenter": "CC-PLTF" } }
  }
}
```

Fields:

| Field | Purpose |
|---|---|
| `team` | Team name surfaced in logs and tags |
| `department` | Default department for resource naming / tags |
| `envs` | Extends or overrides `DEFAULT_ENVS` (`dev`, `stg`, `prd`) |
| `departments` | Extends or overrides `DEFAULT_DEPARTMENTS` |
| `tags` | Extends or overrides `DEFAULT_TAGS` |

Each configurable section uses `mode`:

- **`extend`** — your values are added on top of the library defaults.
- **`override`** — library defaults are stripped; only your values remain.

Override edge cases:

| Section | Override with empty values | Effect |
|---|---|---|
| `envs` | `{ mode: "override", values: [] }` | Falls back to `["main"]` so the app can start |
| `departments` | `{ mode: "override", values: [] }` | Strips all defaults; department validation disabled |
| `tags` | `{ mode: "override", values: {} }` | Strips default tag keys; only auto-set `Eng:Env` remains |

### Usage

```typescript
import { App } from 'aws-cdk-lib';
import { BaseStackConfig, BaseStack, BaseConfig } from 'layer3cdk';

const app = new App();
const stackConfig = BaseStackConfig.getInstance(app);

const config: BaseConfig = stackConfig.createBaseConfig({
  serviceName: 'order-platform',
  stackName: 'OrderPlatform',
  description: 'Orders service infrastructure',
});

class MyStack extends BaseStack {
  constructor(scope: App, config: BaseConfig) {
    super(scope, config);
    // ... constructs go here
  }
}

new MyStack(app, config);
```

On first `getInstance()` call the resolved configuration is logged to stdout for visibility.

### Tag Auto-Merging

`createBaseConfig` merges tags in this order:

1. Custom tags from the `layer3cdk` config (base).
2. Stack-specific tags passed into `createBaseConfig`.
3. Auto-set tags (always win): `Eng:Env` (from `stackEnv`), `Eng:ManagedBy: 'cdk'`.

## Environment-Aware Props

`BaseEnvProps<T>` lets constructs accept configuration that varies by `config.stackEnv`:

```typescript
import { BaseEnvProps, resolveEnvProps } from 'layer3cdk';

const dynamoConfig: BaseEnvProps<DynamoConfig> = {
  default: { billing: onDemand, alarmThreshold: 20 },
  prd:     { billing: provisioned, alarmThreshold: 40 },
};

const resolved = resolveEnvProps(dynamoConfig, config);
```

Helpers:

| Helper | Use when |
|---|---|
| `resolveEnvProps(envProps, config)` | Pick the `stackEnv` value, falling back to `default` |
| `resolveWithOverrides(envProps, config, overrides?)` | Resolve + deep-merge a single override object |
| `resolveAndMergeEnvProps(base, config, override?)` | Resolve two `BaseEnvProps` layers and deep-merge |
| `envDependentBuild(config, envs, builder)` | Run the builder only when `stackEnv` is in the list |

Deep-merge merges nested plain objects; arrays and non-plain objects are replaced.

## Naming Conventions

Standardized helpers used internally by every construct. Available if you need consistent naming for resources the library does not cover.

| Helper | Result | Example |
|---|---|---|
| `stackName(env, name)` | `<env>-<PascalName>` | `dev-OrderPlatform` |
| `constructId(stackName, type, name)` | `<stackName>-<type>-<name>` | `dev-OrderPlatform-sqs-OrderCreated` |
| `alarmConstructId(stackName, resource, alarmType)` | `<stackName>-cw-alarm-<resource>-<alarmType>` | `dev-OrderPlatform-cw-alarm-st-OrderCreated-old-messages` |
| `arnExportName(resource)` | `output-<resource>-arn` | `output-order-platform-arn` |
| `outputExportName({ resourceName, paramType })` | `output-<resource>-<paramType>` | `output-order-platform-endpoint` |
| `awsArn({ region, accountId, resourceType, resourceName })` | Full ARN | `arn:aws:sqs:us-east-1:123:dev-st-OrderPlatform-OrderCreated` |

Package-specific naming (SQS, ECS, SNS, SSM, alarms, etc.) lives in the respective package docs.

## ConstructIdResolver

Produces deterministic construct IDs and export names for a `(stackName, resourceType, resourceName)` triple. Every `BaseConstruct` owns a resolver and uses it for child construct IDs, alarm IDs, and CloudFormation export names. Rarely used directly outside the library.

## BaseStack

Abstract `Stack` base. Derives its construct ID from `config.stackName` so CDK synth output is consistent across stacks.

```typescript
import { BaseStack } from 'layer3cdk';

class MyStack extends BaseStack {
  constructor(scope: App, config: BaseConfig) {
    super(scope, config);
    // ...
  }
}
```

## Defaults

### `DEFAULT_ENVS`

`['dev', 'stg', 'prd']`

### `DEFAULT_DEPARTMENTS`

`['ops', 'fe', 'be', 'infra', 'it', 'pltf', 'qa']`

### `DEFAULT_TAGS`

PascalCase colon-namespaced keys, empty values meant to be filled in by the consumer (or overridden via the `tags` config section):

```
Eng:Env
Eng:Application
Eng:Repository
Eng:ManagedBy         (auto-set to 'cdk')
Ownership:Team
Ownership:Department
Ownership:Organization
```
