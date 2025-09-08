// src/dev/profileLog.ts

/**
 * A simple, dev-only logger for profile operations.
 * To enable, set `window.DRIP_DEBUG = true` in the browser console.
 */
export const logProfile = (op: string, payload?: any, err?: any) => {
  if (process.env.NODE_ENV !== 'production' && (window as any).DRIP_DEBUG) {
    const errorPayload = err ? { code: err.code, msg: err.message } : null;
    console.info(
      `%c[profile] %c${op}`,
      'color: #f400f4; font-weight: bold;',
      'color: inherit; font-weight: normal;',
      payload || 'N/A',
      errorPayload || ''
    );
  }
};
