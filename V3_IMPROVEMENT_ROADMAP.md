# HashConnect SDK v3 - Improvement Roadmap

## Overview

This document outlines **critical** improvements for `@hashpass/connect` v3. Each item addresses a specific pain point observed in production usage (PokerID) with a clear justification.

---

## 1. Initialization State

**Priority: CRITICAL**  
**Effort: Low**

### The Problem

When the SDK mounts, it restores the session from localStorage in a `useEffect`. During this restoration (typically <100ms), `isConnected` is `false` even if the user has a valid session. Consumers cannot distinguish between:

- "SDK is still checking localStorage" (should show spinner)
- "SDK checked and user is not authenticated" (should show login)

This forces workarounds like arbitrary `setTimeout` delays:

```tsx
// Current workaround in PokerID
const [hasCheckedInitialAuth, setHasCheckedInitialAuth] = useState(false);
useEffect(() => {
  const timer = setTimeout(() => setHasCheckedInitialAuth(true), 2000);
  return () => clearTimeout(timer);
}, []);
```

### The Solution

Add `isInitialized` to the hook return value:

```typescript
const {
  isInitialized, // NEW: true once localStorage check is complete
  isConnected, // existing: true if authenticated
  isLoading, // existing: true if actively connecting via QR
} = useHashConnect();
```

**Implementation**: Set `isInitialized: false` in initial state, set to `true` at the end of the localStorage restoration `useEffect` (after checking for stored tokens).

### Consumer Usage

```tsx
function App() {
  const { isInitialized, isConnected } = useHashConnect();

  if (!isInitialized) {
    return <Spinner />; // SDK still checking for existing session
  }

  if (!isConnected) {
    return <LoginScreen />; // No session found, show login
  }

  return <Dashboard />; // Authenticated
}
```

### Acceptance Criteria

- [ ] `isInitialized` is `false` on mount
- [ ] `isInitialized` becomes `true` after localStorage check completes
- [ ] No breaking changes to existing API

---

## 2. Non-React Token Access

**Priority: HIGH**  
**Effort: Low**

### The Problem

The `getToken()` function is only available inside React components via the hook. Non-React code (API interceptors, fetch wrappers, utility functions) cannot access tokens through the SDK. This forces consumers to read localStorage directly:

```typescript
// Current workaround in PokerID (src/lib/hashconnect.ts)
export function getStoredToken(): string | null {
  return localStorage.getItem("hc:accessToken");
}
```

This is problematic because:

- Bypasses SDK's token validation logic
- May return expired tokens
- Creates coupling to internal storage keys

### The Solution

Export a standalone function that works outside React:

```typescript
// Exported from @hashpass/connect
export async function getAccessToken(): Promise<string | null>;
export function getAuthState(): {
  isAuthenticated: boolean;
  userAddress: string | null;
  clubId: string | null;
};
```

**Implementation**: These functions read from localStorage (same keys the Provider uses) and apply the same `validateTokenFormat()` logic that exists in the Provider. For `getAccessToken()`, attempt token refresh if expired (requires storing refresh endpoint in config or localStorage).

### Consumer Usage

```typescript
// In an API interceptor (non-React)
import { getAccessToken } from "@hashpass/connect";

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Acceptance Criteria

- [ ] `getAccessToken()` returns valid token or null (never expired tokens)
- [ ] `getAuthState()` returns current auth status
- [ ] Functions work outside React context
- [ ] Same validation logic as the Provider

---

## 3. Auth State Change Callback

**Priority: MEDIUM**  
**Effort: Low**

### The Problem

Apps need to react to auth state changes for:

- Redirecting to login on session expiration
- Updating UI in components not using the hook
- Logging/analytics

Currently, this requires watching state in a `useEffect`:

```tsx
// Current workaround
useEffect(() => {
  if (wasConnected && !isConnected) {
    router.push("/login");
  }
}, [isConnected]);
```

### The Solution

Add an optional callback prop to the Provider:

```tsx
<HashConnectProvider
  onAuthStateChange={(event) => {
    // event: { type: 'connected' | 'disconnected' | 'refreshed', ... }
    if (event.type === 'disconnected') {
      router.push('/login');
    }
  }}
