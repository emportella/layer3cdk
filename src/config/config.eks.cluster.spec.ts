import { BaseConfig } from '../core';
import { testconfig } from '../test/common.test.const';
import { EksClusterConfig } from './config.eks.cluster';

describe('EksClusterConfig', () => {
  let config: BaseConfig;
  let eksClusterConfig: EksClusterConfig;

  const oidcProviderArns = {
    dev: 'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/DEV_CLUSTER',
    perf: 'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/PERF_CLUSTER',
    preprod:
      'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/PREPROD_CLUSTER',
    prod: 'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/PROD_CLUSTER',
  };

  beforeEach(() => {
    config = testconfig;
    eksClusterConfig = new EksClusterConfig(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      undefined as any,
      config,
      oidcProviderArns,
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
      perf: 'perf-ns',
      preprod: 'pre-ns',
      prod: 'prod-ns',
    };
    const configWithCustomRules = new EksClusterConfig(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      undefined as any,
      config,
      oidcProviderArns,
      customRules,
    );
    expect(configWithCustomRules.getNameSpaceRule()).toBe('custom-ns');
  });
});
