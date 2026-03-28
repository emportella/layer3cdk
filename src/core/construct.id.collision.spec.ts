import { App, Stack } from 'aws-cdk-lib';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { IConstruct } from 'constructs';
import { BaseConfig } from './base.config';
import {
  DLQ,
  DLQFifo,
  EDAStandardQueue,
  EDAStandardQueueFifo,
  EDABackgroundTasksQueue,
  EDABackgroundTasksQueueFifo,
  EDAFaninQueue,
  EDAFaninQueueFifo,
} from '../sqs';
import { EDASns, EDASnsFifo } from '../sns';
import { DynamoTable } from '../dynamo';
import { ApplicationRepository } from '../ecr';
import {
  GlobalSSMStringParameter,
  DepartmentSSMStringParameter,
  ServiceSSMStringParameter,
} from '../ssm';
import { GlobalSecrets } from '../secrets';
import { SSS3 } from '../static-site-s3';
import { AttributeType } from 'aws-cdk-lib/aws-dynamodb';

/**
 * Collects all direct children IDs at each scope level to detect sibling collisions.
 * Returns array of `{ scope, id }` for duplicated siblings.
 */
function findSiblingCollisions(
  construct: IConstruct,
  scopePath = 'root',
): Array<{ scope: string; id: string; count: number }> {
  const collisions: Array<{ scope: string; id: string; count: number }> = [];
  const childIds = new Map<string, number>();

  for (const child of construct.node.children) {
    const count = (childIds.get(child.node.id) || 0) + 1;
    childIds.set(child.node.id, count);
  }

  for (const [id, count] of childIds) {
    if (count > 1) {
      collisions.push({ scope: scopePath, id, count });
    }
  }

  // Recurse
  for (const child of construct.node.children) {
    const childPath = `${scopePath}/${child.node.id}`;
    collisions.push(...findSiblingCollisions(child, childPath));
  }

  return collisions;
}

