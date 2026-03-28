import { BaseConfig } from '../core';

export const testconfig = new BaseConfig({
  department: 'pltf',
  env: { account: '123456789012', region: 'us-east-1' },
  stackName: 'pltf-banana-stack',
  tags: {
    TagSchemaVersion: '0.1',
    'Eng:Env': 'dev',
    'Ownership:Department': 'pltf',
    'Ownership:Organization': 'Layer3CDK',
    'Ownership:Team': 'Layer3',
    'Eng:Application': 'bananaLauncher',
    'Eng:Repository': 'banana-launcher-repo',
    'Eng:ManagedBy': 'cdk',
  },
  stackEnv: 'dev',
  serviceName: 'banana-launcher',
  description: 'My description',
});
