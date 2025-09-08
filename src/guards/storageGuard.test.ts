import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installStorageGuard } from './storageGuard';

describe('storageGuard', () => {
  let originalSetItem: (key: string, value: string) => void;
  let originalGetItem: (key: string) => string | null;
  let originalRemoveItem: (key: string) => void;
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Backup original methods and environment
    originalSetItem = Storage.prototype.setItem;
    originalGetItem = Storage.prototype.getItem;
    originalRemoveItem = Storage.prototype.removeItem;
    originalEnv = process.env.NODE_ENV;

    // Force install the guard for this test suite
    (process.env as any).NODE_ENV = 'development';
    installStorageGuard();
  });

  afterEach(() => {
    // Restore everything
    Storage.prototype.setItem = originalSetItem;
    Storage.prototype.getItem = originalGetItem;
    Storage.prototype.removeItem = originalRemoveItem;
    (process.env as any).NODE_ENV = originalEnv;
  });

  it('should throw an error when trying to set a forbidden key', () => {
    const forbiddenKey = 'display_name';
    const expectedError = `Direct localStorage access for profile data is forbidden. Use the profile service instead. (Attempted to set '${forbiddenKey}')`;
    
    expect(() => {
      localStorage.setItem(forbiddenKey, 'test-value');
    }).toThrow(expectedError);
  });

  it('should throw an error when trying to get a forbidden key', () => {
    const forbiddenKey = 'avatar_path';
    const expectedError = `Direct localStorage access for profile data is forbidden. Use the profile service instead. (Attempted to get '${forbiddenKey}')`;
    
    expect(() => {
      localStorage.getItem(forbiddenKey);
    }).toThrow(expectedError);
  });

  it('should throw an error when trying to remove the legacy profile key', () => {
    const forbiddenKey = 'dripsocial-local-profile';
    const expectedError = `Direct localStorage access for profile data is forbidden. Use the profile service instead. (Attempted to remove '${forbiddenKey}')`;
    
    expect(() => {
      localStorage.removeItem(forbiddenKey);
    }).toThrow(expectedError);
  });

  it('should not throw an error for an allowed key', () => {
    const allowedKey = 'some-other-key';
    
    expect(() => {
      localStorage.setItem(allowedKey, 'test-value');
      localStorage.getItem(allowedKey);
      localStorage.removeItem(allowedKey);
    }).not.toThrow();
  });
});