>
```

**Implementation**: Call this callback in `handleAuthorization` (connected), `handleDisconnect` (disconnected), and `onTokensRefreshed` (refreshed).

### Consumer Usage

```tsx
<HashConnectProvider
  onAuthStateChange={({ type, isConnected, clubId }) => {
    analytics.track('auth_state_change', { type, clubId });
    if (type === 'disconnected') {
      router.push('/login');
    }
  }}
>
```

### Acceptance Criteria

- [ ] Callback fires on connect, disconnect, and token refresh
- [ ] Event includes relevant state (`type`, `isConnected`, `clubId`, etc.)
- [ ] Optional prop (no breaking changes)

---

## 4. Consolidated Logging via `onLog`

**Priority: LOW**  
**Effort: Low**

### The Problem

The SDK has a `debug={true}` prop that outputs to `console.log`. This is useful for development but:

- Logs go to console only (can't send to Sentry, Datadog, etc.)
- Can't be formatted to match the app's logging conventions
- If consumer wants SDK logs in their logger, they get duplicate output (console + their logger)

### The Solution

Add an `onLog` callback prop. When provided, **SDK console logging is automatically disabled** since the consumer is handling it:

```tsx
<HashConnectProvider
  onLog={(event) => {
    logger.debug('[HashConnect]', event.message);
  }}
>
```

**Implementation**: Modify the existing `log` function:

```typescript
const log = useCallback(
  (...args: unknown[]) => {
    // If onLog is provided, consumer handles logging (no console output)
    if (onLog) {
      onLog({
        message: args.map(String).join(" "),
        timestamp: new Date(),
      });
      return;
    }
    // Otherwise, use debug prop for console logging
    if (debug) {
      console.log("[HashConnect]", ...args);
    }
  },
  [debug, onLog]
);
```

**Behavior:**

- `debug={true}` alone → logs to console
- `onLog={...}` alone → logs to callback only (console suppressed)
- `debug={true}` + `onLog={...}` → logs to callback only (console suppressed)
- Neither → no logging

### Consumer Usage

```tsx
// Integrate with your app's logger
<HashConnectProvider
  onLog={({ message, timestamp }) => {
    logger.debug({
      source: 'hashconnect',
      message,
      timestamp,
    });
  }}
>
```

### Acceptance Criteria

- [ ] `onLog` callback receives all SDK log events
- [ ] Console logging is suppressed when `onLog` is provided
- [ ] `debug` prop still works when `onLog` is not provided
- [ ] Optional prop (no breaking changes)

---

## Summary

| #   | Improvement            | Why It Matters                                           | Effort |
| --- | ---------------------- | -------------------------------------------------------- | ------ |
| 1   | `isInitialized` state  | Eliminates setTimeout workarounds, proper loading states | Low    |
| 2   | Non-React token access | API interceptors can use SDK instead of raw localStorage | Low    |
| 3   | Auth state callback    | Easier routing and analytics integration                 | Low    |
| 4   | `onLog` callback       | Consolidate SDK logs with app's logging system           | Low    |

### What We're NOT Adding

These were considered but deemed unnecessary:

- **Testing utilities** - Consumers can mock the context; not worth the maintenance burden
- **Error categorization** - String errors are sufficient; structured errors add complexity without clear benefit
- **Connection health metrics** - Pusher state is already exposed; aggregated health is app-specific
- **Token storage options** - localStorage is standard; sessionStorage/memory options add complexity with minimal security benefit (XSS can read any storage)
- **Session timeout** - Should be handled at the application level, not in auth SDK

---

## Version Plan

All four improvements target **v3.1.0** as they are low-effort and address real pain points without breaking changes.

---

## References

- Current SDK Version: `@hashpass/connect@3.0.3`
- Consumer app experiencing these issues: PokerID
