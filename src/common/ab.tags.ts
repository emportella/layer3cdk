/**
 * Represents the tags used in ApplyBoard applications.
 */
import { ABEnvironment, Domain } from './ab.constant';

/**
 * Represents the ApplyBoard tags.
 */
export type ABTags = {
  /**
   * Represents the department ownership tag.
   */
  'ab:ownership:department': Departments;
  /**
   * Represents the organization domain ownership tag.
   */
  'ab:ownership:orgDomain'?: Domain;
  /**
   * Represents the team ownership tag.
   */
  'ab:ownership:team': string;
  /**
   * Represents the application technology tag.
   */
  'ab:tech:application'?: string;
  /**
   * Represents the repository technology tag.
   */
  'ab:tech:repository'?: string;
  /**
   * Represents the managed by tag.
   */
  'ab:tech:managedBy'?: ManagedBy;
  /**
   * Represents the environment tag.
   */
  'ab:env': ABEnvironment;
  /**
   * Represents the tag schema version.
   * Implements https://applyboard.atlassian.net/wiki/spaces/PA/pages/3014689587/ApplyBoard+Tag+Schema+Version+0.x
   */
  'ab:tagSchemaVersion': typeof tagSchemaVersion;
};

/**
 * Represents the tag schema version.
 */
const tagSchemaVersion = '0.1';

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
  | 'abSolutions'
  | 'support'
  | 'sales'
  | 'marketing'
  | 'peopleCulture'
  | 'operations'
  | 'finance'
  | 'facilitiesManagement';
