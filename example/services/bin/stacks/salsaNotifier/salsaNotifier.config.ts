import { ResourceTags } from '@emportella/layer3cdk';
import { TACO_SHOP_DOMAIN_DEFAULT_TAGS } from '../domain.config';

export const SALSA_NOTIFIER_NAME = 'salsa-notifier';

export const SALSA_NOTIFIER_TAGS: ResourceTags = {
  ...TACO_SHOP_DOMAIN_DEFAULT_TAGS,
  'Eng:Application': SALSA_NOTIFIER_NAME,
};
