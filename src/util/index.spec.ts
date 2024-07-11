import {
  capitalizeFist,
  kebabToPascalCase,
  pascalCaseToKebabCase,
  trimDashes,
} from '.';

describe('util', () => {
  describe('capitalize', () => {
    it('should capitalize fist a string', () => {
      expect(capitalizeFist('hello')).toEqual('Hello');
    });
  });
  describe('kebabToPascalCase', () => {
    it('should turn kebab case string to pascal case', () => {
      expect(kebabToPascalCase('rp-agency')).toEqual('RpAgency');
    });
    it('should do nothing if it is already pascal cases', () => {
      expect(kebabToPascalCase('RpAgency')).toEqual('RpAgency');
    });
  });
  describe('util', () => {
    describe('pascalCaseToKebabCase', () => {
      it('should turn pascal case string to kebab case', () => {
        expect(pascalCaseToKebabCase('RpAgency')).toEqual('rp-agency');
      });
    });
  });
  describe('trimDashes', () => {
    it('should trim dashes from a string', () => {
      expect(trimDashes('---hello---')).toEqual('hello');
    });
    it('should not trim dashes from inside a string', () => {
      expect(trimDashes('-hello-world-')).toEqual('hello-world');
    });
    it('should remove spaces from the beginning and end of a string and any dashe there after', () => {
      expect(trimDashes('-hello- ')).toEqual('hello');
    });
    it('should remove dashes from the beginning and end of a string and any space there after', () => {
      expect(trimDashes('- hello-')).toEqual('hello');
    });
  });
});
