# HashConnect Stability & Troubleshooting Guide

**Version:** 2.0  
**Last Updated:** December 2024  
**Purpose:** Comprehensive guide for diagnosing and resolving HashConnect authentication disconnections and failures  
**Target:** Desktop browsers only (React + Vanilla JS hybrid architecture)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Summary](#architecture-summary)
3. [Common Failure Scenarios](#common-failure-scenarios)
4. [Root Causes Analysis](#root-causes-analysis)
5. [Diagnostic Steps](#diagnostic-steps)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Quick Reference](#quick-reference)
8. [Known Limitations](#known-limitations)

---

## Overview

HashConnect SDK provides decentralized authentication via QR code scanning and Pusher real-time messaging. The current architecture uses a hybrid approach:

- **Core SDK** - Vanilla JavaScript attached to `window.HASHConnect`
- **React Layer** - Hook and Provider wrapping the core SDK
- **Communication** - CustomEvents bridge SDK state to React

This hybrid approach introduces specific stability challenges documented in this guide.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                  Current Hybrid Architecture                 │
└─────────────────────────────────────────────────────────────┘

                    ┌──────────────────────┐
                    │   React Application  │
                    │  (useHashConnect or  │
                    │  HashConnectProvider)│
                    └──────────┬───────────┘
                               │
                    CustomEvents (hash-connect-event)
                               │
                    ┌──────────▼───────────┐
                    │  window.HASHConnect  │
                    │   (Vanilla JS SDK)   │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
       ┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼─────┐
       │   Pusher    │  │ localStorage │  │   Modal   │
       │  (WebSocket)│  │  (Storage)   │  │   (DOM)   │
       └─────────────┘  └─────────────┘  └───────────┘


┌─────────────────────────────────────────────────────────────┐
│                     Authentication Flow                      │
└─────────────────────────────────────────────────────────────┘

1. User clicks Connect → SDK opens modal with QR code
2. User scans QR code with mobile app
3. Mobile App → Pusher → SDK receives (client-hash-pass-connect)
4. SDK subscribes to user's private channel (private-{address})
5. SDK sends authorization request to mobile app
6. Mobile App → Pusher → SDK receives tokens (client-send-authorization-to-site)
7. SDK stores tokens in localStorage
8. SDK dispatches CustomEvent to React
9. React state updates → Connected!


┌─────────────────────────────────────────────────────────────┐
│                  Pusher Connection States                    │
└─────────────────────────────────────────────────────────────┘

initialized → connecting → connected ✅
                              │
                    [network issues]
                              │
                    unavailable/disconnected
                              │
                    [reconnection attempts]
                              │
                    ├── success → connected
                    └── failure → failed (after max attempts)
```

---

## Common Failure Scenarios

### Scenario 1: Session Lost After Page Refresh

**Symptoms:**
- User authenticates successfully
- Page refresh causes disconnection
- User must re-authenticate

**Root Causes:**
- Token expired during page load, refresh fails
- Auto-reconnect doesn't validate token expiry before use
- Storage cleared or unavailable

**Quick Fix:** Check token expiry before auto-reconnect (see Phase 1)

---

### Scenario 2: Authentication Stops Working After Time

**Symptoms:**
- User authenticated successfully
- After 15-60 minutes, API calls fail
- No automatic recovery

**Root Causes:**
- Token expiration without proactive refresh
- Token refresh API returned 401/403 (invalid refresh token)
- Hit max token refresh failures (3 consecutive failures triggers disconnect)

**Quick Fix:** Implement proactive token refresh (see Phase 2)

---

### Scenario 3: Pusher Shows Disconnected

**Symptoms:**
- Status indicator shows "Disconnected" or "Connection Failed"
- QR code scan doesn't trigger response
- Cannot receive authentication events

**Root Causes:**
- Network firewall blocking WebSocket
- Pusher auth endpoint failure (`/auth/pusher`)
- Max reconnection attempts exceeded (currently 3)
- Browser extensions blocking WebSocket

**Quick Fix:** Increase max reconnection attempts (see Phase 1)

---

### Scenario 4: React State Out of Sync

**Symptoms:**
- SDK reports connected but React shows disconnected (or vice versa)
- `isLoading` stuck at `true` forever
- Disconnect doesn't work properly

**Root Causes:**
- CustomEvent not dispatched or not received
- React error handler doesn't reset loading state
- Disconnect relies on DOM button that may not exist

**Quick Fix:** Fix React error handling (see Phase 1)

---

### Scenario 5: Multiple Tabs Cause Issues

**Symptoms:**
- One tab disconnects, others lose authentication
- Conflicting session IDs across tabs
- Token refresh race conditions

**Root Causes:**
- No cross-tab synchronization
- Storage changes in one tab not reflected in others
- Multiple tabs can trigger simultaneous token refreshes

**Quick Fix:** Implement storage event listeners (see Phase 2)

---

## Root Causes Analysis

### 1. Pusher Connection Issues

**File:** `src/utils/connect.ts`

#### Current Configuration

```typescript
const RECONNECT_CONFIG = {
    maxAttempts: 3,        // Only 3 attempts - often not enough
    baseDelay: 2000,       // 2 second initial delay
    maxDelay: 30000,       // Cap at 30 seconds
};
```

**Problem:** 3 attempts with 2s, 4s, 8s delays = ~14 seconds total. Desktop networks can have longer interruptions.

**Recommendation:** Increase to 5-7 attempts for better resilience.

#### Connection State Monitoring

The SDK monitors Pusher connection states and attempts reconnection:

```typescript
// States handled: connected, connecting, unavailable, failed, disconnected
pusherClient.connection.bind('state_change', (states) => {
    // Update UI and trigger reconnection logic
});
```

**Issue:** After reconnection, event listeners may need re-binding.

#### Pusher Auth Endpoint

```typescript
// src/domains/UserAgent/index.ts
authEndpoint: `${CONFIG.AUTH_ENDPOINT}/auth/pusher`
```

**Issue:** If this endpoint fails (401, 500, timeout), private channel subscription fails silently. User sees QR code but scanning does nothing.

---

### 2. Token Management Issues

**File:** `src/domains/UserAgent/entity.ts`

#### Reactive-Only Token Refresh

```typescript
// Tokens only checked when getToken() is called
const expired = isExpired(profile.accessToken);
if (!expired) {
    return profile.accessToken;  // Return current token
}
// Only refresh if expired AND getToken() was called
```

**Problem:** If user doesn't interact, token expires silently. Next API call fails.

**Solution:** Proactive background refresh before expiration.

#### Token Refresh Failure Counter

```typescript
let tokenRefreshFailureCount = 0;
const MAX_TOKEN_REFRESH_FAILURES = 3;

// After 3 failures → disconnect user
if (tokenRefreshFailureCount >= MAX_TOKEN_REFRESH_FAILURES) {
    onDisconnect();
    return null;
}
```

**Current Behavior:** Counter resets on successful token return, which is correct.

#### Race Condition Protection

```typescript
// Mutex prevents duplicate refresh attempts
if (tokenRefreshInProgress) {
    const result = await tokenRefreshInProgress;
    return result;
}
```

**Status:** Already implemented correctly ✅

---

### 3. Storage Issues

**File:** `src/utils/storage.ts`

The SDK uses SafeStorage with fallback:

```typescript
class SafeStorage {
    private fallbackStorage: Map<string, string> = new Map();
    private isLocalStorageAvailable: boolean = true;
    // Falls back to in-memory if localStorage unavailable
}
```

#### Storage Keys

```
hc:sessionId       - Current session identifier
hc:accessToken     - JWT access token
hc:refreshToken    - JWT refresh token  
hc:address         - User wallet address
hc:signature       - User signature
hc:clubId          - Club identifier
hc:clubName        - Club name
```

#### Cross-Tab Issue

Multiple tabs share localStorage, but there's no synchronization:
- Tab A disconnects → clears storage
- Tab B still shows connected (stale React state)
- Tab B's next API call fails

**Solution:** Listen to `storage` events to sync state across tabs.

---

### 4. React Integration Issues

**Files:** `src/react/useHashConnect.ts`, `src/react/HashConnectProvider.tsx`

#### Issue A: isLoading Stuck State

```typescript
// Current implementation
const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
        await window.HASHConnect.connect();
        // isLoading only set to false when CustomEvent received
    } catch (error) {
        setState((prev) => ({
            ...prev,
            isLoading: false,  // Only resets on catch
            error: error.message,
        }));
    }
}, []);
```

**Problem:** If connect() succeeds but CustomEvent never fires, `isLoading` stays `true`.

**Fix:** Add timeout or always reset in finally block.

#### Issue B: Direct localStorage Access

```typescript
// React code bypasses SafeStorage
const storedClubId = localStorage.getItem('hc:clubId');  // Direct access
```

**Should use:** `storage.getItem('hc:clubId')` for consistency.

#### Issue C: Hacky Disconnect

```typescript
// Current disconnect implementation
const disconnectBtn = document.getElementById("hash-connect-disconnect-btn");
if (disconnectBtn) {
    disconnectBtn.click();  // Relies on DOM element existing!
} else {
    // Manual cleanup fallback
    localStorage.removeItem('hc:sessionId');
    // ...
}
```

**Problem:** Fragile dependency on DOM element. The SDK should expose a proper disconnect method.

---

### 5. Event System Issues

**Communication Flow:**

```
SDK State Change
      ↓
document.dispatchEvent(new CustomEvent('hash-connect-event', {...}))
      ↓
React listener: document.addEventListener('hash-connect-event', handler)
      ↓
React State Update
```

**Potential Failures:**
- Event dispatched before React listener attached
- Event handler throws error (event lost)
- Multiple listeners cause duplicate state updates

---

## Diagnostic Steps

### Step 1: Enable Debug Mode

```javascript
// In browser console
window.HASHConnect.CONFIG.DEBUG = true;

// Or before SDK initialization
import { CONFIG } from '@hashpass/connect';
CONFIG.DEBUG = true;
```

### Step 2: Check Pusher Connection

```javascript
// Connection state
window.HASHConnect._pusherClient?.connection.state
// Expected: "connected"
// Problem: "disconnected", "failed", "unavailable"

// All subscribed channels
window.HASHConnect._pusherClient?.allChannels()?.map(c => c.name)
```

### Step 3: Inspect Storage

```javascript
// List all HashConnect keys
Object.keys(localStorage).filter(k => k.startsWith('hc:'))

// Check specific values
localStorage.getItem('hc:accessToken')  // Should exist if connected
localStorage.getItem('hc:refreshToken') // Should exist if connected
localStorage.getItem('hc:address')      // User's address
```

### Step 4: Verify Token

```javascript
// Parse and check token expiry
function checkToken() {
    const token = localStorage.getItem('hc:accessToken');
    if (!token) return console.log('No token');
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = new Date(payload.exp * 1000);
    const now = new Date();
    
    console.log('Expires:', expiresAt);
    console.log('Now:', now);
    console.log('Expired:', now > expiresAt);
    console.log('Minutes left:', (expiresAt - now) / 1000 / 60);
}
checkToken();
```

### Step 5: Test Token Refresh

```javascript
// Force token refresh
async function testRefresh() {
    const oldToken = localStorage.getItem('hc:accessToken');
    const newToken = await window.HASHConnect.getToken();
    console.log('Token changed:', oldToken !== newToken);
    console.log('New token:', newToken ? 'Success' : 'Failed');
}
testRefresh();
```

### Step 6: Full Diagnostic Dump

```javascript
function diagnoseHashConnect() {
    console.group('🔍 HashConnect Diagnostics');
    
    // SDK State
    console.log('SDK Ready:', window.HASHConnect?.isReady());
    console.log('User:', window.HASHConnect?.getUser());
    
    // Pusher
    const pusher = window.HASHConnect?._pusherClient;
    console.log('Pusher State:', pusher?.connection?.state);
    console.log('Channels:', pusher?.allChannels()?.map(c => c.name));
    
    // Storage
    const keys = Object.keys(localStorage).filter(k => k.startsWith('hc:'));
    console.log('Storage Keys:', keys);
    keys.forEach(k => {
        const v = localStorage.getItem(k);
        console.log(`  ${k}:`, k.includes('Token') ? (v ? '✓ present' : '✗ missing') : v);
    });
    
    // Token
    const token = localStorage.getItem('hc:accessToken');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const mins = (payload.exp * 1000 - Date.now()) / 1000 / 60;
            console.log('Token Expires In:', mins.toFixed(1), 'minutes');
        } catch (e) {
            console.log('Token Parse Error:', e.message);
        }
    }
    
    console.groupEnd();
}
diagnoseHashConnect();
```

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 days)

These are low-effort, high-impact fixes.

#### 1.1 Token Expiry Check on Auto-Reconnect

**File:** `src/utils/connect.ts` (lines 220-234)

**Problem:** Auto-reconnect uses stored token without checking if expired.

**Solution:**

```typescript
// Before auto-reconnecting, check if token is still valid
if (storedAddress && storedToken && profile.address && profile.accessToken) {
    // ADD THIS CHECK
    const expired = isExpired(profile.accessToken);
    if (expired) {
        log("[HashConnect] Stored token expired, attempting refresh...");
        try {
            const newTokens = await getNewTokens();
            profile.accessToken = newTokens.accessToken;
            profile.refreshToken = newTokens.refreshToken;
            storage.setItem("hc:accessToken", newTokens.accessToken);
            storage.setItem("hc:refreshToken", newTokens.refreshToken);
        } catch (error) {
            logError("[HashConnect] Token refresh failed, starting fresh...");
            storage.clear();
            openModal();
            return;
        }
    }
    
    log("[HashConnect] Auto-reconnecting with valid credentials...");
    // ... existing auto-reconnect code
}
```

#### 1.2 Increase Reconnection Attempts

**File:** `src/utils/connect.ts` (lines 11-15)

**Change:**

```typescript
const RECONNECT_CONFIG = {
    maxAttempts: 5,        // Changed from 3 to 5
    baseDelay: 2000,
    maxDelay: 30000,
};
```

#### 1.3 Fix React isLoading Stuck State

**File:** `src/react/useHashConnect.ts`

**Add timeout fallback:**

```typescript
const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    
    // Add timeout to prevent stuck loading state
    const loadingTimeout = setTimeout(() => {
        setState((prev) => {
            if (prev.isLoading) {
                return { ...prev, isLoading: false, error: 'Connection timeout' };
            }
            return prev;
        });
    }, 30000); // 30 second timeout
    
    try {
        await window.HASHConnect.connect();
    } catch (error) {
        clearTimeout(loadingTimeout);
        setState((prev) => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error.message : "Connection failed",
        }));
    }
}, []);
```

---

### Phase 2: Core Stability (3-5 days)

#### 2.1 Proactive Token Refresh

**File:** `src/domains/UserAgent/entity.ts`

Add background monitoring to refresh tokens before expiration:

```typescript
let tokenRefreshTimer: ReturnType<typeof setInterval> | null = null;

