import { pascalCaseToKebabCase } from '../util';
import { BaseConfig } from '../core/base.config';

/**
 * Generates the S3 bucket name for a static site.
 * Bucket names must be globally unique, lowercase, and max 63 characters.
 * @returns e.g., `"dev-rpj-test-app-my-site-assets"`
 */
export const sss3BucketName = (
  siteName: string,
  config: BaseConfig,
): string => {
  const serviceName = pascalCaseToKebabCase(config.serviceName);
  return `${config.stackEnv}-${serviceName}-${siteName}-assets`.toLowerCase();
};

/**
 * Generates the CloudFront distribution comment/description.
 * @returns e.g., `"dev-rpj-test-app-my-site Distribution"`
 */
export const sss3DistributionComment = (
  siteName: string,
  config: BaseConfig,
): string => {
  const serviceName = pascalCaseToKebabCase(config.serviceName);
  return `${config.stackEnv}-${serviceName}-${siteName} Distribution`;
};
