# Static Site S3 Package

Provides a single construct for hosting static websites and single-page applications (SPAs) from S3 via CloudFront with HTTPS, custom domains, security headers, API proxying, and optional WAF protection.

## SSS3 (Static Site S3)

The `SSS3` construct creates all the resources needed to securely serve a static website:

- **S3 Bucket** -- Private, with `BlockPublicAccess.BLOCK_ALL`, S3-managed encryption, and SSL enforcement. CloudFront accesses it via Origin Access Control (OAC).
- **CloudFront Distribution** -- HTTPS redirect, TLS 1.2+, HTTP/2+3, security response headers (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy). Supports additional behaviors for API proxying.
- **ACM Certificate** -- DNS-validated via Route 53, or import an existing certificate.
- **Route 53 Records** -- A and AAAA alias records pointing to CloudFront.
- **WAF** -- Optional Web ACL association.

### Usage

```typescript
import { SSS3 } from 'layer3cdk';
import { HostedZone } from 'aws-cdk-lib/aws-route53';

const hostedZone = HostedZone.fromHostedZoneAttributes(this, 'Zone', {
  hostedZoneId: 'Z1234567890',
  zoneName: 'example.com',
});

const site = new SSS3(this, {
  config,
  siteName: 'admin-portal',
  domainName: 'admin.example.com',
  hostedZone,
});

// Grant a CI/CD role permissions to deploy
site.grantDeploy(serviceAccountRole.getRole());
```

### SPA vs Static Site

By default, the construct operates in SPA mode (`siteType: 'spa'`), which redirects CloudFront 403 and 404 errors to `/index.html` with HTTP 200. This enables client-side routing in frameworks like React, Vue, and Angular.

For traditional static sites, set `siteType: 'static'`:

```typescript
const site = new SSS3(this, {
  config,
  siteName: 'docs',
  domainName: 'docs.example.com',
  hostedZone,
  siteConfig: { default: { siteType: 'static' } },
});
```

### Importing an Existing Certificate

If you already have an ACM certificate (must be in `us-east-1`):

```typescript
const site = new SSS3(this, {
  config,
  siteName: 'admin-portal',
  domainName: 'admin.example.com',
  hostedZone,
  certificate: {
    type: 'import',
    certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/abc-123',
  },
});
```

### WAF Protection

Associate an existing WAF Web ACL with the CloudFront distribution:

```typescript
const site = new SSS3(this, {
  config,
  siteName: 'admin-portal',
  domainName: 'admin.example.com',
  hostedZone,
  wafWebAclArn: 'arn:aws:wafv2:us-east-1:123456789012:global/webacl/my-acl/abc123',
});
```

### API Proxying (Additional Behaviors)

If your static site makes REST calls to an API on a different subdomain (e.g., `api.example.com`), the browser will block them due to CORS. Instead of configuring CORS headers on the API, you can proxy API requests through the same CloudFront distribution using `additionalBehaviors`:

```typescript
import { HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import {
  AllowedMethods,
  CachePolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';

const site = new SSS3(this, {
  config,
  siteName: 'admin-portal',
  domainName: 'admin.example.com',
  hostedZone,
  additionalBehaviors: {
    '/api/*': {
      origin: new HttpOrigin('api.example.com'),
      viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachePolicy: CachePolicy.CACHING_DISABLED,
    },
  },
});
```

With this setup:
- `admin.example.com/api/*` routes to `api.example.com` -- no CORS needed since the browser sees the same origin.
- All other paths serve static files from S3.
- You can add multiple path patterns for different backends (e.g., `/auth/*`, `/ws/*`).

> **Tip:** Always disable caching for API behaviors (`CachePolicy.CACHING_DISABLED`) to ensure requests reach your backend in real time.

### Environment-Aware Defaults

The construct ships with sensible defaults that differ by environment:

| Setting | dev/default | prd |
|---|---|---|
| Removal Policy | DESTROY | RETAIN |
| Auto-delete objects | true | false |
| Versioning | false | true |
| Default cache TTL | 5 minutes | 1 day |
| Max cache TTL | 1 hour | 365 days |
| Access logging | false | true |

Override any default per-environment:

```typescript
const site = new SSS3(this, {
  config,
  siteName: 'admin-portal',
  domainName: 'admin.example.com',
  hostedZone,
  siteConfig: {
    default: { defaultTtl: Duration.minutes(10) },
    prd: { defaultTtl: Duration.hours(12) },
  },
});
```

### Public API

| Method | Description |
|---|---|
| `bucket` | The private S3 bucket (readonly property) |
| `distribution` | The CloudFront distribution (readonly property) |
| `domainName` | The full domain name (readonly property) |
| `getArn()` | Returns the CloudFront distribution ARN |
| `getDistributionId()` | Returns the CloudFront distribution ID |
| `grantDeploy(role)` | Grants S3 read/write + CloudFront invalidation permissions |
| `grantPolicies(role)` | Alias for `grantDeploy` |
| `outputArn()` | Exports the distribution ARN as a CloudFormation output |
| `resourceRemovalPolicy(policy)` | Applies removal policy to the S3 bucket |

### CloudFormation Outputs

The construct automatically exports:

- Distribution ID (`output-<siteName>-distribution-id`)
- Distribution domain name (`output-<siteName>-distribution-domain`)
- S3 bucket name (`output-<siteName>-bucket-name`)

### Important Notes

- **ACM certificates for CloudFront must be in `us-east-1`**. When using `certificate: { type: 'create' }` (default), the stack must deploy to `us-east-1`. For other regions, import a pre-existing certificate.
- **S3 bucket names are globally unique**. The naming convention (`<env>-<serviceName>-<siteName>-assets`) should ensure uniqueness across your organization.
- **OAC (not OAI)**: This construct uses the modern Origin Access Control pattern. Requires CDK >= 2.130.0.