function startTokenMonitoring() {
    if (tokenRefreshTimer) return; // Already running
    
    tokenRefreshTimer = setInterval(async () => {
        if (!isConnected || !profile.accessToken) return;
        
        try {
            const parsed = parseJwt(profile.accessToken);
            if (!parsed?.exp) return;
            
            const expiresInMinutes = (parsed.exp * 1000 - Date.now()) / 1000 / 60;
            
            // Refresh when 5 minutes remaining
            if (expiresInMinutes > 0 && expiresInMinutes < 5) {
                log('[TokenMonitor] Proactively refreshing token...');
                const newTokens = await getNewTokens();
                profile.accessToken = newTokens.accessToken;
                profile.refreshToken = newTokens.refreshToken;
                storage.setItem("hc:accessToken", newTokens.accessToken);
                storage.setItem("hc:refreshToken", newTokens.refreshToken);
                log('[TokenMonitor] ✅ Token refreshed');
            }
        } catch (error) {
            logError('[TokenMonitor] Refresh failed:', error);
        }
    }, 60000); // Check every minute
}

function stopTokenMonitoring() {
    if (tokenRefreshTimer) {
        clearInterval(tokenRefreshTimer);
        tokenRefreshTimer = null;
    }
}

// Call startTokenMonitoring() after successful auth
// Call stopTokenMonitoring() on disconnect
```

#### 2.2 Cross-Tab Synchronization

**File:** `src/domains/UserAgent/entity.ts`

Add storage event listener:

```typescript
// Add after profile initialization
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
        if (!event.key?.startsWith('hc:')) return;
        
        log('[StorageSync] Storage changed:', event.key);
        
        // Another tab disconnected
        if (event.key === 'hc:accessToken' && !event.newValue && event.oldValue) {
            log('[StorageSync] Disconnect detected from another tab');
            onDisconnect();
            return;
        }
        
        // Another tab got new token
        if (event.key === 'hc:accessToken' && event.newValue) {
            profile.accessToken = event.newValue;
            log('[StorageSync] Token synced from another tab');
        }
        
        if (event.key === 'hc:refreshToken' && event.newValue) {
            profile.refreshToken = event.newValue;
        }
    });
}
```

#### 2.3 Enhanced Reconnection with Event Re-binding

**File:** `src/utils/connect.ts`

Ensure events are properly bound after reconnection:

```typescript
// Track if events are bound
let eventsAreBound = false;

