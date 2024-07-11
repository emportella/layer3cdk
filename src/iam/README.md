# IAM Package
All IAM-related constructs should be built into this package.

### 1. IAM Role for Service Account

The [ServiceAccountRole](./service.account.ts) is an IAM role designed specifically for Kubernetes service accounts. The constructor handles all the naming and configurations needed for the role.

```typescript
import { ServiceAccountRole } from '@applyboard/cdk-constructs';

const serviceAccountRole = new ServiceAccountRole(scope, abConfig); //that's it.
```