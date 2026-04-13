# Config Package

Provides configuration helpers for AWS resources that are managed outside the CDK apps using this library (for example, an EKS cluster provisioned by a separate toolchain). The constructs in this package do not create AWS resources — they expose environment-aware lookups for downstream constructs to consume.

## EksClusterConfig

Resolves the EKS OIDC provider ARN and namespace rule for the current environment. Primarily consumed by `ServiceAccountRole` (see the [IAM package](./iam.md)) to federate IAM roles with Kubernetes service accounts (IRSA).

```typescript
import { EksClusterConfig } from 'layer3cdk';

const eksConfig = new EksClusterConfig(this, {
  config,
  oidcProviderArns: {
    default: 'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/DEV-CLUSTER',
    prd: 'arn:aws:iam::210987654321:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/PRD-CLUSTER',
  },
});

eksConfig.getOidcProviderArn();  // Picks the ARN for config.stackEnv, falls back to 'default'
eksConfig.getNameSpaceRule();    // See defaults below
```

### Props

| Field | Type | Description |
|---|---|---|
| `config` | `BaseConfig` | Required |
| `oidcProviderArns` | `Record<string, string>` | Per-environment OIDC provider ARNs; `default` is the fallback |
| `namespaceRules` | `Record<string, string>` *(optional)* | Per-environment Kubernetes namespace rule |

### Default Namespace Rules

When `namespaceRules` is omitted:

| Environment | Rule |
|---|---|
| `dev` | `*` (any namespace) |
| any other | `default` |

The namespace rule is later combined with the OIDC provider to produce an IRSA trust policy that restricts which Kubernetes service accounts may assume the role.

### Lookup Semantics

Both `getOidcProviderArn` and `getNameSpaceRule` look up the current `config.stackEnv` first, then fall back to the `default` entry. Always supply `default` so every environment has a value.

## Public API

| Method | Description |
|---|---|
| `getOidcProviderArn()` | Resolves the OIDC provider ARN for `config.stackEnv` |
| `getNameSpaceRule()` | Resolves the namespace rule for `config.stackEnv` |
| `config` | The `BaseConfig` passed in (readonly) |
