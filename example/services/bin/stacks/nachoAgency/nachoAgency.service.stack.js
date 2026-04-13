"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NachoAgencyServiceStack = void 0;
const layer3cdk_1 = require("@emportella/layer3cdk");
const aws_ec2_1 = require("aws-cdk-lib/aws-ec2");
const aws_ecs_1 = require("aws-cdk-lib/aws-ecs");
class NachoAgencyServiceStack extends layer3cdk_1.BaseStack {
    constructor(scope, config) {
        super(scope, config);
        this.config = config;
        this.ecr = this.createECR();
        this.serviceAccount = this.createServiceAccount();
        this.createIngredientStateTransferTopic();
        this.createOrderedIngredientTopic();
        this.createEcsServices();
    }
    createServiceAccount() {
        return new layer3cdk_1.ServiceAccountRole(this, {
            config: this.config,
            oidcProviderArns: {
                dev: 'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/FAKE_DEV_CLUSTER',
                stg: 'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/FAKE_STG_CLUSTER',
                prd: 'arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/FAKE_PRD_CLUSTER',
            },
        });
    }
    createECR() {
        return layer3cdk_1.ApplicationRepository.create(this, {
            config: this.config,
            repositoryName: 'pltf-nacho-agency-service',
        });
    }
    // --- SNS Standard Topic ---
    createIngredientStateTransferTopic() {
        const topic = new layer3cdk_1.SnsTopic(this, {
            config: this.config,
            eventName: 'IngredientStateTransfer',
        });
        topic.setCloudWatchAlarms(...this.config.alarmActions);
        topic.outputArn();
        topic.grantPolicies(this.serviceAccount.getRole());
    }
    // --- SNS FIFO Topic (ordered ingredient events) ---
    createOrderedIngredientTopic() {
        const topic = new layer3cdk_1.SnsTopicFifo(this, {
            config: this.config,
            eventName: 'OrderedIngredientUpdate',
        });
        topic.setCloudWatchAlarms(...this.config.alarmActions);
        topic.outputArn();
        topic.grantPolicies(this.serviceAccount.getRole());
    }
    // --- ECS Fargate Services ---
    createEcsServices() {
        const vpc = aws_ec2_1.Vpc.fromLookup(this, 'NachoVpc', {
            vpcId: 'vpc-fake-nacho-001',
        });
        const cluster = new layer3cdk_1.EcsCluster(this, {
            config: this.config,
            vpc,
            defaultCloudMapNamespace: 'nacho-agency.local',
        });
        // API service — serves ingredient data
        const api = new layer3cdk_1.EcsFargateService(this, {
            config: this.config,
            serviceName: 'ingredient-api',
            cluster: cluster.getCluster(),
            container: {
                image: aws_ecs_1.ContainerImage.fromRegistry('123456789012.dkr.ecr.us-east-1.amazonaws.com/pltf-nacho-agency-service:latest'),
                portMappings: [{ containerPort: 3000 }],
                environment: {
                    PORT: '3000',
                    NODE_ENV: 'production',
                },
            },
            cloudMapOptions: { name: 'ingredient-api' },
            autoScaling: {
                minCapacity: 1,
                maxCapacity: 4,
                targetCpuUtilization: 70,
            },
            ecsServiceConfig: {
                default: { cpu: 512, memoryLimitMiB: 1024 },
                prd: { cpu: 1024, memoryLimitMiB: 2048, desiredCount: 2 },
            },
        });
        api.setCloudWatchAlarms(...this.config.alarmActions);
        // Worker service — processes ingredient state changes
        const worker = new layer3cdk_1.EcsFargateService(this, {
            config: this.config,
            serviceName: 'ingredient-worker',
            cluster: cluster.getCluster(),
            container: {
                image: aws_ecs_1.ContainerImage.fromRegistry('123456789012.dkr.ecr.us-east-1.amazonaws.com/pltf-nacho-agency-service:latest'),
                command: ['node', 'dist/worker.js'],
                environment: {
                    WORKER_MODE: 'ingredient-sync',
                },
            },
            cloudMapOptions: { name: 'ingredient-worker' },
        });
        worker.setCloudWatchAlarms(...this.config.alarmActions);
    }
}
exports.NachoAgencyServiceStack = NachoAgencyServiceStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmFjaG9BZ2VuY3kuc2VydmljZS5zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm5hY2hvQWdlbmN5LnNlcnZpY2Uuc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscURBUStCO0FBRS9CLGlEQUEwQztBQUMxQyxpREFBcUQ7QUFHckQsTUFBYSx1QkFBd0IsU0FBUSxxQkFBUztJQUtwRCxZQUFZLEtBQVUsRUFBRSxNQUF5QjtRQUMvQyxLQUFLLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3JCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDbEQsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLENBQUM7UUFDMUMsSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUM7UUFDcEMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUVPLG9CQUFvQjtRQUMxQixPQUFPLElBQUksOEJBQWtCLENBQUMsSUFBSSxFQUFFO1lBQ2xDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNuQixnQkFBZ0IsRUFBRTtnQkFDaEIsR0FBRyxFQUFFLDhGQUE4RjtnQkFDbkcsR0FBRyxFQUFFLDhGQUE4RjtnQkFDbkcsR0FBRyxFQUFFLDhGQUE4RjthQUNwRztTQUNGLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxTQUFTO1FBQ2YsT0FBTyxpQ0FBcUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFO1lBQ3hDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNuQixjQUFjLEVBQUUsMkJBQTJCO1NBQzVDLENBQTBCLENBQUM7SUFDOUIsQ0FBQztJQUVELDZCQUE2QjtJQUVyQixrQ0FBa0M7UUFDeEMsTUFBTSxLQUFLLEdB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TUFBTSxFQUFFLGdCQUFnQixDQUFDO2dCQUNuQyxXQUFXLEVBQUU7b0JBQ1gsV0FBVyxFQUFFLGlCQUFpQjtpQkFDL0I7YUFDRjtZQUNELGVBQWUsRUFBRSxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRTtTQUMvQyxDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsbUJBQW1CLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzFELENBQUM7Q0FDRjtBQXBIRCwwREFvSEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBCYXNlU3RhY2ssXG4gIFNlcnZpY2VBY2NvdW50Um9sZSxcbiAgU25zVG9waWMsXG4gIFNuc1RvcGljRmlmbyxcbiAgQXBwbGljYXRpb25SZXBvc2l0b3J5LFxuICBFY3NDbHVzdGVyLFxuICBFY3NGYXJnYXRlU2VydmljZSxcbn0gZnJvbSAnQGVtcG9ydGVsbGEvbGF5ZXIzY2RrJztcbmltcG9ydCB7IEFwcCB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFZwYyB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0IHsgQ29udGFpbmVySW1hZ2UgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNzJztcbmltcG9ydCB7IEFsYXJtQWN0aW9uQ29uZmlnIH0gZnJvbSAnLi4vdGFjb1Byb2Nlc3Nvci90YWNvUHJvY2Vzc29yLnNlcnZpY2Uuc3RhY2snO1xuXG5leHBvcnQgY2xhc3MgTmFjaG9BZ2VuY3lTZXJ2aWNlU3RhY2sgZXh0ZW5kcyBCYXNlU3RhY2sge1xuICBwcml2YXRlIHJlYWRvbmx5IHNlcnZpY2VBY2NvdW50OiBTZXJ2aWNlQWNjb3VudFJvbGU7XG4gIHByaXZhdGUgcmVhZG9ubHkgZWNyOiBBcHBsaWNhdGlvblJlcG9zaXRvcnk7XG4gIHByaXZhdGUgcmVhZG9ubHkgY29uZmlnOiBBbGFybUFjdGlvbkNvbmZpZztcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQXBwLCBjb25maWc6IEFsYXJtQWN0aW9uQ29uZmlnKSB7XG4gICAgc3VwZXIoc2NvcGUsIGNvbmZpZyk7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgdGhpcy5lY3IgPSB0aGlzLmNyZWF0ZUVDUigpO1xuICAgIHRoaXMuc2VydmljZUFjY291bnQgPSB0aGlzLmNyZWF0ZVNlcnZpY2VBY2NvdW50KCk7XG4gICAgdGhpcy5jcmVhdGVJbmdyZWRpZW50U3RhdGVUcmFuc2ZlclRvcGljKCk7XG4gICAgdGhpcy5jcmVhdGVPcmRlcmVkSW5ncmVkaWVudFRvcGljKCk7XG4gICAgdGhpcy5jcmVhdGVFY3NTZXJ2aWNlcygpO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVTZXJ2aWNlQWNjb3VudCgpIHtcbiAgICByZXR1cm4gbmV3IFNlcnZpY2VBY2NvdW50Um9sZSh0aGlzLCB7XG4gICAgICBjb25maWc6IHRoaXMuY29uZmlnLFxuICAgICAgb2lkY1Byb3ZpZGVyQXJuczoge1xuICAgICAgICBkZXY6ICdhcm46YXdzOmlhbTo6MTIzNDU2Nzg5MDEyOm9pZGMtcHJvdmlkZXIvb2lkYy5la3MudXMtZWFzdC0xLmFtYXpvbmF3cy5jb20vaWQvRkFLRV9ERVZfQ0xVU1RFUicsXG4gICAgICAgIHN0ZzogJ2Fybjphd3M6aWFtOjoxMjM0NTY3ODkwMTI6b2lkYy1wcm92aWRlci9vaWRjLmVrcy51cy1lYXN0LTEuYW1hem9uYXdzLmNvbS9pZC9GQUtFX1NUR19DTFVTVEVSJyxcbiAgICAgICAgcHJkOiAnYXJuOmF3czppYW06OjEyMzQ1Njc4OTAxMjpvaWRjLXByb3ZpZGVyL29pZGMuZWtzLnVzLWVhc3QtMS5hbWF6b25hd3MuY29tL2lkL0ZBS0VfUFJEX0NMVVNURVInLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlRUNSKCkge1xuICAgIHJldHVybiBBcHBsaWNhdGlvblJlcG9zaXRvcnkuY3JlYXRlKHRoaXMsIHtcbiAgICAgIGNvbmZpZzogdGhpcy5jb25maWcsXG4gICAgICByZXBvc2l0b3J5TmFtZTogJ3BsdGYtbmFjaG8tYWdlbmN5LXNlcnZpY2UnLFxuICAgIH0pIGFzIEFwcGxpY2F0aW9uUmVwb3NpdG9yeTtcbiAgfVxuXG4gIC8vIC0tLSBTTlMgU3RhbmRhcmQgVG9waWMgLS0tXG5cbiAgcHJpdmF0ZSBjcmVhdGVJbmdyZWRpZW50U3RhdGVUcmFuc2ZlclRvcGljKCkge1xuICAgIGNvbnN0IHRvcGljID0gbmV3IFNuc1RvcGljKHRoaXMsIHtcbiAgICAgIGNvbmZpZzogdGhpcy5jb25maWcsXG4gICAgICBldmVudE5hbWU6ICdJbmdyZWRpZW50U3RhdGVUcmFuc2ZlcicsXG4gICAgfSk7XG4gICAgdG9waWMuc2V0Q2xvdWRXYXRjaEFsYXJtcyguLi50aGlzLmNvbmZpZy5hbGFybUFjdGlvbnMpO1xuICAgIHRvcGljLm91dHB1dEFybigpO1xuICAgIHRvcGljLmdyYW50UG9saWNpZXModGhpcy5zZXJ2aWNlQWNjb3VudC5nZXRSb2xlKCkpO1xuICB9XG5cbiAgLy8gLS0tIFNOUyBGSUZPIFRvcGljIChvcmRlcmVkIGluZ3JlZGllbnQgZXZlbnRzKSAtLS1cblxuICBwcml2YXRlIGNyZWF0ZU9yZGVyZWRJbmdyZWRpZW50VG9waWMoKSB7XG4gICAgY29uc3QgdG9waWMgPSBuZXcgU25zVG9waWNGaWZvKHRoaXMsIHtcbiAgICAgIGNvbmZpZzogdGhpcy5jb25maWcsXG4gICAgICBldmVudE5hbWU6ICdPcmRlcmVkSW5ncmVkaWVudFVwZGF0ZScsXG4gICAgfSk7XG4gICAgdG9waWMuc2V0Q2xvdWRXYXRjaEFsYXJtcyguLi50aGlzLmNvbmZpZy5hbGFybUFjdGlvbnMpO1xuICAgIHRvcGljLm91dHB1dEFybigpO1xuICAgIHRvcGljLmdyYW50UG9saWNpZXModGhpcy5zZXJ2aWNlQWNjb3VudC5nZXRSb2xlKCkpO1xuICB9XG5cbiAgLy8gLS0tIEVDUyBGYXJnYXRlIFNlcnZpY2VzIC0tLVxuXG4gIHByaXZhdGUgY3JlYXRlRWNzU2VydmljZXMoKSB7XG4gICAgY29uc3QgdnBjID0gVnBjLmZyb21Mb29rdXAodGhpcywgJ05hY2hvVnBjJywge1xuICAgICAgdnBjSWQ6ICd2cGMtZmFrZS1uYWNoby0wMDEnLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY2x1c3RlciA9IG5ldyBFY3NDbHVzdGVyKHRoaXMsIHtcbiAgICAgIGNvbmZpZzogdGhpcy5jb25maWcsXG4gICAgICB2cGMsXG4gICAgICBkZWZhdWx0Q2xvdWRNYXBOYW1lc3BhY2U6ICduYWNoby1hZ2VuY3kubG9jYWwnLFxuICAgIH0pO1xuXG4gICAgLy8gQVBJIHNlcnZpY2Ug4oCUIHNlcnZlcyBpbmdyZWRpZW50IGRhdGFcbiAgICBjb25zdCBhcGkgPSBuZXcgRWNzRmFyZ2F0ZVNlcnZpY2UodGhpcywge1xuICAgICAgY29uZmlnOiB0aGlzLmNvbmZpZyxcbiAgICAgIHNlcnZpY2VOYW1lOiAnaW5ncmVkaWVudC1hcGknLFxuICAgICAgY2x1c3RlcjogY2x1c3Rlci5nZXRDbHVzdGVyKCksXG4gICAgICBjb250YWluZXI6IHtcbiAgICAgICAgaW1hZ2U6IENvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeShcbiAgICAgICAgICAnMTIzNDU2Nzg5MDEyLmRrci5lY3IudXMtZWFzdC0xLmFtYXpvbmF3cy5jb20vcGx0Zi1uYWNoby1hZ2VuY3ktc2VydmljZTpsYXRlc3QnLFxuICAgICAgICApLFxuICAgICAgICBwb3J0TWFwcGluZ3M6IFt7IGNvbnRhaW5lclBvcnQ6IDMwMDAgfV0sXG4gICAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgICAgUE9SVDogJzMwMDAnLFxuICAgICAgICAgIE5PREVfRU5WOiAncHJvZHVjdGlvbicsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgY2xvdWRNYXBPcHRpb25zOiB7IG5hbWU6ICdpbmdyZWRpZW50LWFwaScgfSxcbiAgICAgIGF1dG9TY2FsaW5nOiB7XG4gICAgICAgIG1pbkNhcGFjaXR5OiAxLFxuICAgICAgICBtYXhDYXBhY2l0eTogNCxcbiAgICAgICAgdGFyZ2V0Q3B1VXRpbGl6YXRpb246IDcwLFxuICAgICAgfSxcbiAgICAgIGVjc1NlcnZpY2VDb25maWc6IHtcbiAgICAgICAgZGVmYXVsdDogeyBjcHU6IDUxMiwgbWVtb3J5TGltaXRNaUI6IDEwMjQgfSxcbiAgICAgICAgcHJkOiB7IGNwdTogMTAyNCwgbWVtb3J5TGltaXRNaUI6IDIwNDgsIGRlc2lyZWRDb3VudDogMiB9LFxuICAgICAgfSxcbiAgICB9KTtcbiAgICBhcGkuc2V0Q2xvdWRXYXRjaEFsYXJtcyguLi50aGlzLmNvbmZpZy5hbGFybUFjdGlvbnMpO1xuXG4gICAgLy8gV29ya2VyIHNlcnZpY2Ug4oCUIHByb2Nlc3NlcyBpbmdyZWRpZW50IHN0YXRlIGNoYW5nZXNcbiAgICBjb25zdCB3b3JrZXIgPSBuZXcgRWNzRmFyZ2F0ZVNlcnZpY2UodGhpcywge1xuICAgICAgY29uZmlnOiB0aGlzLmNvbmZpZyxcbiAgICAgIHNlcnZpY2VOYW1lOiAnaW5ncmVkaWVudC13b3JrZXInLFxuICAgICAgY2x1c3RlcjogY2x1c3Rlci5nZXRDbHVzdGVyKCksXG4gICAgICBjb250YWluZXI6IHtcbiAgICAgICAgaW1hZ2U6IENvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeShcbiAgICAgICAgICAnMTIzNDU2Nzg5MDEyLmRrci5lY3IudXMtZWFzdC0xLmFtYXpvbmF3cy5jb20vcGx0Zi1uYWNoby1hZ2VuY3ktc2VydmljZTpsYXRlc3QnLFxuICAgICAgICApLFxuICAgICAgICBjb21tYW5kOiBbJ25vZGUnLCAnZGlzdC93b3JrZXIuanMnXSxcbiAgICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICBXT1JLRVJfTU9ERTogJ2luZ3JlZGllbnQtc3luYycsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgY2xvdWRNYXBPcHRpb25zOiB7IG5hbWU6ICdpbmdyZWRpZW50LXdvcmtlcicgfSxcbiAgICB9KTtcbiAgICB3b3JrZXIuc2V0Q2xvdWRXYXRjaEFsYXJtcyguLi50aGlzLmNvbmZpZy5hbGFybUFjdGlvbnMpO1xuICB9XG59XG4iXX0=