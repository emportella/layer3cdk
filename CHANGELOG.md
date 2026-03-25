## Layer3CDK Changelog
All changes to this project Must be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/) and this project adheres to
[Semantic Versioning](http://semver.org/spec/v2.0.0.html).

Given a version number `MAJOR.MINOR.PATCH`, increment the:
1) `MAJOR` version when you make incompatible API changes,
2) `MINOR` version when you add functionality in a backward-compatible manner, and
3) `PATCH` version when you make backward-compatible bug fixes.

Dates are in [ISO-8601](https://en.wikipedia.org/wiki/ISO_8601).

## [1.0.0] - 2023-06-15
The initial release of the Layer3CDK project.
#### Added
- First release of the Layer3CDK project.
- Core package with the abstract `BaseConstruct` class.
  - ResourceTags following DevOps [AWS Tagging Strategy](
The default strategy for configurations `Config` class.
  - Constants for the Environments.
- Config package with EKS Cluster configurations.
- Util package with string methods.
- Service Accounts IAM Roles naming convention and construct.
- SNS for Event-Driven Architecture naming convention and construct.
- SQS for Event-Driven Architecture naming convention and construct.
  - DLQ for SQS.
