import { afterEach, describe, expect, it, vi } from 'vitest';

import { optionalEnv, requireEnv } from './env';

describe('env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('requireEnv', () => {
    it('returns the value when set', () => {
      vi.stubEnv('SOME_VAR', 'value');
      expect(requireEnv('SOME_VAR')).toBe('value');
    });

    it('throws when missing', () => {
      vi.stubEnv('MISSING_VAR', '');
      expect(() => requireEnv('MISSING_VAR')).toThrow('Missing required environment variable: MISSING_VAR');
    });
  });

  describe('optionalEnv', () => {
    it('returns the value when set', () => {
      vi.stubEnv('SOME_VAR', 'value');
      expect(optionalEnv('SOME_VAR')).toBe('value');
    });

    it('returns undefined when blank or unset', () => {
      vi.stubEnv('BLANK_VAR', '   ');
      expect(optionalEnv('BLANK_VAR')).toBeUndefined();
    });
  });
});
