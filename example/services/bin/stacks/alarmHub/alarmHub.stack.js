"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TacoAlarmHub = void 0;
const layer3cdk_1 = require("@emportella/layer3cdk");
const snsAction_construct_1 = require("@emportella/layer3cdk/dist/alarms/alarmAction/snsAction.construct");
class TacoAlarmHub extends layer3cdk_1.BaseStack {
    constructor(scope, config) {
        super(scope, config);
        this.config = config;
        this.chatbot = this.createChatbot();
        this.opsgenie = this.createOpsGenie();
        this.alarmSnsAction = this.createAlarmSnsAction();
    }
    createChatbot() {
        const channelIds = {
            dev: 'CSLACK0DEV01',
            stg: 'CSLACK0STG01',
            prd: 'CSLACK0PRD01',
        };
        return new layer3cdk_1.ChatbotSlackChannnel(this, {
            config: this.config,
            slackChannelIds: channelIds,
            slackWorkspaceId: 'WKSP1234TACO',
        });
    }
    createOpsGenie() {
        const opsGenieKeys = {
            dev: 'fake-dev-0000-0000-000000000000',
            stg: 'fake-stg-0000-0000-000000000000',
            prd: 'fake-prd-0000-0000-000000000000',
        };
        return new layer3cdk_1.OpsGenie(this, { config: this.config, apiKeys: opsGenieKeys });
    }
    // AlarmSnsAction — wraps SNS topic ARNs into SnsAction objects
    // Useful when importing alarm topics from other stacks by ARN
    createAlarmSnsAction() {
        this.opsgenie.outputArn();
        return new snsAction_construct_1.default(this, {
            config: this.config,
            snsArns: {
                opsGenie: 'arn:aws:sns:us-east-1:123456789012:fake-opsgenie-topic',
            },
        });
    }
    getAlarmActions() {
        return [
            this.chatbot.getSnsAction(),
            ...this.alarmSnsAction.getSnsActions(),
        ];
    }
}
exports.TacoAlarmHub = TacoAlarmHub;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxhcm1IdWIuc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhbGFybUh1Yi5zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxREFPK0I7QUFDL0IsMkdBQStGO0FBSS9GLE1BQWEsWUFBYSxTQUFRLHFCQUFTO0lBTXpDLFlBQVksS0FBVSxFQUFFLE1BQWtCO1FBQ3hDLEtBQUssQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDckIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDcEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUNwRCxDQUFDO0lBRU8sYUFBYTtRQUNuQixNQUFNLFVBQVUsR0FBMkI7WUFDekMsR0FBRyxFQUFFLGNBQWM7WUFDbkIsR0FBRyxFQUFFLGNBQWM7WUFDbkIsR0FBRyxFQUFFLGNBQWM7U0FDcEIsQ0FBQztRQUNGLE9BQU8sSUFBSSxnQ0FBb0IsQ0FBQyxJQUFJLEVBQUU7WUFDcEMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ25CLGVBQWUsRUFBRSxVQUFVO1lBQzNCLGdCQUFnQixFQUFFLGNBQWM7U0FDakMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGNBQWM7UUFDcEIsTUFBTSxZQUFZLEdBQW9CO1lBQ3BDLEdBQUcsRUFBRSxpQ0FBaUM7WUFDdEMsR0FBRyxFQUFFLGlDQUFpQztZQUN0QyxHQUFHLEVBQUUsaUNBQWlDO1NBQ3ZDLENBQUM7UUFDRixPQUFPLElBQUksb0JBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRUQsK0RBQStEO0lBQy9ELDhEQUE4RDtJQUN0RCxvQkFBb0I7UUFDMUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUMxQixPQUFPLElBQUksNkJBQWMsQ0FBQyxJQUFJLEVBQUU7WUFDOUIsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ25CLE9BQU8sRUFBRTtnQkFDUCxRQUFRLEVBQUUsd0RBQXdEO2FBQ25FO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVNLGVBQWU7UUFDcEIsT0FBTztZQUNMLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFO1lBQzNCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLEVBQUU7U0FDdkMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQXRERCxvQ0FzREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBCYXNlQ29uZmlnLFxuICBCYXNlU3RhY2ssXG4gIENoYXRib3RTbGFja0NoYW5uZWxJZHMsXG4gIENoYXRib3RTbGFja0NoYW5ubmVsLFxuICBPcHNHZW5pZSxcbiAgT3BzR2VuaWVBcGlLZXlzLFxufSBmcm9tICdAZW1wb3J0ZWxsYS9sYXllcjNjZGsnO1xuaW1wb3J0IEFsYXJtU25zQWN0aW9uIGZyb20gJ0BlbXBvcnRlbGxhL2xheWVyM2Nkay9kaXN0L2FsYXJtcy9hbGFybUFjdGlvbi9zbnNBY3Rpb24uY29uc3RydWN0JztcbmltcG9ydCB7IEFwcCB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IElBbGFybUFjdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZHdhdGNoJztcblxuZXhwb3J0IGNsYXNzIFRhY29BbGFybUh1YiBleHRlbmRzIEJhc2VTdGFjayB7XG4gIHByaXZhdGUgY2hhdGJvdDogQ2hhdGJvdFNsYWNrQ2hhbm5uZWw7XG4gIHByaXZhdGUgb3BzZ2VuaWU6IE9wc0dlbmllO1xuICBwcml2YXRlIGFsYXJtU25zQWN0aW9uOiBBbGFybVNuc0FjdGlvbjtcbiAgcHJpdmF0ZSByZWFkb25seSBjb25maWc6IEJhc2VDb25maWc7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IEFwcCwgY29uZmlnOiBCYXNlQ29uZmlnKSB7XG4gICAgc3VwZXIoc2NvcGUsIGNvbmZpZyk7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgdGhpcy5jaGF0Ym90ID0gdGhpcy5jcmVhdGVDaGF0Ym90KCk7XG4gICAgdGhpcy5vcHNnZW5pZSA9IHRoaXMuY3JlYXRlT3BzR2VuaWUoKTtcbiAgICB0aGlzLmFsYXJtU25zQWN0aW9uID0gdGhpcy5jcmVhdGVBbGFybVNuc0FjdGlvbigpO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVDaGF0Ym90KCk6IENoYXRib3RTbGFja0NoYW5ubmVsIHtcbiAgICBjb25zdCBjaGFubmVsSWRzOiBDaGF0Ym90U2xhY2tDaGFubmVsSWRzID0ge1xuICAgICAgZGV2OiAnQ1NMQUNLMERFVjAxJyxcbiAgICAgIHN0ZzogJ0NTTEFDSzBTVEcwMScsXG4gICAgICBwcmQ6ICdDU0xBQ0swUFJEMDEnLFxuICAgIH07XG4gICAgcmV0dXJuIG5ldyBDaGF0Ym90U2xhY2tDaGFubm5lbCh0aGlzLCB7XG4gICAgICBjb25maWc6IHRoaXMuY29uZmlnLFxuICAgICAgc2xhY2tDaGFubmVsSWRzOiBjaGFubmVsSWRzLFxuICAgICAgc2xhY2tXb3Jrc3BhY2VJZDogJ1dLU1AxMjM0VEFDTycsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZU9wc0dlbmllKCk6IE9wc0dlbmllIHtcbiAgICBjb25zdCBvcHNHZW5pZUtleXM6IE9wc0dlbmllQXBpS2V5cyA9IHtcbiAgICAgIGRldjogJ2Zha2UtZGV2LTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAnLFxuICAgICAgc3RnOiAnZmFrZS1zdGctMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCcsXG4gICAgICBwcmQ6ICdmYWtlLXByZC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAwJyxcbiAgICB9O1xuICAgIHJldHVybiBuZXcgT3BzR2VuaWUodGhpcywgeyBjb25maWc6IHRoaXMuY29uZmlnLCBhcGlLZXlzOiBvcHNHZW5pZUtleXMgfSk7XG4gIH1cblxuICAvLyBBbGFybVNuc0FjdGlvbiDigJQgd3JhcHMgU05TIHRvcGljIEFSTnMgaW50byBTbnNBY3Rpb24gb2JqZWN0c1xuICAvLyBVc2VmdWwgd2hlbiBpbXBvcnRpbmcgYWxhcm0gdG9waWNzIGZyb20gb3RoZXIgc3RhY2tzIGJ5IEFSTlxuICBwcml2YXRlIGNyZWF0ZUFsYXJtU25zQWN0aW9uKCk6IEFsYXJtU25zQWN0aW9uIHtcbiAgICB0aGlzLm9wc2dlbmllLm91dHB1dEFybigpO1xuICAgIHJldHVybiBuZXcgQWxhcm1TbnNBY3Rpb24odGhpcywge1xuICAgICAgY29uZmlnOiB0aGlzLmNvbmZpZyxcbiAgICAgIHNuc0FybnM6IHtcbiAgICAgICAgb3BzR2VuaWU6ICdhcm46YXdzOnNuczp1cy1lYXN0LTE6MTIzNDU2Nzg5MDEyOmZha2Utb3BzZ2VuaWUtdG9waWMnLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBnZXRBbGFybUFjdGlvbnMoKTogSUFsYXJtQWN0aW9uW10ge1xuICAgIHJldHVybiBbXG4gICAgICB0aGlzLmNoYXRib3QuZ2V0U25zQWN0aW9uKCksXG4gICAgICAuLi50aGlzLmFsYXJtU25zQWN0aW9uLmdldFNuc0FjdGlvbnMoKSxcbiAgICBdO1xuICB9XG59XG4iXX0=