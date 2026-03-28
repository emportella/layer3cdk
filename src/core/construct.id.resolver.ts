import { trimDashes } from '../util';
import { ResourceType } from './constants';

const MAX_CFN_ID_LENGTH = 256;

/**
 * Single source of truth for all CDK construct IDs, alarm IDs, and export names.
 * Ensures consistent, non-redundant naming across all modules.
 *
 * All modules pass a short **logical name** (e.g. `'OrderCreated'`, `'ProcessedEvents'`)
 * — never the full AWS resource name — and the resolver composes every derived identifier
 * from `stackName` + `resourceType` + `logicalName`.
 *
 * @example
 * ```typescript
 * const resolver = new ConstructIdResolver({
 *   stackName: 'dev-RpTasks',
 *   resourceType: 'dynamodb',
 *   resourceName: 'ProcessedEvents',
 * });
 * resolver.constructId;           // 'dev-RpTasks-dynamodb-ProcessedEvents'
 * resolver.alarmId('read-cap');   // 'dev-RpTasks-cw-alarm-ProcessedEvents-read-cap'
 * resolver.arnExportName();       // 'output-dev-RpTasks-ProcessedEvents-arn'
 * ```
 */
export class ConstructIdResolver {
  readonly stackName: string;
  readonly resourceType: ResourceType;
  readonly resourceName: string;

  constructor(props: {
    stackName: string;
    resourceType: ResourceType;
    resourceName: string;
  }) {
    const { stackName, resourceType, resourceName } = props;
    this.stackName = stackName;
    this.resourceType = resourceType;
    this.resourceName = trimDashes(resourceName);

    if (!this.resourceName || this.resourceName.trim().length === 0) {
      throw new Error(
        `ConstructIdResolver: resourceName cannot be empty (resourceType=${resourceType})`,
      );
    }
  }

  /** Primary construct ID: `<stackName>-<resourceType>-<resourceName>` */
  get constructId(): string {
    return this.validate(
      `${this.stackName}-${this.resourceType}-${this.resourceName}`,
    );
  }

  /**
   * Child/inner resource ID: `<stackName>-<childType>-<resourceName>[-<suffix>]`
   * Use when a construct creates nested CDK resources that need their own IDs.
   */
  childId(childType: ResourceType | string, childSuffix?: string): string {
    const suffix = childSuffix ? `-${trimDashes(childSuffix)}` : '';
    return this.validate(
      `${this.stackName}-${childType}-${this.resourceName}${suffix}`,
    );
  }

  /** Alarm construct ID: `<stackName>-cw-alarm-<resourceName>-<alarmType>` */
  alarmId(alarmType: string): string {
    return `${this.stackName}-cw-alarm-${this.resourceName}-${trimDashes(alarmType)}`;
  }

  /** ARN export name: `output-<stackName>-<resourceName>-arn` */
  arnExportName(): string {
    return `output-${this.stackName}-${this.resourceName}-arn`;
  }

  /** Generic export name: `output-<stackName>-<resourceName>-<paramType>` */
  outputExportName(paramType: string): string {
    return `output-${this.stackName}-${this.resourceName}-${paramType}`;
  }

  private validate(name: string): string {
    if (name.length > MAX_CFN_ID_LENGTH) {
      throw new Error(
        `ConstructIdResolver: name exceeds ${MAX_CFN_ID_LENGTH} characters (got ${name.length}): ${name}`,
      );
    }
    return name;
  }
}
