import { BaseConstructProps } from '../core/base.construct.props';
import { BaseEnvProps } from '../core/base.construct.env.props';
import { DynamoConfig, DynamoProps } from './dynamo.default.props';

/**
 * Props for {@link DynamoTable} construct.
 */
export interface DynamoTableProps extends BaseConstructProps {
  tableName: string;
  dynamoProps: BaseEnvProps<DynamoProps>;
  dynamoConfig?: BaseEnvProps<DynamoConfig>;
}
