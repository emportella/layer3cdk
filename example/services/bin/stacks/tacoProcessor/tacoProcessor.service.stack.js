"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TacoProcessorServiceStack = void 0;
const path = require("path");
const layer3cdk_1 = require("@emportella/layer3cdk");
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
class TacoProcessorServiceStack extends layer3cdk_1.BaseStack {
    constructor(scope, config) {
        super(scope, config);
        this.config = config;
        this.serviceAccount = this.createServiceAccount();
        this.dlq = this.createDLQ();
        this.ecr = this.createECR();
        // SQS queues
        this.createOrderPlacedQueue();
        this.createRecipeUpdatedQueue();
        this.createTacoScoreChangedQueue();
        this.createSauceStatusUpdatedQueue();
        this.createBurritoSubmittedQueue();
        this.subscribeToFaninQueues();
        // Background tasks queue
        this.createScoreRecalculationTask();
        // DynamoDB table
        this.createOrdersTable();
        // Redis cache
        this.createOrderCache();
        // SSM parameters
        this.createSSMParameters();
        // Secrets
        this.createSecrets();
        // Lambda for async processing
        this.createScoreCalculatorLambda();
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
            repositoryName: 'pltf-taco-processor-service',
        });
    }
    createDLQ() {
        const dlq = new layer3cdk_1.DLQ(this, this.config);
        dlq.setCloudWatchAlarms(...this.config.alarmActions);
        return dlq;
    }
    // --- SQS Standard Queues ---
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
    createSauceStatusUpdatedQueue() {
        const queue = new layer3cdk_1.StandardQueue(this, {
            config: this.config,
            eventName: 'SauceStatusUpdated',
            dlq: this.dlq.getDlq(),
        });
        queue.subscribeFromSNSTopicImport(`output-${this.config.stackEnv}-SauceStatusUpdated-arn`);
        queue.setCloudWatchAlarms(...this.config.alarmActions);
        queue.grantPolicies(this.serviceAccount.getRole());
    }
    createBurritoSubmittedQueue() {
        const ACCOUNT = this.config.stackEnv == 'prd' ? '111111111111' : '222222222222';
        const queue = new layer3cdk_1.StandardQueue(this, {
            config: this.config,
            eventName: 'BurritoSubmitted',
            dlq: this.dlq.getDlq(),
        });
        queue.subscribeFromSNSTopicArn(`arn:aws:sns:us-east-1:${ACCOUNT}:${this.config.stackEnv}-BurritoSubmitted`);
        queue.setCloudWatchAlarms(...this.config.alarmActions);
        queue.grantPolicies(this.serviceAccount.getRole());
    }
    createRecipeUpdatedQueue() {
        const queue = new layer3cdk_1.StandardQueue(this, {
            config: this.config,
            eventName: 'RecipeUpdated',
            dlq: this.dlq.getDlq(),
        });
        queue.subscribeFromSNSTopicImport(`output-${this.config.stackEnv}-RecipeUpdated-arn`);
        queue.setCloudWatchAlarms(...this.config.alarmActions);
        queue.grantPolicies(this.serviceAccount.getRole());
    }
    createTacoScoreChangedQueue() {
        const queue = new layer3cdk_1.StandardQueue(this, {
            config: this.config,
            eventName: 'TacoScoreChanged',
            dlq: this.dlq.getDlq(),
        });
        queue.subscribeFromSNSTopicImport(`output-${this.config.stackEnv}-TacoScoreChanged-arn`);
        queue.setCloudWatchAlarms(...this.config.alarmActions);
        queue.grantPolicies(this.serviceAccount.getRole());
    }
    subscribeToFaninQueues() {
        (0, layer3cdk_1.grantFaninPublishing)({
            role: this.serviceAccount.getRole(),
            faninQueues: [
                {
                    eventName: 'SendNotification',
                    serviceName: 'salsa-notifier',
                },
            ],
            region: this.config.env.region ?? '',
            accountId: this.config.env.account ?? '',
            env: this.config.stackEnv,
        });
    }
    // --- Background Tasks Queue ---
    createScoreRecalculationTask() {
        const queue = new layer3cdk_1.BackgroundTasksQueue(this, {
            config: this.config,
            eventName: 'RecalculateTacoScore',
            dlq: this.dlq.getDlq(),
        });
        queue.setCloudWatchAlarms(...this.config.alarmActions);
        queue.grantPolicies(this.serviceAccount.getRole());
    }
    // --- DynamoDB ---
    createOrdersTable() {
        const table = new layer3cdk_1.DynamoTable(this, {
            config: this.config,
            tableName: 'Orders',
            dynamoProps: {
                default: {
                    partitionKey: { name: 'orderId', type: aws_dynamodb_1.AttributeType.STRING },
                    sortKey: { name: 'createdAt', type: aws_dynamodb_1.AttributeType.STRING },
                },
            },
            dynamoConfig: {
                default: {
                    billing: aws_dynamodb_1.Billing.provisioned({
                        readCapacity: aws_dynamodb_1.Capacity.autoscaled({
                            minCapacity: 5,
                            maxCapacity: 50,
                        }),
                        writeCapacity: aws_dynamodb_1.Capacity.autoscaled({
                            minCapacity: 5,
                            maxCapacity: 50,
                        }),
                    }),
                    alarmReadThreshold: 40,
                    alarmWriteThreshold: 40,
                },
                prd: {
                    billing: aws_dynamodb_1.Billing.provisioned({
                        readCapacity: aws_dynamodb_1.Capacity.autoscaled({
                            minCapacity: 20,
                            maxCapacity: 200,
                        }),
                        writeCapacity: aws_dynamodb_1.Capacity.autoscaled({
                            minCapacity: 20,
                            maxCapacity: 200,
                        }),
                    }),
                    alarmReadThreshold: 70,
                    alarmWriteThreshold: 70,
                },
            },
        });
        table.setCloudWatchAlarms(...this.config.alarmActions);
        table.grantPolicies(this.serviceAccount.getRole());
        table.outputArn();
    }
    // --- Redis ---
    createOrderCache() {
        new layer3cdk_1.RedisReplicationGroup(this, {
            config: this.config,
            elasticacheProps: {
                default: {
                    subnets: [{ id: 'subnet-fake-1a' }, { id: 'subnet-fake-1b' }],
                    replicationGroupDescription: 'Taco Processor order cache',
                    securityGroupIds: ['sg-fake-redis-001'],
                },
            },
            elasticacheConfig: {
                default: {
                    clusterMode: 'enabled',
                    multiAzEnabled: false,
                },
                prd: {
                    clusterMode: 'enabled',
                    multiAzEnabled: true,
                },
            },
        });
    }
    // --- SSM Parameters ---
    createSSMParameters() {
        // Global parameter — shared across all services
        new layer3cdk_1.GlobalSSMStringParameter(this, {
            config: this.config,
            parameterName: 'taco-api-base-url',
            parameterValue: 'https://api.taco-shop.example.com',
        });
        // Service-level parameter — scoped to this service
        new layer3cdk_1.ServiceSSMStringParameter(this, {
            config: this.config,
            parameterName: 'max-concurrent-orders',
            parameterValue: '100',
        });
    }
    // --- Secrets ---
    createSecrets() {
        new layer3cdk_1.GlobalSecrets(this, {
            config: this.config,
            parameterName: 'taco-db-credentials',
        });
    }
    // --- Lambda ---
    createScoreCalculatorLambda() {
        const lambda = new layer3cdk_1.NodejsLambdaFunction(this, {
            config: this.config,
            functionName: 'calculate-taco-score',
            entry: path.join(__dirname, '../../handlers/calculate-taco-score.ts'),
            lambdaConfig: {
                default: { memorySize: 512 },
                prd: { memorySize: 1024 },
            },
        });
        lambda.addPermissions(new aws_iam_1.PolicyStatement({
            effect: aws_iam_1.Effect.ALLOW,
            actions: ['dynamodb:Query', 'dynamodb:GetItem'],
            resources: ['*'],
        }));
        lambda.setCloudWatchAlarms(...this.config.alarmActions);
    }
}
exports.TacoProcessorServiceStack = TacoProcessorServiceStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFjb1Byb2Nlc3Nvci5zZXJ2aWNlLnN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGFjb1Byb2Nlc3Nvci5zZXJ2aWNlLnN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZCQUE2QjtBQUM3QixxREFlK0I7QUFFL0IsMkRBQTRFO0FBRTVFLGlEQUE4RDtBQU05RCxNQUFhLHlCQUEwQixTQUFRLHFCQUFTO0lBTXRELFlBQVksS0FBVSxFQUFFLE1BQXlCO1FBQy9DLEtBQUssQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDckIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUNsRCxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUU1QixhQUFhO1FBQ2IsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFDOUIsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7UUFDaEMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUM7UUFDbkMsSUFBSSxDQUFDLDZCQUE2QixFQUFFLENBQUM7UUFDckMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUM7UUFDbkMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFFOUIseUJBQXlCO1FBQ3pCLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxDQUFDO1FBRXBDLGlCQUFpQjtRQUNqQixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUV6QixjQUFjO1FBQ2QsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFFeEIsaUJBQWlCO1FBQ2pCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBRTNCLFVBQVU7UUFDVixJQUFJLENBQUMsYUFBYSxF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aUJBQWlCO0lBRVQsMkJBQTJCO1FBQ2pDLE1BQU0sTUFBTSxHQUFHLElBQUksZ0NBQW9CLENBQUMsSUFBSSxFQUFFO1lBQzVDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNuQixZQUFZLEVBQUUsc0JBQXNCO1lBQ3BDLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSx3Q0FBd0MsQ0FBQztZQUNyRSxZQUFZLEVBQUU7Z0JBQ1osT0FBTyxFQUFFLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRTtnQkFDNUIsR0FBRyxFQUFFLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRTthQUMxQjtTQUNGLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxjQUFjLENBQ25CLElBQUkseUJBQWUsQ0FBQztZQUNsQixNQUFNLEVBQUUsZ0JBQU0sQ0FBQyxLQUFLO1lBQ3BCLE9BQU8sRUFBRSxDQUFDLGdCQUFnQixFQUFFLGtCQUFrQixDQUFDO1lBQy9DLFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQztTQUNqQixDQUFDLENBQ0gsQ0FBQztRQUNGLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDMUQsQ0FBQztDQUNGO0FBMVJELDhEQTBSQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1xuICBCYXNlQ29uZmlnLFxuICBCYXNlU3RhY2ssXG4gIFNlcnZpY2VBY2NvdW50Um9sZSxcbiAgRExRLFxuICBTdGFuZGFyZFF1ZXVlLFxuICBCYWNrZ3JvdW5kVGFza3NRdWV1ZSxcbiAgZ3JhbnRGYW5pblB1Ymxpc2hpbmcsXG4gIEFwcGxpY2F0aW9uUmVwb3NpdG9yeSxcbiAgRHluYW1vVGFibGUsXG4gIFJlZGlzUmVwbGljYXRpb25Hcm91cCxcbiAgR2xvYmFsU1NNU3RyaW5nUGFyYW1ldGVyLFxuICBTZXJ2aWNlU1NNU3RyaW5nUGFyYW1ldGVyLFxuICBHbG9iYWxTZWNyZXRzLFxuICBOb2RlanNMYW1iZGFGdW5jdGlvbixcbn0gZnJvbSAnQGVtcG9ydGVsbGEvbGF5ZXIzY2RrJztcbmltcG9ydCB7IEFwcCB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IEF0dHJpYnV0ZVR5cGUsIEJpbGxpbmcsIENhcGFjaXR5IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCB7IElBbGFybUFjdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZHdhdGNoJztcbmltcG9ydCB7IEVmZmVjdCwgUG9saWN5U3RhdGVtZW50IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5cbmV4cG9ydCB0eXBlIEFsYXJtQWN0aW9uQ29uZmlnID0gQmFzZUNvbmZpZyAmIHtcbiAgYWxhcm1BY3Rpb25zOiBJQWxhcm1BY3Rpb25bXTtcbn07XG5cbmV4cG9ydCBjbGFzcyBUYWNvUHJvY2Vzc29yU2VydmljZVN0YWNrIGV4dGVuZHMgQmFzZVN0YWNrIHtcbiAgcHJpdmF0ZSByZWFkb25seSBzZXJ2aWNlQWNjb3VudDogU2VydmljZUFjY291bnRSb2xlO1xuICBwcml2YXRlIHJlYWRvbmx5IGVjcjogQXBwbGljYXRpb25SZXBvc2l0b3J5O1xuICBwcml2YXRlIHJlYWRvbmx5IGRscTogRExRO1xuICBwcml2YXRlIHJlYWRvbmx5IGNvbmZpZzogQWxhcm1BY3Rpb25Db25maWc7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IEFwcCwgY29uZmlnOiBBbGFybUFjdGlvbkNvbmZpZykge1xuICAgIHN1cGVyKHNjb3BlLCBjb25maWcpO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgIHRoaXMuc2VydmljZUFjY291bnQgPSB0aGlzLmNyZWF0ZVNlcnZpY2VBY2NvdW50KCk7XG4gICAgdGhpcy5kbHEgPSB0aGlzLmNyZWF0ZURMUSgpO1xuICAgIHRoaXMuZWNyID0gdGhpcy5jcmVhdGVFQ1IoKTtcblxuICAgIC8vIFNRUyBxdWV1ZXNcbiAgICB0aGlzLmNyZWF0ZU9yZGVyUGxhY2VkUXVldWUoKTtcbiAgICB0aGlzLmNyZWF0ZVJlY2lwZVVwZGF0ZWRRdWV1ZSgpO1xuICAgIHRoaXMuY3JlYXRlVGFjb1Njb3JlQ2hhbmdlZFF1ZXVlKCk7XG4gICAgdGhpcy5jcmVhdGVTYXVjZVN0YXR1c1VwZGF0ZWRRdWV1ZSgpO1xuICAgIHRoaXMuY3JlYXRlQnVycml0b1N1Ym1pdHRlZFF1ZXVlKCk7XG4gICAgdGhpcy5zdWJzY3JpYmVUb0ZhbmluUXVldWVzKCk7XG5cbiAgICAvLyBCYWNrZ3JvdW5kIHRhc2tzIHF1ZXVlXG4gICAgdGhpcy5jcmVhdGVTY29yZVJlY2FsY3VsYXRpb25UYXNrKCk7XG5cbiAgICAvLyBEeW5hbW9EQiB0YWJsZVxuICAgIHRoaXMuY3JlYXRlT3JkZXJzVGFibGUoKTtcblxuICAgIC8vIFJlZGlzIGNhY2hlXG4gICAgdGhpcy5jcmVhdGVPcmRlckNhY2hlKCk7XG5cbiAgICAvLyBTU00gcGFyYW1ldGVyc1xuICAgIHRoaXMuY3JlYXRlU1NNUGFyYW1ldGVycygpO1xuXG4gICAgLy8gU2VjcmV0c1xuICAgIHRoaXMuY3JlYXRlU2VjcmV0cygpO1xuXG4gICAgLy8gTGFtYmRhIGZvciBhc3luYyBwcm9jZXNzaW5nXG4gICAgdGhpcy5jcmVhdGVTY29yZUNhbGN1bGF0b3JMYW1iZGEoKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlU2VydmljZUFjY291bnQoKSB7XG4gICAgcmV0dXJuIG5ldyBTZXJ2aWNlQWNjb3VudFJvbGUodGhpcywge1xuICAgICAgY29uZmlnOiB0aGlzLmNvbmZpZyxcbiAgICAgIG9pZGNQcm92aWRlckFybnM6IHtcbiAgICAgICAgZGV2OiAnYXJuOmF3czppYW06OjEyMzQ1Njc4OTAxMjpvaWRjLXByb3ZpZGVyL29pZGMuZWtzLnVzLWVhc3QtMS5hbWF6b25hd3MuY29tL2lkL0ZBS0VfREVWX0NMVVNURVInLFxuICAgICAgICBzdGc6ICdhcm46YXdzOmlhbTo6MTIzNDU2Nzg5MDEyOm9pZGMtcHJvdmlkZXIvb2lkYy5la3MudXMtZWFzdC0xLmFtYXpvbmF3cy5jb20vaWQvRkFLRV9TVEdfQ0xVU1RFUicsXG4gICAgICAgIHByZDogJ2Fybjphd3M6aWFtOjoxMjM0NTY3ODkwMTI6b2lkYy1wcm92aWRlci9vaWRjLmVrcy51cy1lYXN0LTEuYW1hem9uYXdzLmNvbS9pZC9GQUtFX1BSRF9DTFVTVEVSJyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUVDUigpIHtcbiAgICByZXR1cm4gQXBwbGljYXRpb25SZXBvc2l0b3J5LmNyZWF0ZSh0aGlzLCB7XG4gICAgICBjb25maWc6IHRoaXMuY29uZmlnLFxuICAgICAgcmVwb3NpdG9yeU5hbWU6ICdwbHRmLXRhY28tcHJvY2Vzc29yLXNlcnZpY2UnLFxuICAgIH0pIGFzIEFwcGxpY2F0aW9uUmVwb3NpdG9yeTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlRExRKCk6IERMUSB7XG4gICAgY29uc3QgZGxxID0gbmV3IERMUSh0aGlzLCB0aGlzLmNvbmZpZyk7XG4gICAgZGxxLnNldENsb3VkV2F0Y2hBbGFybXMoLi4udGhpcy5jb25maWcuYWxhcm1BY3Rpb25zKTtcbiAgICByZXR1cm4gZGxxO1xuICB9XG5cbiAgLy8gLS0tIFNRUyBTdGFuZGFyZCBRdWV1ZXMgLS0tXG5cbiAgcHJpdmF0ZSBjcmVhdGVPcmRlclBsYWNlZFF1ZXVlKCkge1xuICAgIGNvbnN0IHF1ZXVlID0gbmV3IFN0YW5kYXJkUXVldWUodGhpcywge1xuICAgICAgY29uZmlnOiB0aGlzLmNvbmZpZyxcbiAgICAgIGV2ZW50TmFtZTogJ09yZGVyUGxhY2VkJyxcbiAgICAgIGRscTogdGhpcy5kbHEuZ2V0RGxxKCksXG4gICAgfSk7XG4gICAgcXVldWUuc3Vic2NyaWJlRnJvbVNOU1RvcGljSW1wb3J0KFxuICAgICAgYG91dHB1dC0ke3RoaXMuY29uZmlnLnN0YWNrRW52fS1PcmRlclBsYWNlZC1hcm5gLFxuICAgICk7XG4gICAgcXVldWUuc2V0Q2xvdWRXYXRjaEFsYXJtcyguLi50aGlzLmNvbmZpZy5hbGFybUFjdGlvbnMpO1xuICAgIHF1ZXVlLmdyYW50UG9saWNpZXModGhpcy5zZXJ2aWNlQWNjb3VudC5nZXRSb2xlKCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVTYXVjZVN0YXR1c1VwZGF0ZWRRdWV1ZSgpIHtcbiAgICBjb25zdCBxdWV1ZSA9IG5ldyBTdGFuZGFyZFF1ZXVlKHRoaXMsIHtcbiAgICAgIGNvbmZpZzogdGhpcy5jb25maWcsXG4gICAgICBldmVudE5hbWU6ICdTYXVjZVN0YXR1c1VwZGF0ZWQnLFxuICAgICAgZGxxOiB0aGlzLmRscS5nZXREbHEoKSxcbiAgICB9KTtcbiAgICBxdWV1ZS5zdWJzY3JpYmVGcm9tU05TVG9waWNJbXBvcnQoXG4gICAgICBgb3V0cHV0LSR7dGhpcy5jb25maWcuc3RhY2tFbnZ9LVNhdWNlU3RhdHVzVXBkYXRlZC1hcm5gLFxuICAgICk7XG4gICAgcXVldWUuc2V0Q2xvdWRXYXRjaEFsYXJtcyguLi50aGlzLmNvbmZpZy5hbGFybUFjdGlvbnMpO1xuICAgIHF1ZXVlLmdyYW50UG9saWNpZXModGhpcy5zZXJ2aWNlQWNjb3VudC5nZXRSb2xlKCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVCdXJyaXRvU3VibWl0dGVkUXVldWUoKSB7XG4gICAgY29uc3QgQUNDT1VOVCA9XG4gICAgICB0aGlzLmNvbmZpZy5zdGFja0VudiA9PSAncHJkJyA/ICcxMTExMTExMTExMTEnIDogJzIyMjIyMjIyMjIyMic7XG5cbiAgICBjb25zdCBxdWV1ZSA9IG5ldyBTdGFuZGFyZFF1ZXVlKHRoaXMsIHtcbiAgICAgIGNvbmZpZzogdGhpcy5jb25maWcsXG4gICAgICBldmVudE5hbWU6ICdCdXJyaXRvU3VibWl0dGVkJyxcbiAgICAgIGRscTogdGhpcy5kbHEuZ2V0RGxxKCksXG4gICAgfSk7XG4gICAgcXVldWUuc3Vic2NyaWJlRnJvbVNOU1RvcGljQXJuKFxuICAgICAgYGFybjphd3M6c25zOnVzLWVhc3QtMToke0FDQ09VTlR9OiR7dGhpcy5jb25maWcuc3RhY2tFbnZ9LUJ1cnJpdG9TdWJtaXR0ZWRgLFxuICAgICk7XG4gICAgcXVldWUuc2V0Q2xvdWRXYXRjaEFsYXJtcyguLi50aGlzLmNvbmZpZy5hbGFybUFjdGlvbnMpO1xuICAgIHF1ZXVlLmdyYW50UG9saWNpZXModGhpcy5zZXJ2aWNlQWNjb3VudC5nZXRSb2xlKCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVSZWNpcGVVcGRhdGVkUXVldWUoKSB7XG4gICAgY29uc3QgcXVldWUgPSBuZXcgU3RhbmRhcmRRdWV1ZSh0aGlzLCB7XG4gICAgICBjb25maWc6IHRoaXMuY29uZmlnLFxuICAgICAgZXZlbnROYW1lOiAnUmVjaXBlVXBkYXRlZCcsXG4gICAgICBkbHE6IHRoaXMuZGxxLmdldERscSgpLFxuICAgIH0pO1xuICAgIHF1ZXVlLnN1YnNjcmliZUZyb21TTlNUb3BpY0ltcG9ydChcbiAgICAgIGBvdXRwdXQtJHt0aGlzLmNvbmZpZy5zdGFja0Vudn0tUmVjaXBlVXBkYXRlZC1hcm5gLFxuICAgICk7XG4gICAgcXVldWUuc2V0Q2xvdWRXYXRjaEFsYXJtcyguLi50aGlzLmNvbmZpZy5hbGFybUFjdGlvbnMpO1xuICAgIHF1ZXVlLmdyYW50UG9saWNpZXModGhpcy5zZXJ2aWNlQWNjb3VudC5nZXRSb2xlKCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVUYWNvU2NvcmVDaGFuZ2VkUXVldWUoKSB7XG4gICAgY29uc3QgcXVldWUgPSBuZXcgU3RhbmRhcmRRdWV1ZSh0aGlzLCB7XG4gICAgICBjb25maWc6IHRoaXMuY29uZmlnLFxuICAgICAgZXZlbnROYW1lOiAnVGFjb1Njb3JlQ2hhbmdlZCcsXG4gICAgICBkbHE6IHRoaXMuZGxxLmdldERscSgpLFxuICAgIH0pO1xuICAgIHF1ZXVlLnN1YnNjcmliZUZyb21TTlNUb3BpY0ltcG9ydChcbiAgICAgIGBvdXRwdXQtJHt0aGlzLmNvbmZpZy5zdGFja0Vudn0tVGFjb1Njb3JlQ2hhbmdlZC1hcm5gLFxuICAgICk7XG4gICAgcXVldWUuc2V0Q2xvdWRXYXRjaEFsYXJtcyguLi50aGlzLmNvbmZpZy5hbGFybUFjdGlvbnMpO1xuICAgIHF1ZXVlLmdyYW50UG9saWNpZXModGhpcy5zZXJ2aWNlQWNjb3VudC5nZXRSb2xlKCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBzdWJzY3JpYmVUb0ZhbmluUXVldWVzKCkge1xuICAgIGdyYW50RmFuaW5QdWJsaXNoaW5nKHtcbiAgICAgIHJvbGU6IHRoaXMuc2VydmljZUFjY291bnQuZ2V0Um9sZSgpLFxuICAgICAgZmFuaW5RdWV1ZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGV2ZW50TmFtZTogJ1NlbmROb3RpZmljYXRpb24nLFxuICAgICAgICAgIHNlcnZpY2VOYW1lOiAnc2Fsc2Etbm90aWZpZXInLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIHJlZ2lvbjogdGhpcy5jb25maWcuZW52LnJlZ2lvbiA/PyAnJyxcbiAgICAgIGFjY291bnRJZDogdGhpcy5jb25maWcuZW52LmFjY291bnQgPz8gJycsXG4gICAgICBlbnY6IHRoaXMuY29uZmlnLnN0YWNrRW52LFxuICAgIH0pO1xuICB9XG5cbiAgLy8gLS0tIEJhY2tncm91bmQgVGFza3MgUXVldWUgLS0tXG5cbiAgcHJpdmF0ZSBjcmVhdGVTY29yZVJlY2FsY3VsYXRpb25UYXNrKCkge1xuICAgIGNvbnN0IHF1ZXVlID0gbmV3IEJhY2tncm91bmRUYXNrc1F1ZXVlKHRoaXMsIHtcbiAgICAgIGNvbmZpZzogdGhpcy5jb25maWcsXG4gICAgICBldmVudE5hbWU6ICdSZWNhbGN1bGF0ZVRhY29TY29yZScsXG4gICAgICBkbHE6IHRoaXMuZGxxLmdldERscSgpLFxuICAgIH0pO1xuICAgIHF1ZXVlLnNldENsb3VkV2F0Y2hBbGFybXMoLi4udGhpcy5jb25maWcuYWxhcm1BY3Rpb25zKTtcbiAgICBxdWV1ZS5ncmFudFBvbGljaWVzKHRoaXMuc2VydmljZUFjY291bnQuZ2V0Um9sZSgpKTtcbiAgfVxuXG4gIC8vIC0tLSBEeW5hbW9EQiAtLS1cblxuICBwcml2YXRlIGNyZWF0ZU9yZGVyc1RhYmxlKCkge1xuICAgIGNvbnN0IHRhYmxlID0gbmV3IER5bmFtb1RhYmxlKHRoaXMsIHtcbiAgICAgIGNvbmZpZzogdGhpcy5jb25maWcsXG4gICAgICB0YWJsZU5hbWU6ICdPcmRlcnMnLFxuICAgICAgZHluYW1vUHJvcHM6IHtcbiAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnb3JkZXJJZCcsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICAgICAgc29ydEtleTogeyBuYW1lOiAnY3JlYXRlZEF0JywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBkeW5hbW9Db25maWc6IHtcbiAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgIGJpbGxpbmc6IEJpbGxpbmcucHJvdmlzaW9uZWQoe1xuICAgICAgICAgICAgcmVhZENhcGFjaXR5OiBDYXBhY2l0eS5hdXRvc2NhbGVkKHtcbiAgICAgICAgICAgICAgbWluQ2FwYWNpdHk6IDUsXG4gICAgICAgICAgICAgIG1heENhcGFjaXR5OiA1MCxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgd3JpdGVDYXBhY2l0eTogQ2FwYWNpdHkuYXV0b3NjYWxlZCh7XG4gICAgICAgICAgICAgIG1pbkNhcGFjaXR5OiA1LFxuICAgICAgICAgICAgICBtYXhDYXBhY2l0eTogNTAsXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBhbGFybVJlYWRUaHJlc2hvbGQ6IDQwLFxuICAgICAgICAgIGFsYXJtV3JpdGVUaHJlc2hvbGQ6IDQwLFxuICAgICAgICB9LFxuICAgICAgICBwcmQ6IHtcbiAgICAgICAgICBiaWxsaW5nOiBCaWxsaW5nLnByb3Zpc2lvbmVkKHtcbiAgICAgICAgICAgIHJlYWRDYXBhY2l0eTogQ2FwYWNpdHkuYXV0b3NjYWxlZCh7XG4gICAgICAgICAgICAgIG1pbkNhcGFjaXR5OiAyMCxcbiAgICAgICAgICAgICAgbWF4Q2FwYWNpdHk6IDIwMCxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgd3JpdGVDYXBhY2l0eTogQ2FwYWNpdHkuYXV0b3NjYWxlZCh7XG4gICAgICAgICAgICAgIG1pbkNhcGFjaXR5OiAyMCxcbiAgICAgICAgICAgICAgbWF4Q2FwYWNpdHk6IDIwMCxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIGFsYXJtUmVhZFRocmVzaG9sZDogNzAsXG4gICAgICAgICAgYWxhcm1Xcml0ZVRocmVzaG9sZDogNzAsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuICAgIHRhYmxlLnNldENsb3VkV2F0Y2hBbGFybXMoLi4udGhpcy5jb25maWcuYWxhcm1BY3Rpb25zKTtcbiAgICB0YWJsZS5ncmFudFBvbGljaWVzKHRoaXMuc2VydmljZUFjY291bnQuZ2V0Um9sZSgpKTtcbiAgICB0YWJsZS5vdXRwdXRBcm4oKTtcbiAgfVxuXG4gIC8vIC0tLSBSZWRpcyAtLS1cblxuICBwcml2YXRlIGNyZWF0ZU9yZGVyQ2FjaGUoKSB7XG4gICAgbmV3IFJlZGlzUmVwbGljYXRpb25Hcm91cCh0aGlzLCB7XG4gICAgICBjb25maWc6IHRoaXMuY29uZmlnLFxuICAgICAgZWxhc3RpY2FjaGVQcm9wczoge1xuICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgc3VibmV0czogW3sgaWQ6ICdzdWJuZXQtZmFrZS0xYScgfSwgeyBpZDogJ3N1Ym5ldC1mYWtlLTFiJyB9XSxcbiAgICAgICAgICByZXBsaWNhdGlvbkdyb3VwRGVzY3JpcHRpb246ICdUYWNvIFByb2Nlc3NvciBvcmRlciBjYWNoZScsXG4gICAgICAgICAgc2VjdXJpdHlHcm91cElkczogWydzZy1mYWtlLXJlZGlzLTAwMSddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIGVsYXN0aWNhY2hlQ29uZmlnOiB7XG4gICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICBjbHVzdGVyTW9kZTogJ2VuYWJsZWQnLFxuICAgICAgICAgIG11bHRpQXpFbmFibGVkOiBmYWxzZSxcbiAgICAgICAgfSxcbiAgICAgICAgcHJkOiB7XG4gICAgICAgICAgY2x1c3Rlck1vZGU6ICdlbmFibGVkJyxcbiAgICAgICAgICBtdWx0aUF6RW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICAvLyAtLS0gU1NNIFBhcmFtZXRlcnMgLS0tXG5cbiAgcHJpdmF0ZSBjcmVhdGVTU01QYXJhbWV0ZXJzKCkge1xuICAgIC8vIEdsb2JhbCBwYXJhbWV0ZXIg4oCUIHNoYXJlZCBhY3Jvc3MgYWxsIHNlcnZpY2VzXG4gICAgbmV3IEdsb2JhbFNTTVN0cmluZ1BhcmFtZXRlcih0aGlzLCB7XG4gICAgICBjb25maWc6IHRoaXMuY29uZmlnLFxuICAgICAgcGFyYW1ldGVyTmFtZTogJ3RhY28tYXBpLWJhc2UtdXJsJyxcbiAgICAgIHBhcmFtZXRlclZhbHVlOiAnaHR0cHM6Ly9hcGkudGFjby1zaG9wLmV4YW1wbGUuY29tJyxcbiAgICB9KTtcblxuICAgIC8vIFNlcnZpY2UtbGV2ZWwgcGFyYW1ldGVyIOKAlCBzY29wZWQgdG8gdGhpcyBzZXJ2aWNlXG4gICAgbmV3IFNlcnZpY2VTU01TdHJpbmdQYXJhbWV0ZXIodGhpcywge1xuICAgICAgY29uZmlnOiB0aGlzLmNvbmZpZyxcbiAgICAgIHBhcmFtZXRlck5hbWU6ICdtYXgtY29uY3VycmVudC1vcmRlcnMnLFxuICAgICAgcGFyYW1ldGVyVmFsdWU6ICcxMDAnLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gLS0tIFNlY3JldHMgLS0tXG5cbiAgcHJpdmF0ZSBjcmVhdGVTZWNyZXRzKCkge1xuICAgIG5ldyBHbG9iYWxTZWNyZXRzKHRoaXMsIHtcbiAgICAgIGNvbmZpZzogdGhpcy5jb25maWcsXG4gICAgICBwYXJhbWV0ZXJOYW1lOiAndGFjby1kYi1jcmVkZW50aWFscycsXG4gICAgfSk7XG4gIH1cblxuICAvLyAtLS0gTGFtYmRhIC0tLVxuXG4gIHByaXZhdGUgY3JlYXRlU2NvcmVDYWxjdWxhdG9yTGFtYmRhKCkge1xuICAgIGNvbnN0IGxhbWJkYSA9IG5ldyBOb2RlanNMYW1iZGFGdW5jdGlvbih0aGlzLCB7XG4gICAgICBjb25maWc6IHRoaXMuY29uZmlnLFxuICAgICAgZnVuY3Rpb25OYW1lOiAnY2FsY3VsYXRlLXRhY28tc2NvcmUnLFxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9oYW5kbGVycy9jYWxjdWxhdGUtdGFjby1zY29yZS50cycpLFxuICAgICAgbGFtYmRhQ29uZmlnOiB7XG4gICAgICAgIGRlZmF1bHQ6IHsgbWVtb3J5U2l6ZTogNTEyIH0sXG4gICAgICAgIHByZDogeyBtZW1vcnlTaXplOiAxMDI0IH0sXG4gICAgICB9LFxuICAgIH0pO1xuICAgIGxhbWJkYS5hZGRQZXJtaXNzaW9ucyhcbiAgICAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogWydkeW5hbW9kYjpRdWVyeScsICdkeW5hbW9kYjpHZXRJdGVtJ10sXG4gICAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgICB9KSxcbiAgICApO1xuICAgIGxhbWJkYS5zZXRDbG91ZFdhdGNoQWxhcm1zKC4uLnRoaXMuY29uZmlnLmFsYXJtQWN0aW9ucyk7XG4gIH1cbn1cbiJdfQ==