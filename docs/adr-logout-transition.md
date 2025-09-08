# ADR-001: Robust, Flicker-Free Logout Transition

**Status:** Accepted

## Context

The previous logout implementation triggered a race condition by executing a synchronous local state clear and an asynchronous hard page reload (`window.location.replace`) nearly simultaneously. This resulted in a noticeable UI flicker, where the old page's background or components would flash briefly before the login page fully rendered. This behavior was amplified in React 18's StrictMode and detracted from the application's professional feel. Subsequent fixes still showed potential for main-thread blocking from network calls or heavy cleanup tasks.

## Decision

We will implement a deterministic "fast-path" state-driven logout transition, eliminating all hard page reloads and deferring all non-essential work to ensure an immediate, sub-300ms UI response.

1.  **Global State Flag (`isLoggingOut`):** A boolean flag in `AuthContext` is set to `true` the instant the user initiates logout.
2.  **Blocking Overlay & Portal:** A full-screen, max `z-index` overlay is rendered into a `document.body` portal whenever `isLoggingOut` is true. This immediately masks the UI and disables background scroll.
3.  **Immediate State Invalidation:**
    - The `logout()` function synchronously sets the local `user` state to `null`.
    - It immediately stops the session poller to prevent any further network requests or state updates.
4.  **Deferred Operations:**
    - The `supabase.auth.signOut()` network call is deferred into a `queueMicrotask`. This guarantees it runs *after* the current browser paint, ensuring it never blocks the UI transition.
    - Any potentially heavy, non-critical cleanup tasks (e.g., clearing large caches) are deferred using `requestIdleCallback` (with a `setTimeout` fallback).

The flow is as follows:
- User clicks "Logout".
- `logout()` sets `isLoggingOut=true`, starting a performance profiler (in dev).
- React renders the full-screen overlay, hiding the app and marking the "overlay paint" time.
- `logout()` immediately stops the session poller and sets `user=null`, marking the "user cleared" time.
- The `user=null` state causes the `AppContent` component to render the `<LoginPage />`.
- `queueMicrotask` schedules `signOut()` to run in the background.
- `requestIdleCallback` schedules any heavy cleanup for later.
- `LoginPage` mounts, marks the "login interactive" time, and calls `setIsLoggingOut(false)`.
- The overlay unmounts, revealing the fully rendered `LoginPage`.

## Consequences

- **Positive:**
  - Guarantees a sub-300ms, flicker-free UI transition, regardless of network speed.
  - The solution is robust and works correctly in React StrictMode.
  - Decouples the UI transition completely from network latency.
  - Prioritizes user-perceived performance by strategically scheduling tasks.
- **Negative:**
  - Introduces a slightly more complex task scheduling logic (`queueMicrotask`, `requestIdleCallback`).

## Alternatives Considered

- **`await supabase.auth.signOut()`:** The simplest approach, but it blocks the UI on a network request, causing unpredictable delays. Rejected.
- **Fire-and-Forget `signOut()`:** Better, but still risks the network call starting within the same task as the UI update, potentially causing contention. The `queueMicrotask` approach is more deterministic.

## Test Plan

- **Manual:** Verify in preview that logout is seamless and the overlay appears correctly.
- **Automated (Dev Profiler):** The new `logoutProfiler` automatically measures key timings (`overlay paint`, `login interactive`) and watches for long tasks on every logout in development, warning on regressions.
- **Automated (E2E with Playwright):**
  - Test for flicker-free transition and correct final state (`LoginPage`).
  - Test robustness against rapid clicks on the logout button.
  - Test `z-index` correctness by ensuring the overlay appears above any active toasts.
- **Automated (Unit Test):** Verify the `AuthContext` state machine transitions correctly.
