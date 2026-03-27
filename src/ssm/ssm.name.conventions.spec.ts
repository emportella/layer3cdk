import { ssmParameterName } from './ssm.name.conventions';

describe('SSM Name Conventions', () => {
  describe('ssmParameterName', () => {
    describe('given context is global', () => {
      it('should return the correct ssm string parameter name', () => {
        expect(
          ssmParameterName({
            parameterName: 'sample',
            serviceName: 'ServiceName',
            department: 'rpj',
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
            serviceName: 'ServiceName',
            department: 'rpj',
            contextLevel: 'department',
            env: 'dev',
          }),
        ).toEqual('/dev/rpj/sample');
      });
    });
    describe('given context is service', () => {
      it('should return the correct ssm string parameter name', () => {
        expect(
          ssmParameterName({
            parameterName: 'sample',
            serviceName: 'ServiceName',
            department: 'rpj',
            contextLevel: 'service',
            env: 'dev',
          }),
        ).toEqual('/dev/service-name/sample');
      });
    });
  });
});
