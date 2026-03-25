import { kebabToPascalCase } from '../util';
import { BaseConfig } from '../core/base.config';

/**
 * Generates a DynamoDB table name based on the provided environment, service name, and table name.
 * @param tableName - The name of the table (PascalCaseTableName).
 * @param config - The BaseConfig object.
 * @returns The generated DynamoDB table name. For example, "dev-rptasks.ProcessedApplicationDomainEvents".
 */
export const dynamoTableName = (
  tableName: string,
  config: BaseConfig,
): string => {
  return `${config.stackEnv}-${kebabToPascalCase(config.serviceName)}-${kebabToPascalCase(tableName)}`;
};
