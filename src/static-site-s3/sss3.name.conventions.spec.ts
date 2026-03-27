import { testconfig } from '../test/common.test.const';
import {
  sss3BucketName,
  sss3DistributionComment,
} from './sss3.name.conventions';

describe('SSS3 Name Conventions', () => {
  describe('sss3BucketName', () => {
    it('should return the correct bucket name', () => {
      expect(sss3BucketName('admin-portal', testconfig)).toEqual(
        'dev-rpj-test-app-admin-portal-assets',
      );
    });

    it('should lowercase the entire bucket name', () => {
      const name = sss3BucketName('MyApp', testconfig);
      expect(name).toEqual(name.toLowerCase());
    });
  });

  describe('sss3DistributionComment', () => {
    it('should return the correct distribution comment', () => {
      expect(sss3DistributionComment('admin-portal', testconfig)).toEqual(
        'dev-rpj-test-app-admin-portal Distribution',
      );
    });
  });
});
