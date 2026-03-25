import {
  serviceAccountRoleName,
  serviceAccountName,
} from './iam.name.conventions';

describe('IAM Name Conventions', () => {
  describe('serviceAccountRoleName', () => {
    it('should return the correct service account role name', () => {
      expect(serviceAccountRoleName('service-name', 'dev')).toEqual(
        'service-name-eks-service-account-dev',
      );
    });
  });
  describe('serviceAccountName', () => {
    it('should return the correct service account name', () => {
      expect(serviceAccountName('service-name')).toEqual(
        'service-name-service-account',
      );
    });
  });
});
