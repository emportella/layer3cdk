import { BaseConfig, BaseStack, SSS3 } from 'layer3cdk';
import { App } from 'aws-cdk-lib';
import { HostedZone } from 'aws-cdk-lib/aws-route53';

export class ChurroDashboardStack extends BaseStack {
  constructor(scope: App, config: BaseConfig) {
    super(scope, config);
    this.createDashboardSite(config);
  }

  // --- Static Site (S3 + CloudFront) ---

  private createDashboardSite(config: BaseConfig) {
    const hostedZone = HostedZone.fromHostedZoneAttributes(
      this,
      'DashboardZone',
      {
        hostedZoneId: 'Z0000000000FAKE',
        zoneName: 'taco-shop.example.com',
      },
    );

    new SSS3(this, {
      config,
      siteName: 'churro-dashboard',
      domainName: 'dashboard.taco-shop.example.com',
      hostedZone,
      siteConfig: {
        default: { siteType: 'spa' },
      },
    });
  }
}
