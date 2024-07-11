import { ABConfig } from '../common';
import { testAbConfig } from '../test/common.test.const';
import { ABEksClusterConfig } from './config.eks.cluster';

describe('ABEksClusterConfig', () => {
  let config: ABConfig;
  let eksClusterConfig: ABEksClusterConfig;

  beforeEach(() => {
    config = testAbConfig;
    eksClusterConfig = new ABEksClusterConfig(undefined as any, config);
  });

  it('should return the OIDC provider ARN for the EKS cluster', () => {
    const expectedArn =
      'arn:aws:iam::649614366484:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/6B4AF37861BB13CC3F815F3BA5146999';
    const oidcProviderArn = eksClusterConfig.getOidcProviderArn();

    expect(oidcProviderArn).toBe(expectedArn);
  });

  it('should return the EKS cluster name', () => {
    const expectedNameSpace = '*';
    const namespace = eksClusterConfig.getNameSpaceRule();
    expect(namespace).toBe(expectedNameSpace);
  });
});
