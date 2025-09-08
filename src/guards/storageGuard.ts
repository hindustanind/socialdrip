const FORBIDDEN_KEYS = new Set([
  "display_name",
  "avatar",
  "avatar_path",
  "avatar_url",
  "dripsocial-local-profile", // The old key
]);

const ERROR_MESSAGE = "Direct localStorage access for profile data is forbidden. Use the profile service instead.";

export function installStorageGuard() {
  if (process.env.NODE_ENV === 'test' || typeof window === 'undefined' || !window.localStorage) {
    return; // Do not install in test environment or server-side
  }

  const originalSetItem = localStorage.setItem;
  const originalGetItem = localStorage.getItem;
  const originalRemoveItem = localStorage.removeItem;

  localStorage.setItem = function(key: string, value: string) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new Error(`${ERROR_MESSAGE} (Attempted to set '${key}')`);
    }
    originalSetItem.apply(this, [key, value]);
  };

  localStorage.getItem = function(key: string) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new Error(`${ERROR_MESSAGE} (Attempted to get '${key}')`);
    }
    return originalGetItem.apply(this, [key]);
  };

  localStorage.removeItem = function(key: string) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new Error(`${ERROR_MESSAGE} (Attempted to remove '${key}')`);
    }
    originalRemoveItem.apply(this, [key]);
  };
}
