import { lambdaFunctionName } from './lambda.name.conventions';

describe('Lambda Name Conventions', () => {
  describe('lambdaFunctionName', () => {
    it('should return the correct function name when service comes kebab-cased', () => {
      expect(
        lambdaFunctionName({
          env: 'dev',
          serviceName: 'banana-launcher',
          functionName: 'process-orders',
        }),
      ).toEqual('dev-BananaLauncher-ProcessOrders');
    });

    it('should return the correct function name when service comes PascalCased', () => {
      expect(
        lambdaFunctionName({
          env: 'dev',
          serviceName: 'BananaLauncher',
          functionName: 'ProcessOrders',
        }),
      ).toEqual('dev-BananaLauncher-ProcessOrders');
    });

    it('should use the correct environment prefix', () => {
      expect(
        lambdaFunctionName({
          env: 'prd',
          serviceName: 'banana-launcher',
          functionName: 'process-orders',
        }),
      ).toEqual('prd-BananaLauncher-ProcessOrders');
    });
  });
});
