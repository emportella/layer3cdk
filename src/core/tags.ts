/**
 * Represents the tags used in Layer3CDK applications.
 */
import { StackEnv, Domain } from './constants';

/**
 * Represents the Layer3CDK tags.
 */
export type ResourceTags = {
  /**
   * Represents the department ownership tag.
   */
  'tag:ownership:department': Departments;
  /**
   * Represents the organization domain ownership tag.
   */
  'tag:ownership:orgDomain'?: Domain;
  /**
   * Represents the team ownership tag.
   */
  'tag:ownership:team': string;
  /**
   * Represents the application technology tag.
   */
  'tag:tech:application'?: string;
  /**
   * Represents the repository technology tag.
   */
  'tag:tech:repository'?: string;
  /**
   * Represents the managed by tag.
   */
  'tag:tech:managedBy'?: ManagedBy;
  /**
   * Represents the environment tag.
   */
  'tag:env': StackEnv;
  /**
   * Represents the tag schema version.
   * Implements
   */
  'tag:tagSchemaVersion': '0.1';
};

/**
 * Represents the managed by options.
 */
export type ManagedBy = 'cdk' | 'terraform' | 'dashboard';

/**
 * Represents the department options.
 */
export type Departments =
  | 'productDevelopment'
  | 'trainhub'
  | 'security'
  | 'infrastructure'
  | 'applyproof'
  | 'solutions'
  | 'support'
  | 'sales'
  | 'marketing'
  | 'peopleCulture'
  | 'operations'
  | 'finance'
  | 'facilitiesManagement';
