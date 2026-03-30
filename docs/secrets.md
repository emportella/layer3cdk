# Secrets Package

Provides a construct for creating AWS Secrets Manager secrets with standardized naming.

## GlobalSecrets

`GlobalSecrets` creates a Secrets Manager secret scoped at the global level. The secret value is managed outside of CDK (via the AWS console or CLI) — the construct only provisions the secret resource.

### Why a Construct for This?

Secrets Manager secrets are simple resources, but wrapping them in a construct ensures:

1. Consistent naming aligned with the `ConstructIdResolver` convention
2. Integration with the `BaseConstruct<T>` lifecycle (removal policy, construct tree)
3. The secret is tracked in the CloudFormation stack (not orphaned)

### Example

```typescript
import { GlobalSecrets } from 'layer3cdk';

new GlobalSecrets(this, {
  config,
  parameterName: 'db-credentials',
});
```

### File Structure

```
src/secrets/
  secrets.constructs.ts         # GlobalSecrets construct
  secrets.construct.props.ts    # GlobalSecretsProps interface
  secrets.constructs.spec.ts    # Tests
  index.ts                      # Barrel exports
```
