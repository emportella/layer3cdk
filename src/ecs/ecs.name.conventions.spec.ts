import {
  ecsClusterName,
  ecsServiceName,
  ecsTaskDefinitionFamily,
  ecsLogGroupName,
} from './ecs.name.conventions';

describe('ECS Name Conventions', () => {
  describe('ecsClusterName', () => {
    it('should return the correct cluster name from kebab-case', () => {
      expect(
        ecsClusterName({ env: 'dev', serviceName: 'banana-launcher' }),
      ).toEqual('dev-BananaLauncher-Cluster');
    });

    it('should return the correct cluster name from PascalCase', () => {
      expect(
        ecsClusterName({ env: 'prd', serviceName: 'BananaLauncher' }),
      ).toEqual('prd-BananaLauncher-Cluster');
    });
  });

  describe('ecsServiceName', () => {
    it('should return the correct service name', () => {
      expect(
        ecsServiceName({
          env: 'dev',
          serviceName: 'banana-launcher',
          name: 'api-gateway',
        }),
      ).toEqual('dev-BananaLauncher-ApiGateway');
    });
  });

  describe('ecsTaskDefinitionFamily', () => {
    it('should return the correct task definition family', () => {
      expect(
        ecsTaskDefinitionFamily({
          env: 'dev',
          serviceName: 'banana-launcher',
          name: 'worker',
        }),
      ).toEqual('dev-BananaLauncher-Worker');
    });
  });

  describe('ecsLogGroupName', () => {
    it('should return the correct log group name', () => {
      expect(
        ecsLogGroupName({
          env: 'dev',
          serviceName: 'banana-launcher',
          name: 'api-gateway',
        }),
      ).toEqual('/ecs/dev-BananaLauncher-ApiGateway');
    });
  });
});
