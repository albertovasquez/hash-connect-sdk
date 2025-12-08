# HashConnect SDK v3 - Must Haves for Robustness & Stability

## Document Purpose

This document outlines improvements needed for `@hashpass/connect` v3 to enhance robustness and stability. The SDK is now React-only with a solid foundation. These are incremental improvements to harden the implementation.

---

## 1. 🎯 Clear Purpose Statement (Missing)

**Priority: CRITICAL**

The SDK lacks a clear, concise purpose statement in its documentation and exports.

### Current State

The README starts with "React-only authentication and wallet integration" but doesn't clearly answer:

- What problem does this solve?
- Who is the target user?
- What is the primary use case?

### Must Have

Add a purpose statement at the top of the README and export it programmatically:

```typescript
// Should be exported from the SDK
export const SDK_PURPOSE = {
  name: "@hashpass/connect",
  description:
    "Authenticate poker room club administrators via QR code using HASH Pass mobile wallet",
  primaryUseCase:
    "Club authentication for TV displays and director dashboards in live poker rooms",
  targetUsers: [
    "Poker room operators",
    "Club managers",
    "Tournament directors",
  ],
};
```

### Acceptance Criteria

- [ ] README has a clear "What is this?" section in the first paragraph
- [ ] Purpose is codified and exportable for runtime access
- [ ] Example use case (poker room) is mentioned

---

## 2. 🔍 Auth State Observability

**Priority: HIGH**

### Current State

The app uses workarounds to determine auth state:

- Reading `localStorage` directly for non-React contexts (`src/lib/hashconnect.ts`)
- Custom flags like `poker-id-was-authenticated` in localStorage
- Multiple `setTimeout` delays to "wait for SDK to initialize"

### Must Have

#### 2.1 Export `isSDKReady()` utility

```typescript
// Should be exported from SDK
export function isSDKReady(): boolean;
export function getAuthState(): {
  isAuthenticated: boolean;
  hasTokens: boolean;
  hasClubId: boolean;
  isInitializing: boolean;
};
```

#### 2.2 Add `onAuthStateChange` callback option to Provider

```tsx
<HashConnectProvider
  onAuthStateChange={(state) => {
    console.log('Auth changed:', state.isConnected, state.clubId);
  }}
>
```

#### 2.3 Export a non-React getter for token access

```typescript
// For use in API interceptors, fetch wrappers, etc.
export function getAccessToken(): Promise<string | null>;
export function getClubId(): string | null;
```

### Acceptance Criteria

- [ ] Non-React code can check auth state without reading localStorage directly
- [ ] Provider supports `onAuthStateChange` callback
- [ ] Token getter is officially exported (not localStorage reading)

---

## 3. ⏱️ Initialization State Machine

**Priority: HIGH**

### Current State

Consumers don't know if the SDK is:

- Still initializing (checking localStorage, restoring session)
- Ready but not connected
- Connected
- Failed to initialize

This leads to timing-based workarounds:

```tsx
// Current workaround in PokerID
const [hasCheckedInitialAuth, setHasCheckedInitialAuth] = useState(false);
useEffect(() => {
  const timer = setTimeout(() => {
    setHasCheckedInitialAuth(true);
  }, 2000); // Magic number
  return () => clearTimeout(timer);
}, []);
```

### Must Have

#### 3.1 Add explicit initialization state

```typescript
type InitializationState =
  | "idle" // SDK not started
  | "initializing" // Checking localStorage, restoring session
  | "ready" // Initialization complete, may or may not be connected
  | "error"; // Failed to initialize

// In useHashConnect return
const {
  initState, // InitializationState
  isReady, // Boolean: initState === 'ready'
  isConnected, // Boolean: connected AND authenticated
  isLoading, // Boolean: connection in progress
} = useHashConnect();
```

#### 3.2 Promise-based readiness

