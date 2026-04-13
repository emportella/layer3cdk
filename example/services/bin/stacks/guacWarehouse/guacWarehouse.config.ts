import { ResourceTags } from '@emportella/layer3cdk';
import { TACO_SHOP_DOMAIN_DEFAULT_TAGS } from '../domain.config';

export const GUAC_WAREHOUSE_NAME = 'guac-warehouse';

export const GUAC_WAREHOUSE_TAGS: ResourceTags = {
  ...TACO_SHOP_DOMAIN_DEFAULT_TAGS,
  'Eng:Application': GUAC_WAREHOUSE_NAME,
};
