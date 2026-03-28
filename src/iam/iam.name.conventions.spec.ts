import {
  serviceAccountRoleName,
  serviceAccountName,
} from './iam.name.conventions';

describe('IAM Name Conventions', () => {
  describe('serviceAccountRoleName', () => {
    it('should return the correct service account role name', () => {
      expect(serviceAccountRoleName('pizza-cannon', 'dev')).toEqual(
        'pizza-cannon-eks-service-account-dev',
      );
    });
  });
  describe('serviceAccountName', () => {
    it('should return the correct service account name', () => {
      expect(serviceAccountName('pizza-cannon')).toEqual(
        'pizza-cannon-service-account',
      );
    });
  });
});
