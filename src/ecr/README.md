# ECR Package
All ECR-related constructs should be built into this package

### ApplicationRepository

*ApplicationRepository* is a construct that creates an `ECR` repository for the deployable applications.

Currently, Layer3CDK uses a single `ECR` repository for all deployable applications, which is created in the dev/preprod account. This `ECR` repository is used to store the docker images of all environments for the same application. The repository is created under the org namespace, which has a replication policy so that all images are replicated to the production account.

The above described 

To allow testing and development, the repository is created in dev under a "dev" namespace. The final application repository is created during the pre-prod deployment of CDK to allow PR Repositories to be created with a _Retain_ removal policy so that it is not deleted when the stack is deleted. The repository is created with the following properties:
 
 The repository is created with the following properties:
 - *removalPolicy*: The removal policy for the repository. The default value is *RemovalPolicy.RETAIN*.
 - *repositoryName*: The name of the repository. The default value is *org/${repositoryName}*.
 - *encryption*: The encryption type for the repository. The default value is *RepositoryEncryption.AES_256*.
 - *imageTagMutability*: The image tag mutability for the repository. The default value is *TagMutability.MUTABLE*.
 - *imageScanOnPush*: The image scan on push for the repository. The default value is *true*.
 
 All the above follows the current ECR defaults for the Layer3CDK ECR repositories. Although the repository is created in the dev/preprod account, it is not created in the prod environment. And even if it is not a best practice, that is the current state of the Layer3CDK ECR repositories.

For dev the prefixes the repo name with `dev`:
`dev/${github-repository-name}`

For `preprod` and prod follow the current naming convention implemented: `org/${github-repository-name}`

```typescript
import { StandartRepository } from 'layer3cdk';

const repository = new StandardRepository(scope, 'rpj_rp-tasks_service', config);

```

### Default Configs

The following repository configs are enforced which follows existing ECR repositories

- Tag immutability: `MUTABLE`
- Encryption: `AES-256`
- ImageScanOnPush: `True`