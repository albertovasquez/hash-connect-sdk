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

### Implementation Prompt

```
TASK: Add `isInitialized` state to HashConnect SDK

CONTEXT:
You are modifying the @hashpass/connect SDK. The SDK uses React Context to manage authentication state. When the provider mounts, it restores sessions from localStorage in a useEffect, but consumers cannot distinguish "still checking" from "checked and not authenticated".

FILES TO MODIFY:
1. src/react/HashConnectContext.ts - Add isInitialized to AuthState interface and initialAuthState
2. src/react/HashConnectProvider.tsx - Set isInitialized to true after localStorage check
3. src/react/useHashConnect.ts - Expose isInitialized in UseHashConnectReturn and return object

CURRENT STATE:
- initialAuthState in HashConnectContext.ts has: isConnected, isLoading, isModalOpen, userAddress, accessToken, refreshToken, signature, clubId, clubName, sessionId, error
- The localStorage restoration happens in useEffect at ~line 192 in HashConnectProvider.tsx
- The useEffect either restores a session (sets isConnected: true) or logs "No stored session found"

REQUIREMENTS:
1. Add `isInitialized: boolean` to AuthState interface (default: false)
2. Set `isInitialized: true` at the END of the localStorage check useEffect, AFTER all branching logic (both success and "no session" paths)
3. Include isInitialized in the setState calls within that useEffect
4. Export isInitialized from useHashConnect hook

CONSTRAINTS:
- Do NOT add any new useEffect hooks
- Do NOT add any setTimeout or async delays
- Do NOT modify any other state fields or logic
- Do NOT add loading spinners or UI changes
- Keep the change minimal: ~10 lines total across 3 files

EXAMPLE CHANGES:
In HashConnectContext.ts initialAuthState:
  isInitialized: false,

In HashConnectProvider.tsx useEffect (line ~192):
  After "if (storedToken && storedAddress)" block AND after "else" block, both paths should set isInitialized: true

In useHashConnect.ts:
  Add isInitialized to UseHashConnectReturn interface and return object

TEST: After implementation, isInitialized should be false on first render, then true after the useEffect runs (regardless of whether a session was found).
```

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

### Implementation Prompt

```
TASK: Add standalone token access functions for non-React code

CONTEXT:
You are modifying the @hashpass/connect SDK. Currently, getToken() only works inside React components via the hook. API interceptors and utility functions must read localStorage directly, bypassing SDK validation. We need exported functions that work outside React.

FILES TO MODIFY:
1. src/react/index.ts - Export new functions
2. NEW FILE: src/standalone.ts - Create standalone functions

CURRENT STATE:
- Storage keys are defined in src/react/hooks/useStorage.ts as STORAGE_KEYS with prefix 'hc:'
- Full keys: hc:accessToken, hc:refreshToken, hc:address, hc:clubId, hc:clubName, hc:signature
- validateTokenFormat() exists in HashConnectProvider.tsx (lines 67-98) - validates JWT structure and expiration
- Token refresh requires: refreshToken, address, and authEndpoint (from CONFIG in src/config.ts)

REQUIREMENTS:
1. Create src/standalone.ts with two exported functions:

   getAccessToken(): Promise<string | null>
   - Read hc:accessToken from localStorage
   - If no token, return null
   - If token exists, validate with same logic as validateTokenFormat()
   - If token is expired but hc:refreshToken exists, attempt refresh via fetch to CONFIG.AUTH_ENDPOINT/auth/refresh
   - Return valid token or null (never return expired token)

   getAuthState(): { isAuthenticated: boolean; userAddress: string | null; clubId: string | null }
   - Read from localStorage: hc:accessToken, hc:address, hc:clubId
   - isAuthenticated = token exists AND passes validateTokenFormat()
   - Return synchronous result (no refresh attempt)

2. Export both functions from src/react/index.ts

CONSTRAINTS:
- Do NOT import React or any React hooks
- Do NOT create classes or singletons
- Do NOT add event emitters or subscriptions
- Do NOT modify any existing files except index.ts exports
- Copy validateTokenFormat logic (don't import from Provider to avoid React dependency)
- Handle localStorage unavailable (SSR) by returning null/false
- Refresh endpoint: POST to `${CONFIG.AUTH_ENDPOINT}/auth/refresh` with body { refreshToken, address }

FUNCTION SIGNATURES:
export async function getAccessToken(): Promise<string | null>;
export function getAuthState(): {
  isAuthenticated: boolean;
  userAddress: string | null;
  clubId: string | null;
};

FILE STRUCTURE for src/standalone.ts:
- Import CONFIG from './config'
- Copy validateTokenFormat function (pure JS, no React)
- Implement getAccessToken with refresh logic
- Implement getAuthState as synchronous read
- ~60-80 lines total
```

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

