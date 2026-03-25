import { ssmParameterName } from './ssm.name.conventions';

describe('SSM Name Conventions', () => {
  describe('ssmParameterName', () => {
    describe('given context is global', () => {
      it('should return the correct ssm string parameter name', () => {
        expect(
          ssmParameterName('sample', 'ServiceName', 'rpj', 'global', 'dev'),
        ).toEqual('/dev/global/sample');
      });
    });
    describe('given context is domain', () => {
      it('should return the correct ssm string parameter name', () => {
        expect(
          ssmParameterName('sample', 'ServiceName', 'rpj', 'domain', 'dev'),
        ).toEqual('/dev/rpj/sample');
      });
    });
    describe('given context is service', () => {
      it('should return the correct ssm string parameter name', () => {
        expect(
          ssmParameterName('sample', 'ServiceName', 'rpj', 'service', 'dev'),
        ).toEqual('/dev/service-name/sample');
      });
    });
  });
});
