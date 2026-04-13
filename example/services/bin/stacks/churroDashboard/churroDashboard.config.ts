import { ResourceTags } from '@emportella/layer3cdk';
import { TACO_SHOP_DOMAIN_DEFAULT_TAGS } from '../domain.config';

export const CHURRO_DASHBOARD_NAME = 'churro-dashboard';

export const CHURRO_DASHBOARD_TAGS: ResourceTags = {
  ...TACO_SHOP_DOMAIN_DEFAULT_TAGS,
  'Eng:Application': CHURRO_DASHBOARD_NAME,
};