describe('Construct ID Collision Detection', () => {
  const config = new BaseConfig({
    department: 'pltf',
    env: { account: '123456789012', region: 'us-east-1' },
    stackName: 'dev-BananaLauncher',
    tags: {
      TagSchemaVersion: '0.1',
      'Eng:Env': 'dev',
      'Ownership:Department': 'pltf',
      'Ownership:Organization': 'Layer3CDK',
      'Ownership:Team': 'Layer3',
      'Eng:Application': 'bananaLauncher',
      'Eng:Repository': 'banana-launcher-repo',
      'Eng:ManagedBy': 'cdk',
    },
    stackEnv: 'dev',
    serviceName: 'banana-launcher',
    description: 'Collision test stack',
  });

  it('should have no sibling ID collisions when creating all resource types in one stack', () => {
    const app = new App();
    const stack = new Stack(app, 'CollisionTestStack');

    // --- DLQs ---
    const dlq = new DLQ(stack, config);
    const dlqFifo = new DLQFifo(stack, { config });

    // --- SQS Standard Queues ---
    new EDAStandardQueue(stack, {
      config,
      eventName: 'OrderCreated',
      dlq: dlq.getDlq(),
    });
    new EDAStandardQueue(stack, {
      config,
      eventName: 'OrderUpdated',
      dlq: dlq.getDlq(),
    });
    new EDAStandardQueueFifo(stack, {
      config,
      eventName: 'OrderCreated',
      dlq: dlqFifo.getDlq(),
    });

    // --- SQS Background Tasks ---
    new EDABackgroundTasksQueue(stack, {
      config,
      eventName: 'ProcessPayment',
      dlq: dlq.getDlq(),
    });
    new EDABackgroundTasksQueueFifo(stack, {
      config,
      eventName: 'ProcessPayment',
      dlq: dlqFifo.getDlq(),
    });

    // --- SQS Fan-in ---
    new EDAFaninQueue(stack, {
      config,
      eventName: 'AggregateOrders',
      dlq: dlq.getDlq(),
    });
    new EDAFaninQueueFifo(stack, {
      config,
      eventName: 'AggregateOrders',
      dlq: dlqFifo.getDlq(),
    });

    // --- SNS Topics ---
    new EDASns(stack, { config, eventName: 'OrderCreated' });
    new EDASns(stack, { config, eventName: 'OrderUpdated' });
    new EDASnsFifo(stack, { config, eventName: 'OrderCreated' });

    // --- DynamoDB Tables ---
    new DynamoTable(stack, {
      config,
      tableName: 'Orders',
      dynamoProps: {
        default: {
          partitionKey: { name: 'pk', type: AttributeType.STRING },
        },
      },
    });
    new DynamoTable(stack, {
      config,
      tableName: 'Products',
      dynamoProps: {
        default: {
          partitionKey: { name: 'pk', type: AttributeType.STRING },
        },
      },
    });

    // --- ECR ---
    ApplicationRepository.create(stack, {
      repositoryName: 'my-api',
      config,
    });
    ApplicationRepository.create(stack, {
      repositoryName: 'my-worker',
      config,
    });

    // --- SSM Parameters ---
    new GlobalSSMStringParameter(stack, {
      config,
      parameterName: 'api-key',
      parameterValue: 'test-value',
    });
    new DepartmentSSMStringParameter(stack, {
      config,
      parameterName: 'db-host',
      parameterValue: 'localhost',
    });
    new ServiceSSMStringParameter(stack, {
      config,
      parameterName: 'secret-token',
      parameterValue: 'token123',
    });

    // --- Secrets ---
    new GlobalSecrets(stack, { config, parameterName: 'db-password' });
    new GlobalSecrets(stack, { config, parameterName: 'api-secret' });

    // --- Static Site S3 ---
    const hostedZone = HostedZone.fromHostedZoneAttributes(stack, 'TestZone', {
      hostedZoneId: 'Z1234567890',
      zoneName: 'example.com',
    });
    new SSS3(stack, {
      config,
      siteName: 'admin-portal',
      domainName: 'admin.example.com',
      hostedZone,
    });

    // --- Detect collisions ---
    const collisions = findSiblingCollisions(stack);
    if (collisions.length > 0) {
      const details = collisions
        .map((c) => `  scope: ${c.scope}, id: "${c.id}" (x${c.count})`)
        .join('\n');
      fail(`Found sibling ID collisions:\n${details}`);
    }
  });

  it('should produce unique construct IDs for same eventName across different queue types', () => {
    const app = new App();
    const stack = new Stack(app, 'QueueTypeCollisionStack');

    const dlq = new DLQ(stack, config);

    // Same eventName, different queue types — must not collide
    const stQueue = new EDAStandardQueue(stack, {
      config,
      eventName: 'OrderCreated',
      dlq: dlq.getDlq(),
    });
    const taskQueue = new EDABackgroundTasksQueue(stack, {
      config,
      eventName: 'OrderCreated',
      dlq: dlq.getDlq(),
    });
    const faninQueue = new EDAFaninQueue(stack, {
      config,
      eventName: 'OrderCreated',
      dlq: dlq.getDlq(),
    });

    // All three should have unique node IDs
    const ids = [stQueue.node.id, taskQueue.node.id, faninQueue.node.id];
    expect(new Set(ids).size).toBe(3);
    expect(ids[0]).toContain('st-');
    expect(ids[1]).toContain('task-');
    expect(ids[2]).toContain('fanin-');
  });

  it('should produce unique alarm IDs for different resources', () => {
    const app = new App();
    const stack = new Stack(app, 'AlarmCollisionStack');

    const dlq = new DLQ(stack, config);

    const queue1 = new EDAStandardQueue(stack, {
      config,
      eventName: 'EventA',
      dlq: dlq.getDlq(),
    });
    const queue2 = new EDAStandardQueue(stack, {
      config,
      eventName: 'EventB',
      dlq: dlq.getDlq(),
    });

    // Alarm IDs are derived from resourceName, so different events = different alarms
    expect(queue1.resolver.alarmId('old-messages')).not.toEqual(
      queue2.resolver.alarmId('old-messages'),
    );
    expect(queue1.resolver.alarmId('old-messages')).toEqual(
      'dev-BananaLauncher-cw-alarm-st-EventA-old-messages',
    );
    expect(queue2.resolver.alarmId('old-messages')).toEqual(
      'dev-BananaLauncher-cw-alarm-st-EventB-old-messages',
    );
  });

  it('should produce unique export names across all resource types', () => {
    const app = new App();
    const stack = new Stack(app, 'ExportCollisionStack');

    const dlq = new DLQ(stack, config);
    const queue = new EDAStandardQueue(stack, {
      config,
      eventName: 'OrderCreated',
      dlq: dlq.getDlq(),
    });
    const topic = new EDASns(stack, { config, eventName: 'OrderCreated' });

    // Even though eventName is the same, SQS has queueType prefix
    expect(queue.resolver.arnExportName()).not.toEqual(
      topic.resolver.arnExportName(),
    );
    expect(queue.resolver.arnExportName()).toEqual(
      'output-dev-BananaLauncher-st-OrderCreated-arn',
    );
    expect(topic.resolver.arnExportName()).toEqual(
      'output-dev-BananaLauncher-OrderCreated-arn',
    );
  });

  it('should not repeat env or service in any construct ID', () => {
    const app = new App();
    const stack = new Stack(app, 'NoRedundancyStack');

    const dlq = new DLQ(stack, config);
    const queue = new EDAStandardQueue(stack, {
      config,
      eventName: 'OrderCreated',
      dlq: dlq.getDlq(),
    });
    const topic = new EDASns(stack, { config, eventName: 'OrderCreated' });
    const table = new DynamoTable(stack, {
      config,
      tableName: 'Orders',
      dynamoProps: {
        default: {
          partitionKey: { name: 'pk', type: AttributeType.STRING },
        },
      },
    });

    // Collect all L3 construct IDs
    const constructIds = [
      queue.node.id,
      topic.node.id,
      table.node.id,
      dlq.node.id,
    ];

    for (const id of constructIds) {
      // env 'dev' should appear at most once (in stackName prefix)
      const devMatches = id.match(/dev/g) || [];
      expect(devMatches.length).toBeLessThanOrEqual(1);
    }
  });
});
