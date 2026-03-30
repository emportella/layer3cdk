# SSM Package

All SSM-related constructs should be built into this package.

SSM parameter names follow the convention `/<env>/<context>/<parameter-name>` where context depends on the scope level:

| Construct | Context | Example |
|-----------|---------|---------|
| `GlobalSSMStringParameter` | `global` | `/dev/global/api-base-url` |
| `DepartmentSSMStringParameter` | `<department>` | `/dev/pltf/notification-sender-email` |
| `ServiceSSMStringParameter` | `<service-name>` | `/dev/taco-processor/max-concurrent-orders` |

### 1. GlobalSSMStringParameter

Creates a parameter scoped globally — shared across all services and departments within an environment.

```typescript
import { GlobalSSMStringParameter } from 'layer3cdk';

new GlobalSSMStringParameter(scope, {
  config,
  parameterName: 'api-base-url',
  parameterValue: 'https://api.taco-shop.example.com',
});
// → /dev/global/api-base-url
```

### 2. DepartmentSSMStringParameter

Creates a parameter scoped to the department — shared across all services within a department.

```typescript
import { DepartmentSSMStringParameter } from 'layer3cdk';

new DepartmentSSMStringParameter(scope, {
  config,
  parameterName: 'notification-sender-email',
  parameterValue: 'noreply@taco-shop.example.com',
});
// → /dev/pltf/notification-sender-email
```

### 3. ServiceSSMStringParameter

Creates a parameter scoped to a specific service — only that service should read it.

```typescript
import { ServiceSSMStringParameter } from 'layer3cdk';

new ServiceSSMStringParameter(scope, {
  config,
  parameterName: 'max-concurrent-orders',
  parameterValue: '100',
});
// → /dev/taco-processor/max-concurrent-orders
```
