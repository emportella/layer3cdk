import { Construct } from 'constructs';
import { ABConfig } from '../common';
import { EnvConfig } from './config.interfaces';

export class ABEksClusterConfig {
  // Should be revised after https://applyboard.atlassian.net/browse/RPJDOMAIN-282
  // Ticket to revit https://applyboard.atlassian.net/browse/RPJDOMAIN-283
  // value of scope needed for the future
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private readonly scope: Construct;
  readonly config: ABConfig;
  constructor(scope: Construct, config: ABConfig) {
    this.scope = scope;
    this.config = config;
  }
  /**
   * Get the OIDC provider ARN for the EKS cluster
   * @returns OIDC provider ARN as String
   */
  getOidcProviderArn(): string {
    return eKSOidcProviderArn[this.config.abEnv];
  }
  /**
   * Get the EKS cluster name
   * @returns eks cluster name as String
   */
  getNameSpaceRule(): string {
    return eKSNameSpaceRule[this.config.abEnv];
  }
}

const eKSNameSpaceRule: EnvConfig = {
  dev: '*',
  perf: 'performance-test',
  preprod: 'default',
  prod: 'default',
};

const eKSOidcProviderArn: EnvConfig = {
  dev: 'arn:aws:iam::649614366484:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/6B4AF37861BB13CC3F815F3BA5146999',
  perf: 'arn:aws:iam::649614366484:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/80DD14E2043C5EB7C649290807DA7461',
  preprod:
    'arn:aws:iam::649614366484:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/80DD14E2043C5EB7C649290807DA7461',
  prod: 'arn:aws:iam::074602949183:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/FDED22614EDFCAA0161B2A02BBD96820',
};
