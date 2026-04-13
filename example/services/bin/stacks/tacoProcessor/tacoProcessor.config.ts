import { ResourceTags } from '@emportella/layer3cdk';
import { TACO_SHOP_DOMAIN_DEFAULT_TAGS } from '../domain.config';

export const TACO_PROCESSOR_NAME = 'taco-processor';

export const TACO_PROCESSOR_TAGS: ResourceTags = {
  ...TACO_SHOP_DOMAIN_DEFAULT_TAGS,
  'Eng:Application': TACO_PROCESSOR_NAME,
};
