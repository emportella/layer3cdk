import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import {
  Repository,
  RepositoryEncryption,
  RepositoryProps,
  TagMutability,
} from 'aws-cdk-lib/aws-ecr';
import { PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { BaseConfig, BaseConstruct } from '../core';
import { ApplicationRepositoryProps } from './ecr.construct.props';

class StandardRepository extends BaseConstruct<Repository> {
  protected readonly resource: Repository;
  readonly props: RepositoryProps;
  constructor(
    scope: Construct,
    repositoryName: string,
    config: BaseConfig,
    props: RepositoryProps,
  ) {
    super(scope, 'ecr', repositoryName, config);
    this.props = props;
    this.resource = new Repository(
      scope,
      this.resolver.childId('ecr-app'),
      this.props,
    );
  }
  /**
   * Returns the ARN of the repository
   */
  public getArn(): string {
    return this.resource.repositoryArn;
  }
  public outputArn(): void {
    const exportName = this.resolver.arnExportName();
    new CfnOutput(this, exportName + '-id', {
      value: this.resource.repositoryArn,
      exportName: exportName,
      description: `The ARN of the ecr repository ${this.resourceName}`,
    });
  }
  /**
   * Grants the given IAM role permissions to pull and push images in this repository.
   * @param iamRole
   */
  public grantPolicies(iamRole: Role): void {
    this.resource.grantPullPush(iamRole);
  }
  /**
   * Grants the given IAM role permissions to pull images in this repository.
   * @param iamRole
   */
  public grantPullPolicy(iamRole: Role): void {
    this.resource.grantPull(iamRole);
  }
  /**
   * Grants the given IAM role permissions to push images to this repository.
   * @param iamRole
   */
  public grantPushPolicy(iamRole: Role): void {
    this.resource.grantPush(iamRole);
  }
  /**
   * Grants the given IAM role permissions to read images from this repository.
   */
  public grantReadPolicy(iamRole: Role): void {
    this.resource.grantRead(iamRole);
  }
  /**
   * Adds policies statements to the repository
   * @param statements
   */
  public addPolicyStatements(...statements: PolicyStatement[]): void {
    statements.forEach((statement) => {
      this.resource.addToResourcePolicy(statement);
    });
  }
  public resourceRemovalPolicy(
    removalPolicy: RemovalPolicy.DESTROY | RemovalPolicy.RETAIN,
  ): void {
    this.resource.applyRemovalPolicy(removalPolicy);
  }
}
/**
 * *ApplicationRepository* is a construct that creates an ECR repository for the deployable applications.
 * Currently, Layer3CDK uses a single ECR repository for all deployable applications, which is created in the dev/stg account. This ecr repository is used to store the docker images of all environments for the same application. The repository is created under the org namespace, which has a replication policy of so that all images are replicated to the production account.
 * To allow testing and development, the repository is created in dev under a "dev" nameSpace. The application repository which is final is created during the stg deployment of CDK to allow PR
 * Repositories are created with a *Retain* removal policy, so that it is not deleted when the stack is deleted. The repository is created with the following properties:
 * The repository is created with the following properties:
 * - *removalPolicy*: The removal policy for the repository. The default value is *RemovalPolicy.RETAIN*.
 * - *repositoryName*: The name of the repository. The default value is *org/${repositoryName}*.
 * - *encryption*: The encryption type for the repository. The default value is *RepositoryEncryption.AES_256*.
 * - *imageTagMutability*: The image tag mutability for the repository. The default value is *TagMutability.MUTABLE*.
 * - *imageScanOnPush*: The image scan on push for the repository. The default value is *true*.
 * All the above follows the the current ECR defaults for the Layer3CDK ECR repositories. Although the repository is created in the dev/stg account, it is not created in the prd environment. And even if it is not a best practice, that is the current state of the Layer3CDK ECR repositories.
 * Usage:
 * ```typescript
 * const applicationRepository = ApplicationRepository.create(this, 'application_name', config);
 * ```
 * OBS.: Future improvements should include separation of dev/stg from production repositories, and the creation of the repositories in the prd environment.
 */
export class ApplicationRepository extends StandardRepository {
  private constructor(
    scope: Construct,
    repositoryName: string,
    config: BaseConfig,
    props: RepositoryProps,
  ) {
    super(scope, repositoryName, config, props);
  }

  public static create(
    scope: Construct,
    props: ApplicationRepositoryProps,
  ): ApplicationRepository | undefined {
    const { repositoryName, config } = props;
    if (config.stackEnv === 'dev') {
      return ApplicationRepository.developmentRepository(
        scope,
        repositoryName,
        config,
      );
    } else if (config.stackEnv === 'stg') {
      return ApplicationRepository.productionRepository(
        scope,
        repositoryName,
        config,
      );
    } else {
      return undefined;
    }
  }
  private static developmentRepository(
    scope: Construct,
    repositoryName: string,
    config: BaseConfig,
  ): ApplicationRepository {
    return new ApplicationRepository(scope, repositoryName, config, {
      removalPolicy: RemovalPolicy.RETAIN,
      repositoryName: `dev/${repositoryName}`,
      encryption: RepositoryEncryption.AES_256,
      imageTagMutability: TagMutability.MUTABLE,
      imageScanOnPush: true,
      lifecycleRules: [
        {
          description: 'Keep only the latest 10 images',
          maxImageCount: 10,
        },
      ],
    });
  }
  private static productionRepository(
    scope: Construct,
    repositoryName: string,
    config: BaseConfig,
  ): ApplicationRepository {
    return new ApplicationRepository(scope, repositoryName, config, {
      removalPolicy: RemovalPolicy.RETAIN,
      repositoryName: `org/${repositoryName}`,
      encryption: RepositoryEncryption.AES_256,
      imageTagMutability: TagMutability.MUTABLE,
      imageScanOnPush: true,
    });
  }
}
