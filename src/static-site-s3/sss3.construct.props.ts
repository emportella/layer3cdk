import { BehaviorOptions } from 'aws-cdk-lib/aws-cloudfront';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { BaseConstructProps } from '../core/base.construct.props';
import { BaseEnvProps } from '../core/base.construct.env.props';
import { SSS3Config } from './sss3.default.props';

/**
 * Certificate configuration for {@link SSS3}.
 * - `'create'`: The construct creates a new ACM certificate with DNS validation via Route 53.
 *    The stack must deploy to `us-east-1` (CloudFront requirement).
 * - `'import'`: Uses an existing ACM certificate ARN (must be in `us-east-1`).
 */
export type CertificateConfig =
  | { readonly type: 'create' }
  | { readonly type: 'import'; readonly certificateArn: string };

/**
 * Props for the {@link SSS3} construct.
 */
export interface SSS3Props extends BaseConstructProps {
  /** Logical name for the site, used in resource naming (e.g., 'admin-portal') */
  readonly siteName: string;

  /** The full domain name for the site (e.g., 'app.example.com' or 'example.com') */
  readonly domainName: string;

  /** The Route 53 hosted zone for the domain. Use `HostedZone.fromHostedZoneAttributes()` to import. */
  readonly hostedZone: IHostedZone;

  /** Certificate config. Defaults to creating a new one via DNS validation. */
  readonly certificate?: CertificateConfig;

  /** Optional WAF Web ACL ARN to associate with the CloudFront distribution */
  readonly wafWebAclArn?: string;

  /**
   * Optional additional CloudFront behaviors keyed by path pattern.
   * Use this to proxy API calls through the same domain, avoiding CORS.
   *
   * @example
   * ```typescript
   * additionalBehaviors: {
   *   '/api/*': {
   *     origin: new HttpOrigin('api.example.com'),
   *     viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
   *     allowedMethods: AllowedMethods.ALLOW_ALL,
   *     cachePolicy: CachePolicy.CACHING_DISABLED,
   *   },
   * }
   * ```
   */
  readonly additionalBehaviors?: Record<string, BehaviorOptions>;

  /** Optional environment-aware overrides for library defaults */
  readonly siteConfig?: BaseEnvProps<Partial<SSS3Config>>;
}