```typescript
// Wait for SDK to be ready before making auth decisions
await useHashConnect().waitForReady();
```

### Acceptance Criteria

- [ ] `initState` clearly distinguishes "not yet checked" from "checked and disconnected"
- [ ] No need for `setTimeout` workarounds in consuming apps
- [ ] `isReady` boolean for simple conditional rendering

---

## 4. 🔄 Token Refresh Visibility

**Priority: MEDIUM**

### Current State

Token refresh happens in the background. Consumers have no visibility into:

- When tokens will expire
- Whether a refresh is in progress
- Refresh failures

### Must Have

#### 4.1 Expose token metadata

```typescript
const {
  tokenExpiresAt, // Date | null
  tokenExpiresIn, // number (seconds) | null
  isRefreshing, // boolean
  lastRefreshError, // Error | null
} = useHashConnect();
```

#### 4.2 Manual refresh trigger

```typescript
const { refreshToken } = useHashConnect();
// Force token refresh (useful before critical operations)
await refreshToken();
```

### Acceptance Criteria

- [ ] Consumers can know when tokens expire
- [ ] Refresh state is observable
- [ ] Manual refresh is possible for critical operations

---

## 5. 🚨 Error Categorization

**Priority: MEDIUM**

### Current State

The SDK exposes `error` as a string. This makes programmatic error handling difficult.

### Must Have

#### 5.1 Typed error objects

```typescript
type HashConnectError = {
  code:
    | "NETWORK_ERROR"
    | "AUTH_EXPIRED"
    | "INVALID_QR"
    | "PUSHER_DISCONNECTED"
    | "TOKEN_REFRESH_FAILED";
  message: string;
  recoverable: boolean;
  retryable: boolean;
};

const { error } = useHashConnect(); // HashConnectError | null
```

#### 5.2 Error recovery suggestions

```typescript
if (error?.code === "TOKEN_REFRESH_FAILED" && error.retryable) {
  // Show "Retry" button
}
if (!error?.recoverable) {
  // Show "Please reconnect" UI
}
```

### Acceptance Criteria

- [ ] Errors have structured codes
- [ ] `recoverable` and `retryable` flags guide UI decisions
- [ ] Type safety for error handling

---

## 6. 📊 Connection Health Metrics

**Priority: MEDIUM**

### Current State

Pusher connection state is exposed but there's no aggregate "health" indicator.

### Must Have

#### 6.1 Connection health summary

```typescript
const { connectionHealth } = useHashConnect();
// {
//   status: 'healthy' | 'degraded' | 'disconnected',
//   pusherState: 'connected' | 'connecting' | 'disconnected' | 'failed',
//   lastConnectedAt: Date | null,
//   reconnectAttempts: number,
// }
```

#### 6.2 Health change events

```tsx
<HashConnectProvider
  onHealthChange={(health) => {
    if (health.status === 'degraded') {
      showToast('Connection issues detected');
    }
  }}
>
```

### Acceptance Criteria

- [ ] Single "health" status for UI indicators
- [ ] Reconnection visibility
- [ ] Callback for health changes

---

## 7. 🧪 Testing Utilities

**Priority: LOW**

### Current State

No testing utilities are provided. Consumers must mock the entire context.

### Must Have

#### 7.1 Mock provider for testing

```typescript
import { MockHashConnectProvider } from "@hashpass/connect/testing";

test("renders when connected", () => {
  render(
    <MockHashConnectProvider
      initialState={{ isConnected: true, clubId: "test-club" }}
    >
      <MyComponent />
    </MockHashConnectProvider>
  );
});
```

#### 7.2 State manipulation in tests

```typescript
import { mockHashConnect } from "@hashpass/connect/testing";

test("handles disconnect", async () => {
  const { simulateDisconnect } = mockHashConnect();
  // ...
  await simulateDisconnect();
  // Assert component handles disconnect
});
```

### Acceptance Criteria

