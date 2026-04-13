"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChurroDashboardStack = void 0;
const layer3cdk_1 = require("@emportella/layer3cdk");
const aws_route53_1 = require("aws-cdk-lib/aws-route53");
class ChurroDashboardStack extends layer3cdk_1.BaseStack {
    constructor(scope, config) {
        super(scope, config);
        this.createDashboardSite(config);
    }
    // --- Static Site (S3 + CloudFront) ---
    createDashboardSite(config) {
        const hostedZone = aws_route53_1.HostedZone.fromHostedZoneAttributes(this, 'DashboardZone', {
            hostedZoneId: 'Z0000000000FAKE',
            zoneName: 'taco-shop.example.com',
        });
        new layer3cdk_1.SSS3(this, {
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
exports.ChurroDashboardStack = ChurroDashboardStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2h1cnJvRGFzaGJvYXJkLnN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2h1cnJvRGFzaGJvYXJkLnN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFEQUFvRTtBQUVwRSx5REFBcUQ7QUFFckQsTUFBYSxvQkFBcUIsU0FBUSxxQkFBUztJQUNqRCxZQUFZLEtBQVUsRUFBRSxNQUFrQjtRQUN4QyxLQUFLLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3JCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRUQsd0NBQXdDO0lBRWhDLG1CQUFtQixDQUFDLE1BQWtCO1FBQzVDLE1BQU0sVUFBVSxHQUFHLHdCQUFVLENBQUMsd0JBQXdCLENBQ3BELElBQUksRUFDSixlQUFlLEVBQ2Y7WUFDRSxZQUFZLEVBQUUsaUJBQWlCO1lBQy9CLFFBQVEsRUFBRSx1QkFBdUI7U0FDbEMsQ0FDRixDQUFDO1FBRUYsSUFBSSxnQkFBSSxDQUFDLElBQUksRUFBRTtZQUNiLE1BQU07WUFDTixRQUFRLEVBQUUsa0JBQWtCO1lBQzVCLFVBQVUsRUFBRSxpQ0FBaUM7WUFDN0MsVUFBVTtZQUNWLFVBQVUsRUFBRTtnQkFDVixPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFO2FBQzdCO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBNUJELG9EQTRCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEJhc2VDb25maWcsIEJhc2VTdGFjaywgU1NTMyB9IGZyb20gJ0BlbXBvcnRlbGxhL2xheWVyM2Nkayc7XG5pbXBvcnQgeyBBcHAgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBIb3N0ZWRab25lIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMnO1xuXG5leHBvcnQgY2xhc3MgQ2h1cnJvRGFzaGJvYXJkU3RhY2sgZXh0ZW5kcyBCYXNlU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQXBwLCBjb25maWc6IEJhc2VDb25maWcpIHtcbiAgICBzdXBlcihzY29wZSwgY29uZmlnKTtcbiAgICB0aGlzLmNyZWF0ZURhc2hib2FyZFNpdGUoY29uZmlnKTtcbiAgfVxuXG4gIC8vIC0tLSBTdGF0aWMgU2l0ZSAoUzMgKyBDbG91ZEZyb250KSAtLS1cblxuICBwcml2YXRlIGNyZWF0ZURhc2hib2FyZFNpdGUoY29uZmlnOiBCYXNlQ29uZmlnKSB7XG4gICAgY29uc3QgaG9zdGVkWm9uZSA9IEhvc3RlZFpvbmUuZnJvbUhvc3RlZFpvbmVBdHRyaWJ1dGVzKFxuICAgICAgdGhpcyxcbiAgICAgICdEYXNoYm9hcmRab25lJyxcbiAgICAgIHtcbiAgICAgICAgaG9zdGVkWm9uZUlkOiAnWjAwMDAwMDAwMDBGQUtFJyxcbiAgICAgICAgem9uZU5hbWU6ICd0YWNvLXNob3AuZXhhbXBsZS5jb20nLFxuICAgICAgfSxcbiAgICApO1xuXG4gICAgbmV3IFNTUzModGhpcywge1xuICAgICAgY29uZmlnLFxuICAgICAgc2l0ZU5hbWU6ICdjaHVycm8tZGFzaGJvYXJkJyxcbiAgICAgIGRvbWFpbk5hbWU6ICdkYXNoYm9hcmQudGFjby1zaG9wLmV4YW1wbGUuY29tJyxcbiAgICAgIGhvc3RlZFpvbmUsXG4gICAgICBzaXRlQ29uZmlnOiB7XG4gICAgICAgIGRlZmF1bHQ6IHsgc2l0ZVR5cGU6ICdzcGEnIH0sXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG59XG4iXX0=