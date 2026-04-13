"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalsaNotifierServiceStack = void 0;
const layer3cdk_1 = require("@emportella/layer3cdk");
class SalsaNotifierServiceStack extends layer3cdk_1.BaseStack {
    constructor(scope, config) {
        super(scope, config);
        this.config = config;
        this.serviceAccount = this.createServiceAccount();
        this.ecr = this.createECR();
        this.dlq = this.createDLQ();
        this.dlqFifo = this.createDLQFifo();
        // Standard queues
        this.createOrderPlacedQueue();
        this.createNotificationFanInQueue();
        // FIFO queues — ordered notification delivery
        this.createOrderedNotificationQueue();
        // SSM — department-level notification config
        this.createSSMParameters();
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
            repositoryName: 'pltf-salsa-notifier-service',
        });
    }
    createDLQ() {
        const dlq = new layer3cdk_1.DLQ(this, this.config);
        dlq.setCloudWatchAlarms(...this.config.alarmActions);
        return dlq;
    }
    // --- DLQ FIFO for ordered notification queues ---
    createDLQFifo() {
        return new layer3cdk_1.DLQFifo(this, { config: this.config });
    }
    // --- Standard Queues ---
    createOrderPlacedQueue() {
        const queue = new layer3cdk_1.StandardQueue(this, {
            config: this.config,
            eventName: 'OrderPlaced',
            dlq: this.dlq.getDlq(),
        });
        queue.subscribeFromSNSTopicImport(`output-${this.config.stackEnv}-OrderPlaced-arn`);
        queue.setCloudWatchAlarms(...this.config.alarmActions);
        queue.grantPolicies(this.serviceAccount.getRole());
    }
    createNotificationFanInQueue() {
        const queue = new layer3cdk_1.FaninQueue(this, {
            config: this.config,
            eventName: 'SendNotification',
            dlq: this.dlq.getDlq(),
        });
        queue.setCloudWatchAlarms(...this.config.alarmActions);
        queue.grantPolicies(this.serviceAccount.getRole());
    }
    // --- FIFO Queue (guaranteed ordering for notification delivery) ---
    createOrderedNotificationQueue() {
        const queue = new layer3cdk_1.StandardQueueFifo(this, {
            config: this.config,
            eventName: 'OrderedNotificationDelivery',
            dlq: this.dlqFifo.getDlq(),
        });
        queue.setCloudWatchAlarms(...this.config.alarmActions);
        queue.grantPolicies(this.serviceAccount.getRole());
    }
    // --- SSM Parameters ---
    createSSMParameters() {
        // Department-level — shared across all notification services in the department
        new layer3cdk_1.DepartmentSSMStringParameter(this, {
            config: this.config,
            parameterName: 'notification-sender-email',
            parameterValue: 'noreply@taco-shop.example.com',
        });
    }
}
exports.SalsaNotifierServiceStack = SalsaNotifierServiceStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Fsc2FOb3RpZmllci5zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNhbHNhTm90aWZpZXIuc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscURBVStCO0FBSS9CLE1BQWEseUJBQTBCLFNBQVEscUJBQVM7SUFPdEQsWUFBWSxLQUFVLEVBQUUsTUFBeUI7UUFDL0MsS0FBSyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNyQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQ2xELElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBRXBDLGtCQUFrQjtRQUNsQixJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUM5QixJQUFJLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztRQUVwQyw4Q0FBOEM7UUFDOUMsSUFBSSxDQUFDLDhCQUE4QixFQUFFLENBQUM7UUFFdEMsNkNBQTZDO1FBQzdDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0lBQzdCLENBQUM7SUFFTyxvQkFBb0I7UUFDMUIsT0FBTyxJQUFJLDhCQUFrQixDQUFDLElBQUksRUFBRTtZQUNsQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07WUFDbkIsZ0JBQWdCLEVBQUU7Z0JBQ2hCLEdBQUcsRUFBRSw4RkFBOEY7Z0JBQ25HLEdBQUcsRUFBRSw4RkFBOEY7Z0JBQ25HLEdBQUcsRUFBRSw4RkFBOEY7YUFDcEc7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sU0FBUztRQUNmLE9BQU8saUNBQXFCLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRTtZQUN4QyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07WUFDbkIsY0FBYyxFQUFFLDZCQUE2QjtTQUM5QyxDQUEwQixDQUFDO0lBQzlCLENBQUM7SUFFTyxTQUFTO1FBQ2YsTUFBTSxHQUFHLEdBQUcsSUFBSSxlQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2QyxHQUFHLENBQUMsbUJBQW1CLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3JELE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUVELG1EQUFtRDtJQUUzQyxhQUFhO1FBQ25CLE9BQU8sSUFBSSxtQkFBTyxDQUFDLElBQUksRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRUQsMEJBQTBCO0lBRWxCLHNCQUFzQjtRQUM1QixNQUFNLEtBQUssR0FBRyxJQUFJLHlCQUFhLENBQUMsSUFBSSxFQUFFO1lBQ3BDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNuQixTQUFTLEVBQUUsYUFBYTtZQUN4QixHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUU7U0FDdkIsQ0FBQyxDQUFDO1FBQ0gsS0FBSyxDQUFDLDJCQUEyQixDQUMvQixVQUFVLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxrQkFBa0IsQ0FDakQsQ0FBQztRQUNGLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDdkQsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVPLDRCQUE0QjtRQUNsQyxNQUFNLEtBQUssR0FBRyxJQUFJLHNCQUFVLENBQUMsSUFBSSxFQUFFO1lBQ2pDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNuQixTQUFTLEVBQUUsa0JBQWtCO1lBQzdCLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRTtTQUN2QixDQUFDLENBQUM7UUFDSCxLQUFLLENBQUMsbUJBQW1CLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3ZELEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFRCxxRUFBcUU7SUFFN0QsOEJBQThCO1FBQ3BDLE1BQU0sS0FBSyxHQUFHLElBQUksNkJBQWlCLENBQUMsSUFBSSxFQUFFO1lBQ3hDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNuQixTQUFTLEVBQUUsNkJBQTZCO1lBQ3hDLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtTQUMzQixDQUFDLENBQUM7UUFDSCxLQUFLLENBQUMsbUJBQW1CLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3ZELEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFRCx5QkFBeUI7SUFFakIsbUJBQW1CO1FBQ3pCLCtFQUErRTtRQUMvRSxJQUFJLHdDQUE0QixDQUFDLElBQUksRUFBRTtZQUNyQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07WUFDbkIsYUFBYSxFQUFFLDJCQUEyQjtZQUMxQyxjQUFjLEVBQUUsK0JBQStCO1NBQ2hELENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXZHRCw4REF1R0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBCYXNlU3RhY2ssXG4gIFNlcnZpY2VBY2NvdW50Um9sZSxcbiAgRExRLFxuICBETFFGaWZvLFxuICBTdGFuZGFyZFF1ZXVlLFxuICBTdGFuZGFyZFF1ZXVlRmlmbyxcbiAgRmFuaW5RdWV1ZSxcbiAgQXBwbGljYXRpb25SZXBvc2l0b3J5LFxuICBEZXBhcnRtZW50U1NNU3RyaW5nUGFyYW1ldGVyLFxufSBmcm9tICdAZW1wb3J0ZWxsYS9sYXllcjNjZGsnO1xuaW1wb3J0IHsgQXBwIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQWxhcm1BY3Rpb25Db25maWcgfSBmcm9tICcuLi90YWNvUHJvY2Vzc29yL3RhY29Qcm9jZXNzb3Iuc2VydmljZS5zdGFjayc7XG5cbmV4cG9ydCBjbGFzcyBTYWxzYU5vdGlmaWVyU2VydmljZVN0YWNrIGV4dGVuZHMgQmFzZVN0YWNrIHtcbiAgcHJpdmF0ZSByZWFkb25seSBzZXJ2aWNlQWNjb3VudDogU2VydmljZUFjY291bnRSb2xlO1xuICBwcml2YXRlIHJlYWRvbmx5IGVjcjogQXBwbGljYXRpb25SZXBvc2l0b3J5O1xuICBwcml2YXRlIHJlYWRvbmx5IGRscTogRExRO1xuICBwcml2YXRlIHJlYWRvbmx5IGRscUZpZm86IERMUUZpZm87XG4gIHByaXZhdGUgcmVhZG9ubHkgY29uZmlnOiBBbGFybUFjdGlvbkNvbmZpZztcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQXBwLCBjb25maWc6IEFsYXJtQWN0aW9uQ29uZmlnKSB7XG4gICAgc3VwZXIoc2NvcGUsIGNvbmZpZyk7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgdGhpcy5zZXJ2aWNlQWNjb3VudCA9IHRoaXMuY3JlYXRlU2VydmljZUFjY291bnQoKTtcbiAgICB0aGlzLmVjciA9IHRoaXMuY3JlYXRlRUNSKCk7XG4gICAgdGhpcy5kbHEgPSB0aGlzLmNyZWF0ZURMUSgpO1xuICAgIHRoaXMuZGxxRmlmbyA9IHRoaXMuY3JlYXRlRExRRmlmbygpO1xuXG4gICAgLy8gU3RhbmRhcmQgcXVldWVzXG4gICAgdGhpcy5jcmVhdGVPcmRlclBsYWNlZFF1ZXVlKCk7XG4gICAgdGhpcy5jcmVhdGVOb3RpZmljYXRpb25GYW5JblF1ZXVlKCk7XG5cbiAgICAvLyBGSUZPIHF1ZXVlcyDigJQgb3JkZXJlZCBub3RpZmljYXRpb24gZGVsaXZlcnlcbiAgICB0aGlzLmNyZWF0ZU9yZGVyZWROb3RpZmljYXRpb25RdWV1ZSgpO1xuXG4gICAgLy8gU1NNIOKAlCBkZXBhcnRtZW50LWxldmVsIG5vdGlmaWNhdGlvbiBjb25maWdcbiAgICB0aGlzLmNyZWF0ZVNTTVBhcmFtZXRlcnMoKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlU2VydmljZUFjY291bnQoKSB7XG4gICAgcmV0dXJuIG5ldyBTZXJ2aWNlQWNjb3VudFJvbGUodGhpcywge1xuICAgICAgY29uZmlnOiB0aGlzLmNvbmZpZyxcbiAgICAgIG9pZGNQcm92aWRlckFybnM6IHtcbiAgICAgICAgZGV2OiAnYXJuOmF3czppYW06OjEyMzQ1Njc4OTAxMjpvaWRjLXByb3ZpZGVyL29pZGMuZWtzLnVzLWVhc3QtMS5hbWF6b25hd3MuY29tL2lkL0ZBS0VfREVWX0NMVVNURVInLFxuICAgICAgICBzdGc6ICdhcm46YXdzOmlhbTo6MTIzNDU2Nzg5MDEyOm9pZGMtcHJvdmlkZXIvb2lkYy5la3MudXMtZWFzdC0xLmFtYXpvbmF3cy5jb20vaWQvRkFLRV9TVEdfQ0xVU1RFUicsXG4gICAgICAgIHByZDogJ2Fybjphd3M6aWFtOjoxMjM0NTY3ODkwMTI6b2lkYy1wcm92aWRlci9vaWRjLmVrcy51cy1lYXN0LTEuYW1hem9uYXdzLmNvbS9pZC9GQUtFX1BSRF9DTFVTVEVSJyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUVDUigpIHtcbiAgICByZXR1cm4gQXBwbGljYXRpb25SZXBvc2l0b3J5LmNyZWF0ZSh0aGlzLCB7XG4gICAgICBjb25maWc6IHRoaXMuY29uZmlnLFxuICAgICAgcmVwb3NpdG9yeU5hbWU6ICdwbHRmLXNhbHNhLW5vdGlmaWVyLXNlcnZpY2UnLFxuICAgIH0pIGFzIEFwcGxpY2F0aW9uUmVwb3NpdG9yeTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlRExRKCk6IERMUSB7XG4gICAgY29uc3QgZGxxID0gbmV3IERMUSh0aGlzLCB0aGlzLmNvbmZpZyk7XG4gICAgZGxxLnNldENsb3VkV2F0Y2hBbGFybXMoLi4udGhpcy5jb25maWcuYWxhcm1BY3Rpb25zKTtcbiAgICByZXR1cm4gZGxxO1xuICB9XG5cbiAgLy8gLS0tIERMUSBGSUZPIGZvciBvcmRlcmVkIG5vdGlmaWNhdGlvbiBxdWV1ZXMgLS0tXG5cbiAgcHJpdmF0ZSBjcmVhdGVETFFGaWZvKCk6IERMUUZpZm8ge1xuICAgIHJldHVybiBuZXcgRExRRmlmbyh0aGlzLCB7IGNvbmZpZzogdGhpcy5jb25maWcgfSk7XG4gIH1cblxuICAvLyAtLS0gU3RhbmRhcmQgUXVldWVzIC0tLVxuXG4gIHByaXZhdGUgY3JlYXRlT3JkZXJQbGFjZWRRdWV1ZSgpIHtcbiAgICBjb25zdCBxdWV1ZSA9IG5ldyBTdGFuZGFyZFF1ZXVlKHRoaXMsIHtcbiAgICAgIGNvbmZpZzogdGhpcy5jb25maWcsXG4gICAgICBldmVudE5hbWU6ICdPcmRlclBsYWNlZCcsXG4gICAgICBkbHE6IHRoaXMuZGxxLmdldERscSgpLFxuICAgIH0pO1xuICAgIHF1ZXVlLnN1YnNjcmliZUZyb21TTlNUb3BpY0ltcG9ydChcbiAgICAgIGBvdXRwdXQtJHt0aGlzLmNvbmZpZy5zdGFja0Vudn0tT3JkZXJQbGFjZWQtYXJuYCxcbiAgICApO1xuICAgIHF1ZXVlLnNldENsb3VkV2F0Y2hBbGFybXMoLi4udGhpcy5jb25maWcuYWxhcm1BY3Rpb25zKTtcbiAgICBxdWV1ZS5ncmFudFBvbGljaWVzKHRoaXMuc2VydmljZUFjY291bnQuZ2V0Um9sZSgpKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlTm90aWZpY2F0aW9uRmFuSW5RdWV1ZSgpIHtcbiAgICBjb25zdCBxdWV1ZSA9IG5ldyBGYW5pblF1ZXVlKHRoaXMsIHtcbiAgICAgIGNvbmZpZzogdGhpcy5jb25maWcsXG4gICAgICBldmVudE5hbWU6ICdTZW5kTm90aWZpY2F0aW9uJyxcbiAgICAgIGRscTogdGhpcy5kbHEuZ2V0RGxxKCksXG4gICAgfSk7XG4gICAgcXVldWUuc2V0Q2xvdWRXYXRjaEFsYXJtcyguLi50aGlzLmNvbmZpZy5hbGFybUFjdGlvbnMpO1xuICAgIHF1ZXVlLmdyYW50UG9saWNpZXModGhpcy5zZXJ2aWNlQWNjb3VudC5nZXRSb2xlKCkpO1xuICB9XG5cbiAgLy8gLS0tIEZJRk8gUXVldWUgKGd1YXJhbnRlZWQgb3JkZXJpbmcgZm9yIG5vdGlmaWNhdGlvbiBkZWxpdmVyeSkgLS0tXG5cbiAgcHJpdmF0ZSBjcmVhdGVPcmRlcmVkTm90aWZpY2F0aW9uUXVldWUoKSB7XG4gICAgY29uc3QgcXVldWUgPSBuZXcgU3RhbmRhcmRRdWV1ZUZpZm8odGhpcywge1xuICAgICAgY29uZmlnOiB0aGlzLmNvbmZpZyxcbiAgICAgIGV2ZW50TmFtZTogJ09yZGVyZWROb3RpZmljYXRpb25EZWxpdmVyeScsXG4gICAgICBkbHE6IHRoaXMuZGxxRmlmby5nZXREbHEoKSxcbiAgICB9KTtcbiAgICBxdWV1ZS5zZXRDbG91ZFdhdGNoQWxhcm1zKC4uLnRoaXMuY29uZmlnLmFsYXJtQWN0aW9ucyk7XG4gICAgcXVldWUuZ3JhbnRQb2xpY2llcyh0aGlzLnNlcnZpY2VBY2NvdW50LmdldFJvbGUoKSk7XG4gIH1cblxuICAvLyAtLS0gU1NNIFBhcmFtZXRlcnMgLS0tXG5cbiAgcHJpdmF0ZSBjcmVhdGVTU01QYXJhbWV0ZXJzKCkge1xuICAgIC8vIERlcGFydG1lbnQtbGV2ZWwg4oCUIHNoYXJlZCBhY3Jvc3MgYWxsIG5vdGlmaWNhdGlvbiBzZXJ2aWNlcyBpbiB0aGUgZGVwYXJ0bWVudFxuICAgIG5ldyBEZXBhcnRtZW50U1NNU3RyaW5nUGFyYW1ldGVyKHRoaXMsIHtcbiAgICAgIGNvbmZpZzogdGhpcy5jb25maWcsXG4gICAgICBwYXJhbWV0ZXJOYW1lOiAnbm90aWZpY2F0aW9uLXNlbmRlci1lbWFpbCcsXG4gICAgICBwYXJhbWV0ZXJWYWx1ZTogJ25vcmVwbHlAdGFjby1zaG9wLmV4YW1wbGUuY29tJyxcbiAgICB9KTtcbiAgfVxufVxuIl19