- [ ] `MockHashConnectProvider` exported from `/testing`
- [ ] State simulation utilities available
- [ ] No need to mock internal implementation

---

## 8. 📝 Debug Mode Improvements

**Priority: LOW**

### Current State

`debug={true}` enables console logging but output is unstructured.

### Must Have

#### 8.1 Structured debug output

```typescript
// Instead of console.log('Connected!')
// Output:
// [HashConnect] AUTH_STATE_CHANGE { isConnected: true, clubId: 'abc', timestamp: '...' }
```

#### 8.2 Debug event export

```tsx
<HashConnectProvider
  debug={true}
  onDebugEvent={(event) => {
    // Send to logging service
    logger.debug('hashconnect', event.type, event.payload);
  }}
>
```

### Acceptance Criteria

- [ ] Debug logs are structured (type, payload, timestamp)
- [ ] Debug events can be captured programmatically
- [ ] Sensitive data (tokens) never logged

---

## 9. 🔐 Security Hardening

**Priority: HIGH**

### Current State

Tokens are stored in localStorage with `hc:` prefix. This is standard but has known risks.

### Must Have

#### 9.1 Token storage options

```tsx
<HashConnectProvider
  tokenStorage="localStorage"  // default
  // OR
  tokenStorage="sessionStorage"  // cleared on tab close
  // OR
  tokenStorage="memory"  // cleared on refresh, most secure
>
```

#### 9.2 Secure token access

```typescript
// getToken() should always return a fresh token or null
// Never return expired tokens
const token = await getToken(); // null if expired AND refresh failed
```

#### 9.3 Session timeout configuration

```tsx
<HashConnectProvider
  sessionTimeout={30 * 60 * 1000}  // 30 minutes of inactivity
  onSessionTimeout={() => {
    showToast('Session expired. Please reconnect.');
  }}
>
```

### Acceptance Criteria

- [ ] Storage backend is configurable
- [ ] Expired tokens are never returned
- [ ] Inactivity timeout is configurable

---

## Implementation Priority

| #   | Feature                      | Priority | Effort | Impact |
| --- | ---------------------------- | -------- | ------ | ------ |
| 1   | Purpose Statement            | CRITICAL | Low    | High   |
| 2   | Auth State Observability     | HIGH     | Medium | High   |
| 3   | Initialization State Machine | HIGH     | Medium | High   |
| 9   | Security Hardening           | HIGH     | Medium | High   |
| 4   | Token Refresh Visibility     | MEDIUM   | Low    | Medium |
| 5   | Error Categorization         | MEDIUM   | Medium | Medium |
| 6   | Connection Health Metrics    | MEDIUM   | Low    | Medium |
| 7   | Testing Utilities            | LOW      | Medium | Medium |
| 8   | Debug Mode Improvements      | LOW      | Low    | Low    |

---

## Current Workarounds in PokerID

These workarounds should be removable once the SDK implements the above:

### 1. `src/lib/hashconnect.ts`

Direct localStorage reading for non-React contexts. **Remove when #2 is implemented.**

### 2. `poker-id-was-authenticated` flag

Custom flag to track if user was ever authenticated. **Remove when #3 is implemented.**

### 3. `setTimeout` delays in layouts

2000ms delays to "wait for SDK to initialize". **Remove when #3 is implemented.**

### 4. `hasCheckedSession` state

Manual tracking of initialization. **Remove when #3 is implemented.**

---

## Version Targeting

These improvements should target:

- **v3.1.0**: Items 1-3 (Critical/High priority, foundation)
- **v3.2.0**: Items 4-6 (Medium priority, observability)
- **v3.3.0**: Items 7-9 (Testing, debug, security)

---

## References

- Current SDK Version: `@hashpass/connect@3.0.3`
- SDK Repository: https://github.com/bitlabs/hash-connect-sdk
- PokerID Integration: See `src/App.tsx`, `src/lib/hashconnect.ts`
