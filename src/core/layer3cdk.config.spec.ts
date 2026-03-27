import {
  resolveArraySection,
  resolveObjectSection,
  loadLayer3Config,
} from './layer3cdk.config';

describe('layer3cdk.config', () => {
  describe('resolveArraySection', () => {
    const defaults = ['a', 'b', 'c'];

    it('should return defaults when section is undefined', () => {
      expect(resolveArraySection(defaults, undefined)).toEqual(['a', 'b', 'c']);
    });

    it('should extend defaults', () => {
      expect(
        resolveArraySection(defaults, { mode: 'extend', values: ['d', 'e'] }),
      ).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('should deduplicate when extending', () => {
      expect(
        resolveArraySection(defaults, { mode: 'extend', values: ['b', 'd'] }),
      ).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should override defaults', () => {
      expect(
        resolveArraySection(defaults, { mode: 'override', values: ['x', 'y'] }),
      ).toEqual(['x', 'y']);
    });

    it('should work with readonly defaults', () => {
      const readonlyDefaults = ['a', 'b'] as const;
      expect(resolveArraySection(readonlyDefaults, undefined)).toEqual([
        'a',
        'b',
      ]);
    });
  });

  describe('resolveObjectSection', () => {
    const defaults = { key1: 'val1', key2: 'val2' };

    it('should return defaults when section is undefined', () => {
      expect(resolveObjectSection(defaults, undefined)).toEqual(defaults);
    });

    it('should extend defaults', () => {
      expect(
        resolveObjectSection(defaults, {
          mode: 'extend',
          values: { key3: 'val3' },
        }),
      ).toEqual({ key1: 'val1', key2: 'val2', key3: 'val3' });
    });

    it('should allow extending values to override defaults', () => {
      expect(
        resolveObjectSection(defaults, {
          mode: 'extend',
          values: { key1: 'overridden' },
        }),
      ).toEqual({ key1: 'overridden', key2: 'val2' });
    });

    it('should override defaults completely', () => {
      expect(
        resolveObjectSection(defaults, {
          mode: 'override',
          values: { only: 'this' },
        }),
      ).toEqual({ only: 'this' });
    });
  });

  describe('loadLayer3Config', () => {
    it('should return empty config for undefined', () => {
      expect(loadLayer3Config(undefined)).toEqual({});
    });

    it('should return empty config for null', () => {
      expect(loadLayer3Config(null as unknown as undefined)).toEqual({});
    });

    it('should return object directly', () => {
      const config = { team: 'my-team' };
      expect(loadLayer3Config(config)).toEqual(config);
    });

    it('should parse valid JSON string', () => {
      expect(loadLayer3Config('{"team":"my-team"}')).toEqual({
        team: 'my-team',
      });
    });

    it('should throw on invalid JSON string', () => {
      expect(() => loadLayer3Config('{bad}')).toThrow(
        '[Layer3CDK] Invalid JSON in -c layer3cdk context value.',
      );
    });
  });
});
