import { BaseConfig } from '../core';
import { testconfig } from '../test/common.test.const';
import { EksClusterConfig } from './config.eks.cluster';

describe('EksClusterConfig', () => {
  let config: BaseConfig;
  let eksClusterConfig: EksClusterConfig;

  const oidcProviderArns = {
    dev: 'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/DEV_CLUSTER',
    stg: 'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/STG_CLUSTER',
    prd: 'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/PRD_CLUSTER',
  };

  beforeEach(() => {
    config = testconfig;
    eksClusterConfig = new EksClusterConfig(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      undefined as any,
      { config, oidcProviderArns },
    );
  });

  it('should return the OIDC provider ARN for the EKS cluster', () => {
    const oidcProviderArn = eksClusterConfig.getOidcProviderArn();
    expect(oidcProviderArn).toBe(oidcProviderArns.dev);
  });

  it('should return the default namespace rule', () => {
    const namespace = eksClusterConfig.getNameSpaceRule();
    expect(namespace).toBe('*');
  });

  it('should use custom namespace rules when provided', () => {
    const customRules = {
      dev: 'custom-ns',
      stg: 'pre-ns',
      prd: 'prd-ns',
    };
    const configWithCustomRules = new EksClusterConfig(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      undefined as any,
      { config, oidcProviderArns, namespaceRules: customRules },
    );
    expect(configWithCustomRules.getNameSpaceRule()).toBe('custom-ns');
  });
});
