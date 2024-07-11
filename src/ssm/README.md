# SSM Package

All SSM-related constructs should be built into this package.

### 1. SSM Parameter string

The [GlobalSSMStringParameter](./ssm.string.parameter.construct.ts) is used to create a parameter and value pair in the SSM parameter store. The constructor handles all the naming and configurations needed for the role. This constructor specifically adds the word global context to the name i.e. parameter name would be `/env/global/paramName``.

```typescript
import { GlobalSSMStringParameter } from '@applyboard/cdk-constructs';

const ssmStringParameter = new GlobalSSMStringParameter(
  scope,
  parameterName,
  parameterValue,
  abConfig,
); //that's it.
```

The [DomainSSMStringParameter](./ssm.string.parameter.construct.ts) is used to create a parameter and value pair in the SSM parameter store. The constructor handles all the naming and configurations needed for the role. This constructor specifically adds the domain name to the name i.e. parameter name would be `/env/rpj/paramName` or `/env/mob/paramName`.

```typescript
import { DomainSSMStringParameter } from '@applyboard/cdk-constructs';

const ssmStringParameter = new DomainSSMStringParameter(
  scope,
  parameterName,
  parameterValue,
  abConfig,
); //that's it.
```

The [ServiceSSMStringParameter](./ssm.string.parameter.construct.ts) is used to create a parameter and value pair in the SSM parameter store. The constructor handles all the naming and configurations needed for the role. This constructor specifically adds the service name to the name i.e. parameter name would be `/env/rp-agency/paramName` or `/env/rp-tasks/paramName`.

```typescript
import { ServiceSSMStringParameter } from '@applyboard/cdk-constructs';

const ssmStringParameter = new ServiceSSMStringParameter(
  scope,
  parameterName,
  parameterValue,
  abConfig,
); //that's it.
```
