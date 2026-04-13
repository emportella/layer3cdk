import { ResourceTags } from '@emportella/layer3cdk';
import { TACO_SHOP_DOMAIN_DEFAULT_TAGS } from '../domain.config';

export const NACHO_AGENCY_NAME = 'nacho-agency';

export const NACHO_AGENCY_TAGS: ResourceTags = {
  ...TACO_SHOP_DOMAIN_DEFAULT_TAGS,
  'Eng:Application': NACHO_AGENCY_NAME,
};
