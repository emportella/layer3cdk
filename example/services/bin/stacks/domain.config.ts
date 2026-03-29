import { ResourceTags } from 'layer3cdk';

export const TACO_SHOP_DOMAIN_DEFAULT_TAGS: ResourceTags = {
  'TagSchemaVersion': '0.1',
  'Ownership:Department': 'pltf',
  'Ownership:Organization': 'Layer3CDK',
  'Ownership:Team': 'Layer3',
  'Eng:Application': 'tacoShopDomain',
  'Eng:Repository': 'Layer3/taco-shop-cdk',
};
