// src/dev/logoutProfiler.ts

// A simple profiler for development to measure logout performance.
const noOp = () => {};

// FIX: Export a 'profiler' object to make this file a module.
// This resolves the import error in LoginPage.tsx.
export const profiler = {
  markLoginMounted: process.env.NODE_ENV !== 'production' ? () => {
    if ((window as any)._logoutProfile) {
        (window as any)._logoutProfile.loginMounted = performance.now();
        const start = (window as any)._logoutProfile.start;
        const overlay = (window as any)._logoutProfile.overlayVisible;
        if (start && overlay) {
          console.log(`[PROFILER] Logout-to-Login: ${Math.round((window as any)._logoutProfile.loginMounted - start)}ms (Overlay in ${Math.round(overlay - start)}ms)`);
        }
        delete (window as any)._logoutProfile;
    }
  } : noOp,
  start: process.env.NODE_ENV !== 'production' ? () => {
    (window as any)._logoutProfile = { start: performance.now() };
  } : noOp,
  markOverlay: process.env.NODE_ENV !== 'production' ? () => {
      if ((window as any)._logoutProfile && !(window as any)._logoutProfile.overlayVisible) {
        (window as any)._logoutProfile.overlayVisible = performance.now();
      }
  } : noOp,
};
