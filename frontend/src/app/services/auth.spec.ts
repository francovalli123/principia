import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from './auth';

describe('AuthService', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, value: createStorage() });
    Object.defineProperty(window, 'sessionStorage', { configurable: true, value: createStorage() });
  });

  it('stores tokens in the current tab session only', () => {
    const auth = new AuthService();

    auth.setTokens('access-token', 'refresh-token');

    expect(window.sessionStorage.getItem('access_token')).toBe('access-token');
    expect(window.sessionStorage.getItem('refresh_token')).toBe('refresh-token');
    expect(window.localStorage.getItem('access_token')).toBeNull();
    expect(window.localStorage.getItem('refresh_token')).toBeNull();
  });

  it('removes legacy shared tokens when initialized', () => {
    window.localStorage.setItem('access_token', 'legacy-access');
    window.localStorage.setItem('refresh_token', 'legacy-refresh');

    const auth = new AuthService();

    expect(auth.getAccessToken()).toBeNull();
    expect(auth.getRefreshToken()).toBeNull();
    expect(window.localStorage.getItem('access_token')).toBeNull();
    expect(window.localStorage.getItem('refresh_token')).toBeNull();
  });

  it('clears only the current tab tokens', () => {
    const auth = new AuthService();
    auth.setTokens('access-token', 'refresh-token');
    window.localStorage.setItem('other-data', 'preserved');

    auth.clearTokens();

    expect(auth.isLoggedIn()).toBe(false);
    expect(window.localStorage.getItem('other-data')).toBe('preserved');
  });
});

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}