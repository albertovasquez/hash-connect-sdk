# HashConnect React-Only Migration Plan

**Version:** 2.0  
**Last Updated:** December 2024  
**Purpose:** Plan for migrating HashConnect SDK from hybrid (Vanilla JS + React) to pure React architecture  
**Estimated Effort:** 1-2 weeks  
**Target Version:** 3.0.0 (Breaking Change)

---

## Status Update (v2.0 of this document)

> **Note:** This plan was originally written for a v2.0 release but the v2.0.x line was released with the hybrid architecture still in place. This updated plan targets v3.0.0 as the React-only release.

### Current State (as of December 2024)

- **SDK Version:** 2.0.2
- **Architecture:** Still hybrid (Vanilla JS + React wrapper)
- **Branch:** `refactor-react-only`

### What's Still TODO

- [ ] All items in the Phase 1-4 checklists below
- [ ] The migration has **not started** - codebase is still hybrid

### Files Currently in Codebase (to be refactored/deleted)

| File                                | Lines | Action                                |
| ----------------------------------- | ----- | ------------------------------------- |
| `src/index.ts`                      | ~80   | DELETE                                |
| `src/domains/UserAgent/entity.ts`   | ~770  | DELETE                                |
| `src/utils/modal.ts`                | ~210  | DELETE (replace with React component) |
| `src/utils/connect.ts`              | ~465  | DELETE (move to Provider)             |
| `src/eventListeners/*.ts`           | ~200  | DELETE (move to Provider)             |
| `src/react/HashConnectProvider.tsx` | ~260  | REWRITE                               |
| `src/react/useHashConnect.ts`       | ~380  | REWRITE                               |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current vs Target Architecture](#current-vs-target-architecture)
3. [Benefits of Migration](#benefits-of-migration)
4. [Migration Phases](#migration-phases)
5. [Detailed Implementation](#detailed-implementation)
6. [File Structure](#file-structure)
7. [API Changes](#api-changes)
8. [Testing Strategy](#testing-strategy)
9. [Rollback Plan](#rollback-plan)

---

## Executive Summary

### Why Migrate?

The current hybrid architecture causes stability issues due to:

- **Dual state management** - State in SDK memory AND React state
- **CustomEvent bridge** - Fragile communication between layers
- **DOM manipulation** - Modal built with `document.createElement` instead of React
- **Hacky workarounds** - Disconnect requires clicking a DOM button

### What Changes?

| Component        | Current                     | After Migration        |
| ---------------- | --------------------------- | ---------------------- |
| State Management | SDK memory + React useState | Single React Context   |
| Modal            | DOM manipulation            | React Portal component |
| Communication    | CustomEvents                | React callbacks        |
| Pusher           | Global client in SDK        | React hook wrapper     |
| Storage          | Class-based SafeStorage     | React hook             |
| QR Code          | External script + DOM       | React component        |

### Estimated Timeline

| Phase     | Duration      | Description               |
| --------- | ------------- | ------------------------- |
| Phase 1   | 2-3 days      | Core hooks and context    |
| Phase 2   | 2-3 days      | Modal and UI components   |
| Phase 3   | 1-2 days      | Integration and cleanup   |
| Phase 4   | 1-2 days      | Testing and documentation |
| **Total** | **6-10 days** |                           |

---

## Current vs Target Architecture

### Current Architecture (Hybrid)

```
┌─────────────────────────────────────────────────────────────┐
│                         React App                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           useHashConnect / HashConnectProvider       │    │
│  │  - Listens to CustomEvents                          │    │
│  │  - Maintains duplicate state                        │    │
│  │  - Hacky disconnect via DOM                         │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│              CustomEvent Bridge (fragile)                    │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │              window.HASHConnect (Vanilla JS)         │    │
│  │  - Owns Pusher client                               │    │
│  │  - Owns state (profile, sessionId, etc.)            │    │
│  │  - Creates modal via DOM manipulation               │    │
│  │  - Dispatches CustomEvents                          │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│         ┌───────────────┼───────────────┐                   │
│         ▼               ▼               ▼                   │
│      Pusher        localStorage      DOM Modal              │
└─────────────────────────────────────────────────────────────┘

Problems:
- State in two places
- CustomEvents can fail silently
- DOM modal not React-aware
- No React DevTools visibility
```

### Target Architecture (React-Only)

```
┌─────────────────────────────────────────────────────────────┐
│                         React App                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              HashConnectProvider (Context)           │    │
│  │  - Single source of truth for all state             │    │
│  │  - Provides hooks: usePusher, useAuth, useStorage   │    │
│  │  - Renders Modal component                          │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│         ┌───────────────┼───────────────┐                   │
│         ▼               ▼               ▼                   │
│    usePusher       useStorage     <HashConnectModal />      │
│    (hook)          (hook)         (React Portal)            │
│         │               │               │                   │
│         ▼               ▼               ▼                   │
│      Pusher        localStorage      React DOM              │
└─────────────────────────────────────────────────────────────┘

Benefits:
- Single state location
- Direct React state updates
- React Portal for modal
- Full React DevTools support
- Proper TypeScript types
- Easier testing
```

---

## Benefits of Migration

### 1. Eliminates State Sync Issues

**Before:**

```typescript
// SDK has its state
let profile = { address: "0x...", accessToken: "..." };

// React has duplicate state
const [userAddress, setUserAddress] = useState(null);

// Must keep in sync via events - can fail!
```

**After:**

```typescript
// Single source of truth
const [authState, setAuthState] = useState({
  address: null,
  accessToken: null,
  // ...
});
```

### 2. Removes CustomEvent Bridge

**Before:**

```typescript
// SDK dispatches event
document.dispatchEvent(new CustomEvent('hash-connect-event', { detail: {...} }));

// React listens (can miss events!)
document.addEventListener('hash-connect-event', handler);
```

**After:**

```typescript
// Direct state update
setAuthState((prev) => ({ ...prev, isConnected: true, address }));
```

### 3. Clean Disconnect

**Before:**

```typescript
// Hacky - relies on DOM element existing
const btn = document.getElementById("hash-connect-disconnect-btn");
if (btn) btn.click();
```

**After:**

```typescript
// Clean function call
const disconnect = useCallback(() => {
  pusherClient?.disconnect();
  clearStorage();
  setAuthState(initialState);
}, []);
```

### 4. React Modal Component

**Before:**

```typescript
// DOM manipulation
const modal = document.createElement("div");
modal.innerHTML = `<div id="hash-connect-modal">...</div>`;
document.body.appendChild(modal);
```

**After:**

```tsx
// React Portal
const HashConnectModal = () =>
  createPortal(
    <div className="hash-connect-modal">
      <QRCode value={sessionUrl} />
      <ConnectionStatus />
    </div>,
    document.body
  );
```

### 5. Better Developer Experience

- Full React DevTools support
- Proper TypeScript inference
- Easier unit testing with React Testing Library
- No global `window.HASHConnect` pollution
- Tree-shakeable if not used

---

## Migration Phases

### Phase 1: Core Hooks (2-3 days)

Create foundational hooks that encapsulate external dependencies.

#### 1.1 `useStorage` Hook

```typescript
// src/react/hooks/useStorage.ts

interface UseStorageReturn {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
}

export function useStorage(): UseStorageReturn {
  const isAvailable = useMemo(() => {
    try {
      localStorage.setItem("__test__", "test");
      localStorage.removeItem("__test__");
      return true;
    } catch {
      return false;
    }
  }, []);

  const fallbackRef = useRef(new Map<string, string>());

  const getItem = useCallback(
    (key: string) => {
      if (isAvailable) {
        return localStorage.getItem(key);
      }
      return fallbackRef.current.get(key) ?? null;
    },
    [isAvailable]
  );

  const setItem = useCallback(
    (key: string, value: string) => {
      if (isAvailable) {
        localStorage.setItem(key, value);
      } else {
        fallbackRef.current.set(key, value);
      }
    },
    [isAvailable]
  );

  // ... removeItem, clear

  return { getItem, setItem, removeItem, clear };
}
```

#### 1.2 `usePusher` Hook

```typescript
// src/react/hooks/usePusher.ts

interface UsePusherOptions {
  key: string;
  cluster: string;
  authEndpoint: string;
}

interface UsePusherReturn {
  client: PusherClient | null;
  connectionState: ConnectionState;
  subscribe: (channelName: string) => PusherChannel | null;
  unsubscribe: (channelName: string) => void;
  disconnect: () => void;
}

export function usePusher(options: UsePusherOptions): UsePusherReturn {
  const [client, setClient] = useState<PusherClient | null>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("initialized");

  useEffect(() => {
    // Load Pusher script and initialize
    const initPusher = async () => {
      await loadScript(PUSHER_SCRIPT_URL);

      const pusher = new window.Pusher(options.key, {
        cluster: options.cluster,
        authEndpoint: options.authEndpoint,
      });

      pusher.connection.bind("state_change", (states) => {
        setConnectionState(states.current);
      });

      setClient(pusher);
    };

    initPusher();

    return () => {
      client?.disconnect();
    };
  }, [options.key, options.cluster, options.authEndpoint]);

  const subscribe = useCallback(
    (channelName: string) => {
      return client?.subscribe(channelName) ?? null;
    },
    [client]
  );

  const unsubscribe = useCallback(
    (channelName: string) => {
      client?.unsubscribe(channelName);
    },
    [client]
  );

  const disconnect = useCallback(() => {
    client?.disconnect();
  }, [client]);

  return { client, connectionState, subscribe, unsubscribe, disconnect };
}
```

#### 1.3 `useTokenRefresh` Hook

```typescript
// src/react/hooks/useTokenRefresh.ts

interface UseTokenRefreshOptions {
  accessToken: string | null;
  refreshToken: string | null;
  address: string | null;
  onTokensRefreshed: (tokens: {
    accessToken: string;
    refreshToken: string;
  }) => void;
  onRefreshFailed: (error: Error) => void;
}

export function useTokenRefresh(options: UseTokenRefreshOptions) {
  const {
    accessToken,
    refreshToken,
    address,
    onTokensRefreshed,
    onRefreshFailed,
  } = options;

  // Proactive refresh timer
  useEffect(() => {
    if (!accessToken) return;

    const checkInterval = setInterval(async () => {
      const payload = parseJwt(accessToken);
      if (!payload?.exp) return;

      const expiresInMinutes = (payload.exp * 1000 - Date.now()) / 1000 / 60;

      if (expiresInMinutes > 0 && expiresInMinutes < 5) {
        try {
          const newTokens = await refreshTokens(refreshToken, address);
          onTokensRefreshed(newTokens);
        } catch (error) {
          onRefreshFailed(error as Error);
        }
      }
    }, 60000);

    return () => clearInterval(checkInterval);
  }, [accessToken, refreshToken, address, onTokensRefreshed, onRefreshFailed]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (!refreshToken || !address) {
      throw new Error("Missing credentials");
    }
    return refreshTokens(refreshToken, address);
  }, [refreshToken, address]);

  return { refresh };
}
```

---

### Phase 2: UI Components (2-3 days)

#### 2.1 `HashConnectModal` Component

```tsx
// src/react/components/HashConnectModal.tsx

interface HashConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionUrl: string;
  connectionState: ConnectionState;
  disclaimer?: string;
}

export const HashConnectModal: React.FC<HashConnectModalProps> = ({
  isOpen,
  onClose,
  sessionUrl,
  connectionState,
  disclaimer,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="hash-connect-overlay" onClick={onClose}>
      <div className="hash-connect-modal" onClick={(e) => e.stopPropagation()}>
        <button className="hash-connect-close" onClick={onClose}>
          ✕
        </button>

        <ConnectionStatusIndicator
          status={connectionState}
          onClick={() => window.location.reload()}
        />

        <div className="hash-connect-content">
          <h1>Hash Pass</h1>
          <h2>Connect</h2>

          <QRCodeDisplay value={sessionUrl} />

          {disclaimer && (
            <div className="hash-connect-disclaimer">{disclaimer}</div>
          )}
        </div>

        <Logo />
      </div>
    </div>,
    document.body
  );
};
```

#### 2.2 `QRCodeDisplay` Component

```tsx
// src/react/components/QRCodeDisplay.tsx

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 130,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    // Clear previous QR code
    canvasRef.current.innerHTML = "";

    // Generate new QR code
    new QRCode(canvasRef.current, {
      text: value,
      width: size,
      height: size,
      colorDark: "#000000",
      colorLight: "#ffffff",
    });
  }, [value, size]);

  return <div ref={canvasRef} className="hash-connect-qrcode" />;
};
```

#### 2.3 `ConnectionStatusIndicator` Component

```tsx
// src/react/components/ConnectionStatusIndicator.tsx

interface ConnectionStatusIndicatorProps {
  status: ConnectionState;
  onClick?: () => void;
}

const STATUS_CONFIG = {
  connecting: { className: "status-connecting", text: "Connecting..." },
  connected: { className: "status-connected", text: "Connected" },
  disconnected: { className: "status-disconnected", text: "Disconnected" },
  failed: { className: "status-failed", text: "Connection Failed" },
  unavailable: { className: "status-reconnecting", text: "Reconnecting..." },
};

export const ConnectionStatusIndicator: React.FC<
  ConnectionStatusIndicatorProps
> = ({ status, onClick }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.connecting;

  return (
    <div className="hash-connect-status-indicator" onClick={onClick}>
      <span className={`hash-connect-status-dot ${config.className}`} />
      <span className="hash-connect-status-text">{config.text}</span>
    </div>
  );
};
```

---

### Phase 3: Main Provider (1-2 days)

#### 3.1 `HashConnectProvider` (Complete Rewrite)

```tsx
// src/react/HashConnectProvider.tsx

interface AuthState {
  isConnected: boolean;
  isLoading: boolean;
  isModalOpen: boolean;
  userAddress: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  signature: string | null;
  clubId: string | null;
  clubName: string | null;
  sessionId: string | null;
  error: string | null;
}

interface HashConnectContextType extends AuthState {
  connect: () => Promise<void>;
  disconnect: () => void;
  getToken: () => Promise<string | null>;
  getClubId: () => string | null;
  getClubName: () => string | null;
  connectionState: ConnectionState;
}

const initialState: AuthState = {
  isConnected: false,
  isLoading: false,
  isModalOpen: false,
  userAddress: null,
  accessToken: null,
  refreshToken: null,
  signature: null,
  clubId: null,
  clubName: null,
  sessionId: null,
  error: null,
};

export const HashConnectProvider: React.FC<HashConnectProviderProps> = ({
  children,
  debug = false,
  disclaimer,
  config = DEFAULT_CONFIG,
}) => {
  const [state, setState] = useState<AuthState>(initialState);
  const storage = useStorage();

  const {
    client: pusherClient,
    connectionState,
    subscribe,
    unsubscribe,
    disconnect: disconnectPusher,
  } = usePusher({
    key: config.pusherKey,
    cluster: config.pusherCluster,
    authEndpoint: `${config.authEndpoint}/auth/pusher`,
  });

  // Load stored session on mount
  useEffect(() => {
    const storedToken = storage.getItem("hc:accessToken");
    const storedAddress = storage.getItem("hc:address");

    if (storedToken && storedAddress) {
      setState((prev) => ({
        ...prev,
        accessToken: storedToken,
        refreshToken: storage.getItem("hc:refreshToken"),
        userAddress: storedAddress,
        signature: storage.getItem("hc:signature"),
        clubId: storage.getItem("hc:clubId"),
        clubName: storage.getItem("hc:clubName"),
        isConnected: true,
      }));
    }
  }, [storage]);

  // Cross-tab sync
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key?.startsWith("hc:")) return;

      if (event.key === "hc:accessToken" && !event.newValue && event.oldValue) {
        // Another tab disconnected
        setState(initialState);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Token refresh
  useTokenRefresh({
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    address: state.userAddress,
    onTokensRefreshed: (tokens) => {
      setState((prev) => ({
        ...prev,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }));
      storage.setItem("hc:accessToken", tokens.accessToken);
      storage.setItem("hc:refreshToken", tokens.refreshToken);
    },
    onRefreshFailed: (error) => {
      if (isUnrecoverableError(error)) {
        disconnect();
      }
    },
  });

  // Connect function
  const connect = useCallback(async () => {
    if (state.isConnected || state.isLoading) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Generate new session
      const sessionId = Math.random().toString(36).slice(2);
      const channelName = `private-hc-${sessionId}`;

      setState((prev) => ({
        ...prev,
        sessionId,
        isModalOpen: true,
      }));

      // Subscribe to session channel
      const channel = subscribe(channelName);
      if (!channel) throw new Error("Failed to subscribe to channel");

      // Bind event handlers
      channel.bind("client-hash-pass-connect", handleHashPassConnect);
      channel.bind("client-send-authorization-to-site", handleAuthorization);
      channel.bind(
        "client-send-unauthorization-to-site",
        handleUnauthorization
      );
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Connection failed",
      }));
    }
  }, [state.isConnected, state.isLoading, subscribe]);

  // Disconnect function
  const disconnect = useCallback(() => {
    // Unsubscribe from channels
    if (state.sessionId) {
      unsubscribe(`private-hc-${state.sessionId}`);
    }
    if (state.userAddress) {
      unsubscribe(`private-${state.userAddress}`);
    }

    // Clear storage
    storage.removeItem("hc:sessionId");
    storage.removeItem("hc:accessToken");
    storage.removeItem("hc:refreshToken");
    storage.removeItem("hc:address");
    storage.removeItem("hc:signature");
    storage.removeItem("hc:clubId");
    storage.removeItem("hc:clubName");

    // Reset state
    setState(initialState);
  }, [state.sessionId, state.userAddress, unsubscribe, storage]);

  // Get token with auto-refresh
  const getToken = useCallback(async () => {
    if (!state.accessToken) return null;

    const expired = isExpired(state.accessToken);
    if (!expired) return state.accessToken;

    // Refresh token
    try {
      const newTokens = await refreshTokens(
        state.refreshToken,
        state.userAddress
      );
      setState((prev) => ({
        ...prev,
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      }));
      storage.setItem("hc:accessToken", newTokens.accessToken);
      storage.setItem("hc:refreshToken", newTokens.refreshToken);
      return newTokens.accessToken;
    } catch (error) {
      disconnect();
      return null;
    }
  }, [
    state.accessToken,
    state.refreshToken,
    state.userAddress,
    storage,
    disconnect,
  ]);

  // Event handlers
  const handleHashPassConnect = useCallback(
    (data: { address: string; signature: string }) => {
      // Subscribe to user's private channel
      const userChannel = subscribe(`private-${data.address}`);
      if (!userChannel) return;

      userChannel.bind("pusher:subscription_succeeded", () => {
        // Send authorization request to mobile app
        userChannel.trigger("client-request-user-to-authorize-from-site", {
          signature: data.signature,
          channel: `private-hc-${state.sessionId}`,
          domain: window.location.hostname,
          name: document.title || "Unknown site",
        });
      });

      setState((prev) => ({
        ...prev,
        userAddress: data.address,
        signature: data.signature,
      }));
    },
    [subscribe, state.sessionId]
  );

  const handleAuthorization = useCallback(
    (data: AuthorizationData) => {
      // Store tokens
      storage.setItem("hc:accessToken", data.accessToken);
      storage.setItem("hc:refreshToken", data.refreshToken);
      storage.setItem("hc:address", data.address);
      storage.setItem("hc:clubId", data.clubId || "");
      storage.setItem("hc:clubName", data.clubName || "");

      // Update state
      setState((prev) => ({
        ...prev,
        isConnected: true,
        isLoading: false,
        isModalOpen: false,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        userAddress: data.address,
        clubId: data.clubId,
        clubName: data.clubName,
      }));
    },
    [storage]
  );

  const handleUnauthorization = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const sessionUrl = state.sessionId ? `hc:${state.sessionId}` : "";

  return (
    <HashConnectContext.Provider
      value={{
        ...state,
        connect,
        disconnect,
        getToken,
        getClubId: () => state.clubId,
        getClubName: () => state.clubName,
        connectionState,
      }}
    >
      {children}

      <HashConnectModal
        isOpen={state.isModalOpen}
        onClose={() =>
          setState((prev) => ({
            ...prev,
            isModalOpen: false,
            isLoading: false,
          }))
        }
        sessionUrl={sessionUrl}
        connectionState={connectionState}
        disclaimer={disclaimer}
      />
    </HashConnectContext.Provider>
  );
};
```

---

### Phase 4: Cleanup and Testing (1-2 days)

#### 4.1 Files to Delete

```
src/
├── utils/
│   ├── modal.ts          # DELETE - replaced by React component
│   ├── connect.ts         # DELETE - logic moved to Provider
│   └── storage.ts         # KEEP - can be shared, or delete if using hook
├── eventListeners/
│   ├── handleHashConnect.ts      # DELETE - moved to Provider
│   ├── handleHashDisconnect.ts   # DELETE - moved to Provider
│   └── setupUserSubscription.ts  # DELETE - moved to Provider
├── domains/
│   └── UserAgent/
│       ├── entity.ts      # DELETE - logic moved to Provider
│       └── index.ts       # DELETE - entry point removed
└── index.ts               # DELETE - no more vanilla JS entry
```

#### 4.2 Files to Keep/Modify

```
src/
├── react/
│   ├── index.ts                    # MODIFY - new exports
│   ├── HashConnectProvider.tsx     # REPLACE - complete rewrite
│   ├── useHashConnect.ts           # MODIFY - simplified hook
│   ├── hooks/
│   │   ├── useStorage.ts           # NEW
│   │   ├── usePusher.ts            # NEW
│   │   └── useTokenRefresh.ts      # NEW
│   └── components/
│       ├── HashConnectModal.tsx    # NEW
│       ├── QRCodeDisplay.tsx       # NEW
│       └── ConnectionStatus.tsx    # NEW
├── utils/
│   ├── jwt.ts             # KEEP - token parsing utilities
│   └── auth.ts            # KEEP - token refresh API calls
├── types/                 # KEEP - TypeScript types
├── config.ts              # KEEP - configuration
└── styles.css             # KEEP - can be imported by React components
```

---

## File Structure

### Before (Hybrid)

```
src/
├── index.ts                          # Vanilla JS entry
├── config.ts
├── styles.css
├── types/
│   ├── pusher.ts
│   ├── qrcode.ts
│   └── user.ts
├── utils/
│   ├── auth.ts
│   ├── connect.ts                    # Complex connection logic
│   ├── jwt.ts
│   ├── modal.ts                      # DOM manipulation
│   ├── storage.ts
│   └── translation.ts
├── domains/
│   └── UserAgent/
│       ├── entity.ts                 # Main SDK logic (500+ lines)
│       └── index.ts
├── eventListeners/
│   ├── handleHashConnect.ts
│   ├── handleHashDisconnect.ts
│   └── setupUserSubscription.ts
└── react/
    ├── index.ts
    ├── HashConnectProvider.tsx       # Thin wrapper
    └── useHashConnect.ts             # Thin wrapper
```

### After (React-Only)

```
src/
├── index.ts                          # React-only entry
├── config.ts
├── styles.css
├── types/
│   ├── pusher.ts
│   ├── qrcode.ts
│   └── user.ts
├── utils/
│   ├── auth.ts                       # Token refresh API
│   ├── jwt.ts                        # Token parsing
│   └── script-loader.ts              # Load external scripts
└── react/
    ├── index.ts                      # Main exports
    ├── HashConnectProvider.tsx       # Complete provider (~300 lines)
    ├── HashConnectContext.ts         # Context definition
    ├── hooks/
    │   ├── index.ts
    │   ├── useStorage.ts             # Storage hook
    │   ├── usePusher.ts              # Pusher hook
    │   ├── useTokenRefresh.ts        # Token refresh hook
    │   └── useHashConnect.ts         # Convenience hook
    └── components/
        ├── index.ts
        ├── HashConnectModal.tsx      # Modal with Portal
        ├── QRCodeDisplay.tsx         # QR code component
        └── ConnectionStatus.tsx      # Status indicator
```

---

## API Changes

### Before

```typescript
// Provider usage
import { HashConnectProvider } from "@hashpass/connect/react";

<HashConnectProvider debug={true} disclaimer="...">
  <App />
</HashConnectProvider>;

// Hook usage
import { useHashConnect } from "@hashpass/connect/react";

const { isConnected, connect, disconnect, getToken } = useHashConnect();

// Also has global window.HASHConnect for vanilla JS
```

### After

```typescript
// Provider usage - SAME API
import { HashConnectProvider } from "@hashpass/connect";

<HashConnectProvider debug={true} disclaimer="...">
  <App />
</HashConnectProvider>;

// Hook usage - SAME API
import { useHashConnect } from "@hashpass/connect";

const { isConnected, connect, disconnect, getToken } = useHashConnect();

// NO window.HASHConnect - React only
```

### Breaking Changes

1. **No vanilla JS support** - `window.HASHConnect` removed
2. **Package exports change** - No more `/react` sub-path
3. **Peer dependency** - React now required, not optional

### package.json Changes

```json
{
  "name": "@hashpass/connect",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "peerDependencies": {
    "react": "^17.0.0 || ^18.0.0 || ^19.0.0"
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// Test hooks in isolation
describe("useStorage", () => {
  it("should fall back to memory when localStorage unavailable", () => {
    // Mock localStorage to throw
    const { result } = renderHook(() => useStorage());
    result.current.setItem("key", "value");
    expect(result.current.getItem("key")).toBe("value");
  });
});

describe("usePusher", () => {
  it("should connect and track state", async () => {
    const { result } = renderHook(() => usePusher(config));
    await waitFor(() => {
      expect(result.current.connectionState).toBe("connected");
    });
  });
});
```

### Integration Tests

```typescript
describe("HashConnectProvider", () => {
  it("should complete full auth flow", async () => {
    render(
      <HashConnectProvider>
        <TestComponent />
      </HashConnectProvider>
    );

    // Click connect
    fireEvent.click(screen.getByText("Connect"));

    // Modal should open
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Simulate Pusher event
    mockPusherEvent("client-send-authorization-to-site", mockAuthData);

    // Should be connected
    await waitFor(() => {
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });
  });
});
```

---

## Rollback Plan

If migration causes issues:

1. **Keep old code in separate branch** - Don't delete until stable
2. **Version bump to 2.0** - Clear breaking change signal
3. **Maintain 1.x for bug fixes** - If needed
4. **Document migration path** - For existing users

### Version Strategy

**Updated for v2 (December 2024):**

```
1.0.x - Legacy (deprecated)
2.0.x - Current hybrid architecture (maintenance only after v3 release)
3.0.0 - React-only architecture (this migration - BREAKING CHANGE)
```

**Note:** The original plan assumed v2.0.0 would be the React-only version, but v2.0.x was released with the hybrid architecture. The React-only migration will now be v3.0.0.

---

## Checklist

### Pre-Migration

- [ ] Ensure all current tests pass
- [ ] Document current API surface
- [ ] Create migration branch (`refactor-react-only`)
- [ ] Set up test environment
- [ ] **NEW:** Audit current v2.0.x codebase for undocumented features
- [ ] **NEW:** Document breaking changes for CHANGELOG

### Phase 1: Core Hooks

- [ ] Implement `useStorage` hook
- [ ] Implement `usePusher` hook
- [ ] Implement `useTokenRefresh` hook
- [ ] **NEW:** Implement `useScriptLoader` hook (for Pusher/QRCode CDN scripts)
- [ ] Unit test all hooks
- [ ] **NEW:** Add SSR safety checks (`typeof window !== 'undefined'`)

### Phase 2: UI Components

- [ ] Implement `HashConnectModal` (React Portal)
- [ ] Implement `QRCodeDisplay` component
- [ ] Implement `ConnectionStatusIndicator` component
- [ ] Port CSS styles
- [ ] Test modal rendering
- [ ] **NEW:** Add `'use client'` directive for Next.js App Router support
- [ ] **NEW:** Test modal with React 17, 18, and 19

### Phase 3: Provider

- [ ] Rewrite `HashConnectProvider`
- [ ] Update `useHashConnect` hook
- [ ] Integration test full flow
- [ ] Test cross-tab sync
- [ ] Test token refresh
- [ ] **NEW:** Add Error Boundary recommendations to docs
- [ ] **NEW:** Test auto-reconnect on page refresh
- [ ] **NEW:** Test disconnect cleanup (no memory leaks)

### Phase 4: Cleanup

- [ ] Delete old vanilla JS files:
  - [ ] `src/index.ts`
  - [ ] `src/domains/UserAgent/entity.ts`
  - [ ] `src/domains/UserAgent/index.ts`
  - [ ] `src/utils/modal.ts`
  - [ ] `src/utils/connect.ts`
  - [ ] `src/eventListeners/handleHashConnect.ts`
  - [ ] `src/eventListeners/handleHashDisconnect.ts`
  - [ ] `src/eventListeners/setupUserSubscription.ts`
- [ ] Update package.json:
  - [ ] Change exports to single entry point
  - [ ] Make React a required peer dependency (not optional)
  - [ ] Update version to 3.0.0
- [ ] **NEW:** Consolidate webpack configs (delete `webpack.react.config.js`)
- [ ] Update TypeScript types:
  - [ ] Remove `window.HASHConnect` from `types/global.d.ts`
  - [ ] Export proper React types
- [ ] Update documentation:
  - [ ] Update README.md
  - [ ] Update REACT.md (or merge into README)
  - [ ] **NEW:** Create MIGRATION_GUIDE.md (v2 → v3)
  - [ ] **NEW:** Create NEXT_JS_GUIDE.md

### Post-Migration

- [ ] Full regression testing
- [ ] Performance comparison
- [ ] Bundle size comparison
- [ ] Update CHANGELOG with breaking changes
- [ ] **NEW:** Test with Create React App
- [ ] **NEW:** Test with Next.js (Pages Router)
- [ ] **NEW:** Test with Next.js (App Router)
- [ ] **NEW:** Test with Vite
- [ ] Release 3.0.0
- [ ] **NEW:** Publish v2.x maintenance release notes

---

## Additional Considerations (Added for v3)

### SSR/Next.js Support

The React-only SDK must support Server-Side Rendering (SSR) for Next.js users.

#### Key Requirements

1. **Client-only directive** for Next.js App Router:

```tsx
// src/react/HashConnectProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
// ...
```

2. **SSR safety checks** in all hooks:

```typescript
// src/react/hooks/useStorage.ts
export function useStorage(): UseStorageReturn {
  const isClient = typeof window !== "undefined";

  const getItem = useCallback(
    (key: string) => {
      if (!isClient) return null;
      // ...
    },
    [isClient]
  );

  // ...
}
```

3. **Lazy loading** for external scripts:

```typescript
// Only load Pusher/QRCode scripts on client side
useEffect(() => {
  if (typeof window === "undefined") return;
  // Load scripts...
}, []);
```

#### Usage in Next.js App Router

```tsx
// app/providers.tsx
"use client";

import { HashConnectProvider } from "@hashpass/connect";

export function Providers({ children }: { children: React.ReactNode }) {
  return <HashConnectProvider>{children}</HashConnectProvider>;
}
```

```tsx
// app/layout.tsx
import { Providers } from "./providers";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

### External Script Loading Strategy

The current SDK loads Pusher and QRCode libraries from CDN. Options for v3:

#### Option A: Keep CDN Loading (Recommended)

- **Pros:** Smaller bundle size, cached across sites
- **Cons:** Requires script loading logic

```typescript
// src/react/hooks/useScriptLoader.ts
export function useScriptLoader(src: string): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already loaded
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      setLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => setLoaded(true);
    script.onerror = () => console.error(`Failed to load: ${src}`);
    document.head.appendChild(script);

    return () => {
      // Don't remove - may be used elsewhere
    };
  }, [src]);

  return loaded;
}
```

#### Option B: Bundle Dependencies

- **Pros:** No external requests, works offline
- **Cons:** Larger bundle size (~50KB added)

```json
// package.json
{
  "dependencies": {
    "pusher-js": "^8.0.0",
    "qrcode": "^1.5.0"
  }
}
```

**Recommendation:** Keep CDN loading (Option A) for v3.0.0, consider Option B for v3.1.0.

---

### Error Handling

Add error boundaries documentation for users:

```tsx
// Example error boundary for HashConnect
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class HashConnectErrorBoundary extends Component<Props, State> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("HashConnect Error:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Connection unavailable</div>;
    }
    return this.props.children;
  }
}
```

---

### Migration Guide for Existing Users

#### From v2.x (Hybrid) to v3.0 (React-Only)

**Breaking Changes:**

1. **No more `window.HASHConnect`**

   ```typescript
   // ❌ v2.x - No longer works
   window.HASHConnect.connect();

   // ✅ v3.0 - Use hook
   const { connect } = useHashConnect();
   ```

2. **Import path change**

   ```typescript
   // ❌ v2.x
   import { useHashConnect } from "@hashpass/connect/react";

   // ✅ v3.0
   import { useHashConnect } from "@hashpass/connect";
   ```

3. **Provider is required**

   ```tsx
   // ✅ v3.0 - Must wrap app with provider
   import { HashConnectProvider } from "@hashpass/connect";

   function App() {
     return (
       <HashConnectProvider>
         <MyApp />
       </HashConnectProvider>
     );
   }
   ```

4. **React is required peer dependency**
   ```bash
   # React must be installed (not optional)
   npm install react @hashpass/connect
   ```

---

## Conclusion

Migrating to a React-only architecture will:

1. **Eliminate ~40% of stability issues** by removing the hybrid bridge
2. **Simplify the codebase** from ~1500 lines to ~800 lines
3. **Improve developer experience** with proper React patterns
4. **Enable easier testing** with React Testing Library
5. **Reduce bundle size** by removing duplicate logic

The trade-off is dropping vanilla JS support, which is acceptable given the React-only requirement.

**Recommended Timeline:** Start after Phase 1 quick fixes from the Stability Guide are deployed and verified.

---

**Document Version:** 2.0  
**Created:** December 2024  
**Last Updated:** December 2024  
**Status:** Planning (Updated for v3.0.0 target)

### Change Log

| Version | Date     | Changes                                                                                                          |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| 1.0     | Dec 2024 | Initial plan                                                                                                     |
| 2.0     | Dec 2024 | Updated for v3.0 target, added SSR/Next.js support, script loading strategy, migration guide, expanded checklist |