### Implementation Prompt

```
TASK: Add onAuthStateChange callback prop to HashConnectProvider

CONTEXT:
You are modifying the @hashpass/connect SDK. Apps need to react to auth state changes for redirects, analytics, and updating non-hook components. Currently this requires useEffect watchers.

FILES TO MODIFY:
1. src/react/HashConnectProvider.tsx - Add prop and call it at appropriate points

EVENT TYPE DEFINITION (add near top of HashConnectProvider.tsx):
export type AuthStateChangeEvent = {
  type: 'connected' | 'disconnected' | 'refreshed';
  isConnected: boolean;
  userAddress: string | null;
  clubId: string | null;
};

REQUIREMENTS:
1. Add to HashConnectProviderProps interface:
   onAuthStateChange?: (event: AuthStateChangeEvent) => void;

2. Call onAuthStateChange in exactly 3 places:

   A. In handleAuthorization (~line 378) - AFTER setState completes:
      type: 'connected', isConnected: true, userAddress: data.address, clubId: data.clubId || null

   B. In handleDisconnect (~line 415) - BEFORE setState resets state:
      type: 'disconnected', isConnected: false, userAddress: null, clubId: null

   C. In useTokenRefresh onTokensRefreshed callback (~line 169) - AFTER setState:
      type: 'refreshed', isConnected: true, userAddress: state.userAddress, clubId: state.clubId

CONSTRAINTS:
- Do NOT add useEffect to watch state changes
- Do NOT fire callback on mount or initialization
- Do NOT fire callback on cross-tab sync (storage events)
- Do NOT modify context type or useHashConnect hook
- Callback is optional - check if (onAuthStateChange) before calling
- Keep changes minimal: ~15-20 lines added

EXAMPLE USAGE (do not implement, just for reference):
<HashConnectProvider
  onAuthStateChange={({ type, clubId }) => {
    if (type === 'disconnected') router.push('/login');
  }}
>

IMPLEMENTATION PATTERN:
// In handleAuthorization, after setState:
onAuthStateChange?.({
  type: 'connected',
  isConnected: true,
  userAddress: data.address,
  clubId: data.clubId || null,
});
```

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

### Implementation Prompt

```
TASK: Add onLog callback prop for consolidated logging

CONTEXT:
You are modifying the @hashpass/connect SDK. The SDK has a debug={true} prop that outputs to console.log. Apps want SDK logs in their own logging system (Sentry, Datadog) without duplicate console output.

FILES TO MODIFY:
1. src/react/HashConnectProvider.tsx - Add prop and modify log function

LOG EVENT TYPE (add near AuthStateChangeEvent):
export type LogEvent = {
  message: string;
  timestamp: Date;
};

REQUIREMENTS:
1. Add to HashConnectProviderProps interface:
   onLog?: (event: LogEvent) => void;

2. Modify the existing log function (~line 119) to implement this logic:
   - If onLog is provided: call onLog with message and timestamp, DO NOT console.log
   - If onLog is NOT provided AND debug is true: console.log as before
   - If neither: no logging

CURRENT log FUNCTION (line 119-121):
const log = useCallback((...args: unknown[]) => {
  if (debug) console.log('[HashConnect]', ...args);
}, [debug]);

NEW log FUNCTION:
const log = useCallback((...args: unknown[]) => {
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');

  if (onLog) {
    onLog({ message, timestamp: new Date() });
    return;
  }

  if (debug) {
    console.log('[HashConnect]', ...args);
  }
}, [debug, onLog]);

CONSTRAINTS:
- Do NOT add log levels (info, warn, error) - keep it simple
- Do NOT add structured data beyond message and timestamp
- Do NOT modify any log() call sites
- Do NOT add any other props
- The [HashConnect] prefix is NOT included in onLog message (consumer adds their own prefix)
- Total change: ~15 lines modified in one file

BEHAVIOR MATRIX:
| debug | onLog    | Result                        |
|-------|----------|-------------------------------|
| false | null     | No logging                    |
| true  | null     | Console logging               |
| false | provided | Callback only (no console)    |
| true  | provided | Callback only (no console)    |

Note: When onLog is provided, it ALWAYS takes precedence and suppresses console output, regardless of debug value.
```

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
