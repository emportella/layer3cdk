# ECR Package

Provides an `ApplicationRepository` construct for hosting Docker images used by deployable applications.

## ApplicationRepository

A factory-created ECR repository with sensible defaults (AES-256 encryption, scan-on-push, `RETAIN` removal policy). The factory method returns a repository only in `dev` and `stg` environments — production images are expected to be replicated from a staging repository via a cross-account replication rule configured outside this library.

### Environment Behavior

| `config.stackEnv` | Repository created? | Name |
|---|---|---|
| `dev` | yes | `dev/<repositoryName>` (10-image lifecycle rule) |
| `stg` | yes | `org/<repositoryName>` |
| `prd` | **no** — returns `undefined` | — |
| any other | no — returns `undefined` | — |

The `dev` repository is used for pull-request builds and local development. The `stg` repository is the canonical one; production accounts pull images from it via replication.

### Usage

```typescript
import { ApplicationRepository } from 'layer3cdk';

const repo = ApplicationRepository.create(this, {
  config,
  repositoryName: 'order-service',
});

if (repo) {
  repo.grantPolicies(ciRole);           // pull + push
  repo.grantPullPolicy(taskRole);       // pull only
  repo.outputArn();                     // CloudFormation output
}
```

The factory returns `ApplicationRepository | undefined`. Guard on the result when writing code that runs in production environments where no repository is created.

### Defaults

| Property | Value |
|---|---|
| `removalPolicy` | `RETAIN` |
| `encryption` | `AES_256` |
| `imageTagMutability` | `MUTABLE` |
| `imageScanOnPush` | `true` |
| `lifecycleRules` | dev only: keep last 10 images |

## Public API

| Method | Description |
|---|---|
| `ApplicationRepository.create(scope, props)` | Factory — returns a repository or `undefined` |
| `getArn()` | Repository ARN |
| `outputArn()` | Export the ARN as a CloudFormation output |
| `grantPolicies(role)` | Grant pull + push |
| `grantPullPolicy(role)` | Grant pull only |
| `grantPushPolicy(role)` | Grant push only |
| `grantReadPolicy(role)` | Grant `ecr:GetDownloadUrlForLayer`, `ecr:BatchGet*` |
| `addPolicyStatements(...stmts)` | Append resource policy statements |
| `resourceRemovalPolicy(policy)` | `RETAIN` or `DESTROY` |

## Notes

- Repositories use the `RETAIN` removal policy so stack deletion does not delete images. To delete a repository, remove it from the stack, deploy, then delete the repository manually.
- Image tags are `MUTABLE` by default to allow moving tags like `latest` or `main`. Set a tag-mutability override via the underlying CDK construct if you need immutable tags.
