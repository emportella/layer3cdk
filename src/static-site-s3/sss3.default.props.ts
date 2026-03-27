import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { BaseEnvProps } from '../core';
import { SiteType } from './sss3.constants';

/**
 * Library-managed configuration for {@link SSS3}.
 * Users can override these per-environment via `siteConfig` in {@link SSS3Props}.
 */
export interface SSS3Config {
  /** 'spa' redirects 403/404 to /index.html; 'static' uses default CloudFront behavior */
  siteType: SiteType;
  /** Default TTL for CloudFront cache */
  defaultTtl: Duration;
  /** Maximum TTL for CloudFront cache */
  maxTtl: Duration;
  /** Minimum TTL for CloudFront cache */
  minTtl: Duration;
  /** S3 bucket removal policy */
  removalPolicy: RemovalPolicy;
  /** Whether to auto-delete bucket objects on stack deletion (dev convenience) */
  autoDeleteObjects: boolean;
  /** Whether to enable S3 bucket versioning */
  versioned: boolean;
  /** Default root object served by CloudFront */
  defaultRootObject: string;
  /** Whether to enable CloudFront access logging */
  enableAccessLog: boolean;
}

/**
 * Library-provided environment defaults for {@link SSS3}.
 * User overrides are deep-merged on top via `resolveAndMergeEnvProps()`.
 */
export const SSS3_ENVIRONMENTS_PROPS: BaseEnvProps<SSS3Config> = {
  default: {
    siteType: 'spa',
    defaultTtl: Duration.minutes(5),
    maxTtl: Duration.hours(1),
    minTtl: Duration.seconds(0),
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    versioned: false,
    defaultRootObject: 'index.html',
    enableAccessLog: false,
  },
  prd: {
    siteType: 'spa',
    defaultTtl: Duration.days(1),
    maxTtl: Duration.days(365),
    minTtl: Duration.seconds(0),
    removalPolicy: RemovalPolicy.RETAIN,
    autoDeleteObjects: false,
    versioned: true,
    defaultRootObject: 'index.html',
    enableAccessLog: true,
  },
};