function bindChannelEvents(channel: PusherChannel, handlers: EventHandlers) {
    if (eventsAreBound) {
        // Unbind first to prevent duplicates
        channel.unbind("client-send-authorization-to-site");
        channel.unbind("client-send-unauthorization-to-site");
        channel.unbind("client-hash-pass-connect");
    }
    
    channel.bind("client-send-authorization-to-site", handlers.onAuthorization);
    channel.bind("client-send-unauthorization-to-site", handlers.onUnauthorization);
    channel.bind("client-hash-pass-connect", handlers.onHashPassConnect);
    
    eventsAreBound = true;
}

// In monitorPusherConnection, on 'connected' state:
case 'connected':
    updateConnectionStatus('connected');
    reconnectAttempts = 0;
    
    // Re-bind events after reconnection
    const channel = pusherClient.channel(channelName);
    if (channel && eventsAreBound) {
        log('[Pusher] Re-binding events after reconnection');
        bindChannelEvents(channel, eventHandlers);
    }
    break;
```

---

### Phase 3: Polish (Optional, 2-3 days)

#### 3.1 User-Facing Error Messages

Add visual feedback for connection issues in the modal.

#### 3.2 Expose Proper Disconnect Method

Add a clean disconnect method to the SDK's public API so React doesn't need hacky workarounds.

#### 3.3 Pusher Auth Endpoint Error Handling

Detect and display errors when the Pusher auth endpoint fails.

---

## Quick Reference

### Console Commands

```javascript
// Enable debug
window.HASHConnect.CONFIG.DEBUG = true;

