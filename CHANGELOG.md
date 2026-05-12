## Layer3CDK Changelog

All changes to this project Must be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/) and this project adheres to
[Semantic Versioning](http://semver.org/spec/v2.0.0.html).

Given a version number `MAJOR.MINOR.PATCH`, increment the:

1. `MAJOR` version when you make incompatible API changes,
2. `MINOR` version when you add functionality in a backward-compatible manner, and
3. `PATCH` version when you make backward-compatible bug fixes.

Dates are in [ISO-8601](https://en.wikipedia.org/wiki/ISO-8601).

## [0.1.2] - 2026-05-12

#### Changed

- Switched from npm to pnpm for improved dependency deduplication and resolution.
- Updated fast-uri dependency to resolve CVE (path traversal vulnerability).

#### Dependencies

- Updated various dev and production dependencies via dependabot.

## [0.1.1] - 2026-04-??

#### Fixed

- Fixed ReDoS vulnerability in `trimDashes` function by rewriting without regex.

#### Dependencies

- Updated esbuild, actions/setup-node, actions/checkout.

## [0.1.0] - 2026-03-26

First release of Layer3CDK.

#### Added

- Core foundation: `BaseConstruct<T>`, `BaseConfig`, `BaseStackConfig`, `BaseStack`, `BaseEnvProps<T>`, environment resolution functions (`resolveEnvProps`, `resolveWithOverrides`, `resolveAndMergeEnvProps`, `envDependentBuild`).
- Props-based API: all construct constructors use `(scope, props)` pattern with dedicated `*.construct.props.ts` files per module. `BaseConstructProps` serves as the composition base for all construct props.
- SQS constructs: `DLQ`, `DLQFifo`, `StandardQueue/Fifo`, `BackgroundTasksQueue/Fifo`, `FaninQueue/Fifo`, `grantFaninPublishing`.
- SNS constructs: `SnsTopic`, `SnsTopicFifo`.
- DynamoDB construct: `DynamoTable` with built-in CloudWatch alarms and production validations.
- Redis construct: `RedisReplicationGroup` with enforced encryption and automatic subnet group creation.
- SSM constructs: `GlobalSSMStringParameter`, `DepartmentSSMStringParameter`, `ServiceSSMStringParameter`.
- Secrets construct: `GlobalSecrets`.
- ECR construct: `ApplicationRepository` with environment-aware repository creation.
- IAM construct: `ServiceAccountRole` with EKS OIDC federation.
- Static Site S3 construct: `SSS3` — private S3 bucket + CloudFront (OAC) + ACM certificate + Route 53 DNS + optional WAF. Supports SPA and static site modes with environment-aware defaults.
- Alarms constructs: `ChatbotSlackChannnel`, `OpsGenie`, `AlarmSnsAction`.
- Config: `EksClusterConfig` for EKS cluster configuration.
- Standardized naming conventions for all resource types.
- CloudWatch alarm support via `setCloudWatchAlarms` and `setCustomAlarms`.
- CI/CD workflows for testing and publishing.
- Documentation and contribution guidelines.
