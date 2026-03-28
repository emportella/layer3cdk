import { ssmParameterName } from './ssm.name.conventions';

describe('SSM Name Conventions', () => {
  describe('ssmParameterName', () => {
    describe('given context is global', () => {
      it('should return the correct ssm string parameter name', () => {
        expect(
          ssmParameterName({
            parameterName: 'sample',
            serviceName: 'PizzaCannon',
            department: 'pltf',
            contextLevel: 'global',
            env: 'dev',
          }),
        ).toEqual('/dev/global/sample');
      });
    });
    describe('given context is department', () => {
      it('should return the correct ssm string parameter name', () => {
        expect(
          ssmParameterName({
            parameterName: 'sample',
            serviceName: 'PizzaCannon',
            department: 'pltf',
            contextLevel: 'department',
            env: 'dev',
          }),
        ).toEqual('/dev/pltf/sample');
      });
    });
    describe('given context is service', () => {
      it('should return the correct ssm string parameter name', () => {
        expect(
          ssmParameterName({
            parameterName: 'sample',
            serviceName: 'PizzaCannon',
            department: 'pltf',
            contextLevel: 'service',
            env: 'dev',
          }),
        ).toEqual('/dev/pizza-cannon/sample');
      });
    });
  });
});