// Check state
window.HASHConnect.isReady();
window.HASHConnect.getUser();

// Pusher state
window.HASHConnect._pusherClient?.connection.state;

// Get token (triggers refresh if expired)
await window.HASHConnect.getToken();

// Clear all storage (force re-auth)
Object.keys(localStorage).filter(k => k.startsWith('hc:')).forEach(k => localStorage.removeItem(k));
location.reload();
```

### Error Patterns

| Log Pattern | Meaning | Action |
|-------------|---------|--------|
| `[Pusher] Connection state: failed` | WebSocket failed | Check network, reload |
| `[Token] ❌ UNRECOVERABLE: 401` | Refresh token expired | User must re-authenticate |
| `[Token] ⚠️ TRANSIENT: 500` | Server error | Will retry automatically |
| `[getToken] Max failures reached` | 3 refresh failures | Auto-disconnect triggered |
| `Already connected or connecting` | Race condition guard | Clear storage, reload |

### Key Files

| Component | File |
|-----------|------|
| Pusher Connection | `src/utils/connect.ts` |
| Token Management | `src/domains/UserAgent/entity.ts` |
| Token Refresh API | `src/utils/auth.ts` |
| Storage | `src/utils/storage.ts` |
| React Hook | `src/react/useHashConnect.ts` |
| React Provider | `src/react/HashConnectProvider.tsx` |
| Modal | `src/utils/modal.ts` |

---

## Known Limitations

1. **Hybrid Architecture Complexity**
   - State exists in two places (SDK memory + React state)
   - CustomEvents bridge is fragile
   - Consider migrating to React-only architecture (see REACT_MIGRATION_PLAN.md)

2. **No Offline Support**
   - SDK requires active internet connection
   - No offline queue for operations

3. **Single User Per Tab**
   - Each tab has independent session
   - Cross-tab sync only handles disconnect, not multi-user

4. **Desktop Only**
   - This SDK is optimized for desktop browsers
   - Mobile browser behavior is not supported

5. **Private Browsing**
   - Falls back to in-memory storage
   - Session lost on page refresh in private mode

---

## Conclusion

The current hybrid architecture introduces complexity that causes stability issues. The implementation roadmap prioritizes:

1. **Phase 1 (Quick Wins):** Token validation, reconnection config, React fixes
2. **Phase 2 (Core):** Proactive refresh, cross-tab sync, reconnection improvements
3. **Phase 3 (Polish):** User-facing errors, SDK cleanup

For a more robust long-term solution, consider the React-only migration outlined in `REACT_MIGRATION_PLAN.md`.

---

**Document Version:** 2.0  
**Target Platform:** Desktop browsers only  
**Architecture:** Hybrid (Vanilla JS + React)
