import { ResourceTags } from 'layer3cdk';
import { TACO_SHOP_DOMAIN_DEFAULT_TAGS } from '../domain.config';

export const ALARM_HUB_STACK_NAME = 'taco-alarm-hub';
export const ALARM_HUB_TAGS: ResourceTags = {
  ...TACO_SHOP_DOMAIN_DEFAULT_TAGS,
  'Eng:Application': ALARM_HUB_STACK_NAME,
};
