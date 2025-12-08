# HashConnect SDK - Complete React Integration Guide

**Version:** 3.1.0  
**Last Updated:** December 8, 2025  
**Target Audience:** React developers and AI assistants integrating HashConnect authentication

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Basic Integration](#basic-integration)
4. [Advanced Patterns](#advanced-patterns)
5. [API Reference](#api-reference)
6. [Best Practices](#best-practices)
7. [Common Pitfalls](#common-pitfalls)
8. [TypeScript Usage](#typescript-usage)
9. [Error Handling](#error-handling)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)
12. [Production Checklist](#production-checklist)

---

## Overview

### What is HashConnect?

HashConnect SDK provides secure wallet authentication for web applications via QR code scanning. Users scan a QR code with their mobile wallet app, and your web app receives authenticated access.

### Architecture

```
┌─────────────────┐
│   Your React    │
│   Application   │
└────────┬────────┘
         │
         ├─── useHashConnect() hook
         │    (recommended)
         │
         └─── HashConnectProvider + Context
              (for complex apps)

         ↓ Both use ↓

┌─────────────────┐
│  Core SDK       │
│  (Vanilla JS)   │
└────────┬────────┘
         │
         ├─── Pusher WebSocket
         ├─── QR Code Modal
         └─── Local Storage
```

### Key Features (v3.1+)

- ✅ **`isInitialized` state** - Eliminates setTimeout workarounds
- ✅ **Non-React token access** - Use SDK in API interceptors
- ✅ **Auth state callbacks** - React to connection changes
- ✅ **Integrated logging** - Send SDK logs to your logger
- ✅ Automatic token refresh (proactive, 5 min before expiry)
- ✅ Cross-tab synchronization
- ✅ Network resilience (5 reconnection attempts)
- ✅ TypeScript support
- ✅ Zero breaking changes from v3.0

---

## Installation

```bash
npm install @hashpass/connect
```

**Peer Dependencies:** React 16.8+ (hooks support)

**CDN Alternative:**

```html
<script src="https://unpkg.com/@hashpass/connect@2.0.1/dist/hash-connect.js"></script>
```

---

## Basic Integration

### Option 1: Simple Hook (Recommended)

Use this for most applications. Each component gets its own hook instance but shares the same underlying SDK state.

```tsx
import { useHashConnect } from "@hashpass/connect";

function MyApp() {
  const {
    isInitialized, // NEW in v3.1.0
    isConnected,
    isLoading,
    userAddress,
    clubId,
    clubName,
    error,
    connect,
    disconnect,
    getToken,
  } = useHashConnect({
    debug: process.env.NODE_ENV === "development",
  });

  // Wait for SDK to check localStorage
  if (!isInitialized) {
    return <div>Checking session...</div>;
  }

  if (isLoading) {
    return <div>Connecting...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!isConnected) {
    return <button onClick={connect}>Connect Wallet</button>;
  }

  return (
    <div>
      <p>Connected: {userAddress}</p>
      {clubId && (
        <p>
          Club: {clubName} (ID: {clubId})
        </p>
      )}
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}
```

### Option 2: Context Provider (For App-Wide State)

Use this when you need to access auth state deeply nested in your component tree.

```tsx
// App.tsx
import { HashConnectProvider } from "@hashpass/connect";

function App() {
  return (
    <HashConnectProvider
      debug={process.env.NODE_ENV === "development"}
      onAuthStateChange={(event) => {
        // NEW in v3.1.0: React to auth changes
        console.log("Auth event:", event.type);
      }}
    >
      <YourRoutes />
    </HashConnectProvider>
  );
}

// AnyComponent.tsx
import { useHashConnectContext } from "@hashpass/connect";

function AnyComponent() {
  const { isConnected, userAddress, disconnect } = useHashConnectContext();

  return (
    <div>
      {isConnected && (
        <div>
          <span>Wallet: {userAddress}</span>
          <button onClick={disconnect}>Logout</button>
        </div>
      )}
    </div>
  );
}
```

---

## Advanced Patterns

### NEW in v3.1.0: Proper Initialization Check

The `isInitialized` state eliminates the need for setTimeout workarounds:

```tsx
import { useHashConnect } from "@hashpass/connect";

function App() {
  const { isInitialized, isConnected } = useHashConnect();

  // SDK is still checking localStorage for existing session
  if (!isInitialized) {
    return <Spinner />;
  }

  // Now we know for sure if user is authenticated or not
  if (!isConnected) {
    return <LoginScreen />;
  }

  return <Dashboard />;
}
```

**Why this is better:**

- No arbitrary timeout guessing
- Proper loading states
- Instant UI updates after check completes

### NEW in v3.1.0: Non-React Token Access

Use SDK functions outside React components (API interceptors, utility functions):

```tsx
// api.ts (non-React file)
import { getAccessToken, getAuthState } from "@hashpass/connect";

// Setup API interceptor
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken(); // Auto-refreshes if expired
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Quick synchronous check (no refresh attempt)
function requireAuth() {
  const { isAuthenticated, userAddress } = getAuthState();
  if (!isAuthenticated) {
    throw new Error("Not authenticated");
  }
  return userAddress;
}
```

**Available functions:**

- `getAccessToken()` - Async, validates and refreshes if needed
- `getAuthState()` - Sync, returns current state from localStorage

### NEW in v3.1.0: Auth State Change Callbacks

React to authentication events for routing, analytics, or UI updates:

```tsx
<HashConnectProvider
  onAuthStateChange={(event) => {
    // event.type: 'connected' | 'disconnected' | 'refreshed'

    if (event.type === "connected") {
      analytics.track("user_connected", {
        address: event.userAddress,
        clubId: event.clubId,
      });
      router.push("/dashboard");
    }

    if (event.type === "disconnected") {
      analytics.track("user_disconnected");
      router.push("/login");
    }

    if (event.type === "refreshed") {
      // Token was refreshed silently in background
      console.log("Token refreshed");
    }
  }}
>
  <App />
</HashConnectProvider>
```

**Event structure:**

```typescript
{
  type: "connected" | "disconnected" | "refreshed";
  isConnected: boolean;
  userAddress: string | null;
  clubId: string | null;
}
```

### NEW in v3.1.0: Integrated Logging

Send SDK logs to your logging system (Sentry, Datadog, etc.):

```tsx
import { logger } from "./logger"; // Your app's logger

<HashConnectProvider
  onLog={(event) => {
    logger.debug({
      source: "hashconnect",
      message: event.message,
      timestamp: event.timestamp,
    });
  }}
>
  <App />
</HashConnectProvider>;
```

**Important:** When `onLog` is provided, console logging is automatically suppressed (even if `debug={true}`).

### 1. Protected Routes

```tsx
import { useHashConnect } from "@hashpass/connect";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isInitialized, isConnected, isLoading } = useHashConnect();

  // Wait for SDK to check localStorage
  if (!isInitialized || isLoading) {
    return <LoadingSpinner />;
  }

  if (!isConnected) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Usage
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>;
```

### 2. Authenticated API Requests

```tsx
import { useHashConnect } from "@hashpass/connect/react";

function useAuthenticatedFetch() {
  const { getToken, disconnect } = useHashConnect();

  const authFetch = async <T,>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const token = await getToken();

    if (!token) {
      throw new Error("No authentication token available");
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    // Handle token expiry
    if (response.status === 401) {
      disconnect(); // Force re-authentication
      throw new Error("Session expired - please reconnect");
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  };

  return authFetch;
}

// Usage
function UserProfile() {
  const authFetch = useAuthenticatedFetch();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    authFetch<UserProfile>("https://api.example.com/profile")
      .then(setProfile)
      .catch(console.error);
  }, []);

  return <div>{profile?.name}</div>;
}
```

### 3. Automatic Reconnection on Mount

```tsx
function App() {
  const { isConnected, connect } = useHashConnect({ debug: true });
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  useEffect(() => {
    // The SDK automatically reconnects if there's a valid stored session
    // Just check if we're already connected after mount
    const timer = setTimeout(() => {
      setHasCheckedSession(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!hasCheckedSession) {
    return <div>Checking session...</div>;
  }

  if (!isConnected) {
    return <button onClick={connect}>Connect</button>;
  }

  return <Dashboard />;
}
```

### 4. Token Refresh Handling

```tsx
function useAutoRefreshToken() {
  const { getToken, isConnected } = useHashConnect();
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isConnected) return;

    // SDK automatically refreshes tokens proactively (5 min before expiry)
    // This is just for manual refresh on demand
    const refreshToken = async () => {
      try {
        const token = await getToken();
        tokenRef.current = token;
      } catch (error) {
        console.error("Token refresh failed:", error);
      }
    };

    refreshToken();
    // Refresh every 10 minutes as a backup (SDK handles this automatically)
    const interval = setInterval(refreshToken, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isConnected, getToken]);

  return tokenRef.current;
}
```

### 5. Multi-Step Authentication Flow

```tsx
function AuthFlow() {
  const { connect, isConnected, isLoading, error } = useHashConnect({
    debug: true,
  });
  const [step, setStep] = useState<"initial" | "connecting" | "success">(
    "initial"
  );

  useEffect(() => {
    if (isLoading) {
      setStep("connecting");
    } else if (isConnected) {
      setStep("success");
    } else {
      setStep("initial");
    }
  }, [isLoading, isConnected]);

  const handleConnect = async () => {
    try {
      await connect();
      // Success handled by useEffect watching isConnected
    } catch (err) {
      console.error("Connection failed:", err);
      // Error state is already set by the hook
    }
  };

  if (step === "initial") {
    return (
      <div>
        <h1>Welcome</h1>
        <p>Connect your wallet to continue</p>
        <button onClick={handleConnect}>Connect Wallet</button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  if (step === "connecting") {
    return (
      <div>
        <h1>Connecting...</h1>
        <p>Please scan the QR code with your mobile wallet</p>
        <p className="hint">This may take up to 30 seconds</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Connected!</h1>
      <p>You're now authenticated</p>
    </div>
  );
}
```

### 6. Club Membership Gating

```tsx
function ClubGatedContent() {
  const { isConnected, clubId, clubName } = useHashConnect();
  const REQUIRED_CLUB_ID = "your-club-id-here";

  if (!isConnected) {
    return <p>Please connect your wallet</p>;
  }

  if (!clubId) {
    return <p>No club membership detected</p>;
  }

  if (clubId !== REQUIRED_CLUB_ID) {
    return (
      <div>
        <p>Your club: {clubName}</p>
        <p>Sorry, this content requires membership in a different club</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome, {clubName} member!</h1>
      <p>Exclusive content here...</p>
    </div>
  );
}
```

---

## API Reference

### `useHashConnect(options?)`

**Parameters:**

- `options.debug?: boolean` - Enable debug logging (default: `false`)
- `options.disclaimer?: string` - Custom disclaimer text for QR modal

**Returns:**

```typescript
{
  // State
  isInitialized: boolean;    // NEW v3.1.0: Has SDK finished localStorage check?
  isConnected: boolean;       // Is wallet connected?
  isLoading: boolean;         // Is connection in progress?
  userAddress: string | null; // Wallet address (e.g., "0.0.12345")
  clubId: string | null;      // Club ID if user is member
  clubName: string | null;    // Club name if user is member
  error: string | null;       // Error message if connection failed

  // Methods
  connect: () => Promise<void>;           // Initiate connection
  disconnect: () => void;                 // Disconnect wallet
  getToken: () => Promise<string | null>; // Get auth token
  makeAuthRequest: <T>(                   // Helper for authenticated requests
    url: string,
    options?: RequestInit
  ) => Promise<T>;
}
```

### `HashConnectProvider`

**Props:**

- `children: React.ReactNode` - Your app
- `debug?: boolean` - Enable debug logging
- `disclaimer?: string` - Custom disclaimer text
- `onAuthStateChange?: (event) => void` - NEW v3.1.0: Auth event callback
- `onLog?: (event) => void` - NEW v3.1.0: Logging callback

**Example:**

```tsx
<HashConnectProvider
  debug={true}
  disclaimer="By connecting, you agree to our Terms"
  onAuthStateChange={({ type, userAddress }) => {
    console.log(`Auth ${type}:`, userAddress);
  }}
  onLog={({ message, timestamp }) => {
    logger.debug("[HashConnect]", message);
  }}
>
  <App />
</HashConnectProvider>
```

### `useHashConnectContext()`

Use this hook inside components wrapped by `HashConnectProvider`.

**Returns:** Same as `useHashConnect()`, but reads from context.

**Important:** Will throw error if used outside provider.

---

## Best Practices

### 1. ✅ Always Use Debug Mode in Development

```tsx
const { connect } = useHashConnect({
  debug: process.env.NODE_ENV === "development",
});
```

Debug logs help identify issues quickly. They're prefixed with `[useHashConnect]` or `[HashConnectProvider]`.

### 2. ✅ Handle Loading States Properly

```tsx
function MyComponent() {
  const { isLoading, isConnected, connect } = useHashConnect();

  // Don't allow clicking connect while loading
  return (
    <button onClick={connect} disabled={isLoading || isConnected}>
      {isLoading ? "Connecting..." : "Connect"}
    </button>
  );
}
```

### 3. ✅ Display Errors to Users

```tsx
function MyComponent() {
  const { error, connect } = useHashConnect();

  return (
    <div>
      <button onClick={connect}>Connect</button>
      {error && (
        <div className="error-banner">
          ⚠️ {error}
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
    </div>
  );
}
```

### 4. ✅ Memoize Callbacks That Use Hook Functions

The hook functions (`connect`, `disconnect`, `getToken`) are already memoized, but if you wrap them:

```tsx
function MyComponent() {
  const { connect, disconnect } = useHashConnect();

  // ✅ Good - memoized wrapper
  const handleConnect = useCallback(async () => {
    await connect();
    console.log("Connected!");
  }, [connect]);

  // ❌ Bad - recreated on every render
  const handleDisconnect = () => {
    disconnect();
    console.log("Disconnected!");
  };

  return <SomeChildComponent onConnect={handleConnect} />;
}
```

### 5. ✅ Use Safe Storage Access

If you need to read/write to storage:

```tsx
function MyComponent() {
  const storage = (window.HASHConnect as any)?._storage;

  const saveCustomData = () => {
    if (storage) {
      storage.setItem("my-custom-key", "value");
    } else {
      // Fallback for older SDK versions
      localStorage.setItem("my-custom-key", "value");
    }
  };

  return <button onClick={saveCustomData}>Save</button>;
}
```

### 6. ✅ Don't Mix Hook and Direct SDK Calls

```tsx
// ❌ Bad - mixing hook and direct SDK calls
function MyComponent() {
  const { isConnected } = useHashConnect();

  const handleDisconnect = () => {
    window.HASHConnect.disconnect(); // Don't do this!
  };
}

// ✅ Good - use hook consistently
function MyComponent() {
  const { isConnected, disconnect } = useHashConnect();

  const handleDisconnect = () => {
    disconnect(); // Use the hook's method
  };
}
```

### 7. ✅ Handle Session Expiry Gracefully

```tsx
function AuthenticatedApp() {
  const { getToken, disconnect } = useHashConnect();

  const fetchData = async () => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("No token available");
      }

      const response = await fetch("/api/data", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        // Token expired or invalid
        disconnect();
        alert("Session expired. Please reconnect.");
        return;
      }

      return response.json();
    } catch (error) {
      console.error("Fetch failed:", error);
    }
  };

  return <button onClick={fetchData}>Fetch Data</button>;
}
```

### 8. ✅ Cleanup on Unmount (Automatic)

The hooks automatically clean up event listeners when your component unmounts. You don't need manual cleanup:

```tsx
function MyComponent() {
  const { isConnected } = useHashConnect();

  // ✅ Cleanup is automatic - no need for this:
  // useEffect(() => {
  //   return () => {
  //     // cleanup
  //   };
  // }, []);

  return <div>{isConnected ? "Connected" : "Disconnected"}</div>;
}
```

---

## Common Pitfalls

### ❌ Pitfall 1: Calling `connect()` Multiple Times Rapidly

**Problem:**

```tsx
function BadComponent() {
  const { connect } = useHashConnect();

  return (
    <button
      onClick={() => {
        connect();
        connect(); // Don't do this!
        connect();
      }}
    >
      Connect
    </button>
  );
}
```

**Solution:**
The SDK prevents duplicate connection attempts internally, but you should still guard against multiple clicks:

```tsx
function GoodComponent() {
  const { connect, isLoading } = useHashConnect();

  return (
    <button onClick={connect} disabled={isLoading}>
      {isLoading ? "Connecting..." : "Connect"}
    </button>
  );
}
```

### ❌ Pitfall 2: Not Awaiting `connect()`

**Problem:**

```tsx
function BadComponent() {
  const { connect } = useHashConnect();

  const handleClick = () => {
    connect(); // Missing await
    console.log("Connected!"); // This logs BEFORE connection completes
  };
}
```

**Solution:**

```tsx
function GoodComponent() {
  const { connect, isConnected } = useHashConnect();

  const handleClick = async () => {
    await connect(); // Properly await
    console.log("Connection initiated");
  };

  // Or better: watch isConnected state
  useEffect(() => {
    if (isConnected) {
      console.log("Now connected!");
    }
  }, [isConnected]);
}
```

### ❌ Pitfall 3: Assuming Immediate Connection

**Problem:**

```tsx
function BadComponent() {
  const { connect, userAddress } = useHashConnect();

  const handleClick = async () => {
    await connect();
    console.log(userAddress); // Might still be null!
  };
}
```

**Why:** The connection involves:

1. QR code generation
2. User scanning QR code
3. Mobile app authorization
4. WebSocket message

This takes time (usually 5-15 seconds).

**Solution:**

```tsx
function GoodComponent() {
  const { isConnected, userAddress } = useHashConnect();

  useEffect(() => {
    if (isConnected && userAddress) {
      console.log("User address:", userAddress);
      // Now you can safely use userAddress
    }
  }, [isConnected, userAddress]);
}
```

### ❌ Pitfall 4: Direct localStorage Access

**Problem:**

```tsx
function BadComponent() {
  const sessionId = localStorage.getItem("hc:sessionId"); // Don't do this
}
```

**Why:**

- Bypasses SafeStorage error handling
- Breaks in private browsing mode
- Inconsistent with SDK's internal storage

**Solution:**

```tsx
function GoodComponent() {
  const storage = (window.HASHConnect as any)?._storage;
  const sessionId = storage?.getItem("hc:sessionId") ?? null;
}
```

### ❌ Pitfall 5: Ignoring `isLoading` State

**Problem:**

```tsx
function BadComponent() {
  const { isConnected, connect } = useHashConnect();

  // User clicks button twice in quick succession
  return <button onClick={connect}>Connect</button>;
}
```

**Result:**

- Multiple modals may appear
- Confusing UX
- Unnecessary API calls

**Solution:**

```tsx
function GoodComponent() {
  const { isConnected, isLoading, connect } = useHashConnect();

  return (
    <button onClick={connect} disabled={isConnected || isLoading}>
      {isLoading ? "Connecting..." : "Connect"}
    </button>
  );
}
```

### ❌ Pitfall 6: Using Hook Outside Component

**Problem:**

```tsx
// ❌ Bad - called at module level
const { isConnected } = useHashConnect();

function MyComponent() {
  return <div>{isConnected ? "Yes" : "No"}</div>;
}
```

**Error:** "Hooks can only be called inside function components"

**Solution:**

```tsx
// ✅ Good - called inside component
function MyComponent() {
  const { isConnected } = useHashConnect();
  return <div>{isConnected ? "Yes" : "No"}</div>;
}
```

### ❌ Pitfall 7: Conditional Hook Usage

**Problem:**

```tsx
function BadComponent({ needsAuth }: { needsAuth: boolean }) {
  if (needsAuth) {
    const { connect } = useHashConnect(); // ❌ Conditional hook!
  }
}
```

**Error:** "Hooks must be called in the same order on every render"

**Solution:**

```tsx
function GoodComponent({ needsAuth }: { needsAuth: boolean }) {
  const { connect } = useHashConnect(); // ✅ Always call hook

  if (!needsAuth) return null;

  return <button onClick={connect}>Connect</button>;
}
```

---

## TypeScript Usage

### Type Definitions

The SDK exports TypeScript types you can use:

```tsx
import { useHashConnect } from "@hashpass/connect/react";
import type { UseHashConnectReturn } from "@hashpass/connect/react";

// Use the return type
const authState: UseHashConnectReturn = useHashConnect();

// Or destructure with types
const { isConnected, userAddress, getToken }: UseHashConnectReturn =
  useHashConnect();
```

### Custom Hooks with Types

```tsx
import { useHashConnect } from "@hashpass/connect/react";

interface AuthenticatedUser {
  address: string;
  clubId: string | null;
  clubName: string | null;
}

function useAuthenticatedUser(): AuthenticatedUser | null {
  const { isConnected, userAddress, clubId, clubName } = useHashConnect();

  if (!isConnected || !userAddress) {
    return null;
  }

  return {
    address: userAddress,
    clubId,
    clubName,
  };
}

// Usage
function MyComponent() {
  const user = useAuthenticatedUser();

  if (!user) {
    return <Login />;
  }

  return <div>Welcome, {user.address}</div>;
}
```

### Typed API Requests

```tsx
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

function useProfile() {
  const { makeAuthRequest, isConnected } = useHashConnect();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected) return;

    setLoading(true);
    makeAuthRequest<UserProfile>("https://api.example.com/profile")
      .then(setProfile)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isConnected, makeAuthRequest]);

  return { profile, loading, error };
}
```

### Window Type Augmentation

If you need to access the global SDK:

```tsx
// types/hashconnect.d.ts
import { IHashConnect } from "@hashpass/connect";

declare global {
  interface Window {
    HASHConnect?: IHashConnect;
  }
}

export {};
```

Now you can safely use:

```tsx
const sdkVersion = window.HASHConnect?.isReady();
```

---

## Error Handling

### Connection Errors

```tsx
function ConnectionHandler() {
  const { connect, error, isLoading } = useHashConnect();
  const [userMessage, setUserMessage] = useState("");

  useEffect(() => {
    if (error) {
      // Map technical errors to user-friendly messages
      if (error.includes("timeout")) {
        setUserMessage("Connection took too long. Please try again.");
      } else if (error.includes("failed")) {
        setUserMessage("Connection failed. Check your network and retry.");
      } else {
        setUserMessage(
          "An unexpected error occurred. Please refresh the page."
        );
      }
    }
  }, [error]);

  const handleRetry = () => {
    setUserMessage("");
    connect();
  };

  return (
    <div>
      <button onClick={connect} disabled={isLoading}>
        Connect Wallet
      </button>

      {error && (
        <div className="error-banner">
          <p>{userMessage}</p>
          <button onClick={handleRetry}>Retry</button>
        </div>
      )}
    </div>
  );
}
```

### Token Refresh Errors

```tsx
function TokenErrorHandler() {
  const { getToken, disconnect } = useHashConnect();
  const [tokenError, setTokenError] = useState<string | null>(null);

  const fetchWithRetry = async (maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const token = await getToken();

        if (!token) {
          throw new Error("No token available");
        }

        return token;
      } catch (error) {
        if (i === maxRetries - 1) {
          // Final attempt failed
          setTokenError("Unable to refresh authentication. Please reconnect.");
          disconnect();
          throw error;
        }

        // Wait before retry (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
      }
    }
  };

  return tokenError ? <div className="error">{tokenError}</div> : null;
}
```

### Network Errors

```tsx
function NetworkErrorHandler() {
  const { isConnected } = useHashConnect();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="warning-banner">
        ⚠️ No internet connection. Please check your network.
      </div>
    );
  }

  if (isConnected && !isOnline) {
    return (
      <div className="warning-banner">
        ⚠️ Connection may be unstable. You might be disconnected soon.
      </div>
    );
  }

  return null;
}
```

---

## Testing

### Unit Testing Components

```tsx
// __tests__/MyComponent.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useHashConnect } from "@hashpass/connect/react";
import MyComponent from "./MyComponent";

// Mock the hook
jest.mock("@hashpass/connect/react", () => ({
  useHashConnect: jest.fn(),
}));

describe("MyComponent", () => {
  it("shows connect button when disconnected", () => {
    (useHashConnect as jest.Mock).mockReturnValue({
      isConnected: false,
      isLoading: false,
      connect: jest.fn(),
      error: null,
    });

    render(<MyComponent />);
    expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
  });

  it("shows loading state during connection", () => {
    (useHashConnect as jest.Mock).mockReturnValue({
      isConnected: false,
      isLoading: true,
      connect: jest.fn(),
      error: null,
    });

    render(<MyComponent />);
    expect(screen.getByText("Connecting...")).toBeInTheDocument();
  });

  it("shows user address when connected", () => {
    (useHashConnect as jest.Mock).mockReturnValue({
      isConnected: true,
      isLoading: false,
      userAddress: "0.0.12345",
      disconnect: jest.fn(),
      error: null,
    });

    render(<MyComponent />);
    expect(screen.getByText(/0\.0\.12345/)).toBeInTheDocument();
  });

  it("calls connect when button clicked", async () => {
    const mockConnect = jest.fn();
    (useHashConnect as jest.Mock).mockReturnValue({
      isConnected: false,
      isLoading: false,
      connect: mockConnect,
      error: null,
    });

    render(<MyComponent />);
    await userEvent.click(screen.getByText("Connect Wallet"));
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Testing

```tsx
// __tests__/integration.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

// Don't mock the hook - test the real integration
describe("HashConnect Integration", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it("handles full connection flow", async () => {
    render(<App />);

    // Initial state: not connected
    expect(screen.getByText("Connect Wallet")).toBeInTheDocument();

    // Click connect (this will show QR modal in real usage)
    await userEvent.click(screen.getByText("Connect Wallet"));

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText("Connecting...")).toBeInTheDocument();
    });

    // In real usage, user would scan QR code
    // For testing, you'd need to mock the Pusher connection
  });
});
```

### E2E Testing with Playwright

```typescript
// e2e/hashconnect.spec.ts
import { test, expect } from "@playwright/test";

test("connect wallet flow", async ({ page }) => {
  await page.goto("http://localhost:3000");

  // Click connect button
  await page.click('button:has-text("Connect Wallet")');

  // QR modal should appear
  await expect(page.locator("#hash-connect-modal")).toBeVisible();

  // QR code should be present
  await expect(page.locator("#hash-connect-qrcode canvas")).toBeVisible();

  // Status should show "Connecting"
  await expect(page.locator(".connection-status")).toContainText("Connecting");

  // In real E2E, you'd simulate mobile app scanning QR
  // For now, we can test the timeout
  await page.waitForTimeout(31000); // Wait past 30s timeout

  // Should show timeout error
  await expect(page.locator(".error")).toContainText("timeout");
});
```

---

## Troubleshooting

### Issue 1: "Hook called outside component"

**Error:**

```
Error: Invalid hook call. Hooks can only be called inside of the body of a function component.
```

**Cause:** Using hook outside React component or before component renders.

**Fix:**

```tsx
// ❌ Bad
const { connect } = useHashConnect();

function MyComponent() { ... }

// ✅ Good
function MyComponent() {
  const { connect } = useHashConnect();
}
```

### Issue 2: "Loading state stuck forever"

**Symptom:** `isLoading` remains `true` for more than 30 seconds.

**Possible Causes:**

1. QR modal not appearing (check browser console for errors)
2. Network blocking WebSocket connections
3. Old SDK version (<2.0.0)

**Fix:**

1. Enable debug mode: `useHashConnect({ debug: true })`
2. Check console for `[Pusher]` connection errors
3. Verify SDK version: `npm ls @hashpass/connect`
4. If using v1.x, upgrade: `npm install @hashpass/connect@latest`

### Issue 3: "Connection works but events don't fire"

**Symptom:** User scans QR, but app doesn't receive connection event.

**Debugging:**

```tsx
function DebugComponent() {
  const { isConnected, userAddress } = useHashConnect({ debug: true });

  useEffect(() => {
    console.log("Connection state changed:", { isConnected, userAddress });
  }, [isConnected, userAddress]);

  // Check for hash-connect-event
  useEffect(() => {
    const handler = (e: any) => {
      console.log("Received hash-connect-event:", e.detail);
    };
    document.addEventListener("hash-connect-event", handler);
    return () => document.removeEventListener("hash-connect-event", handler);
  }, []);

  return <div>Debug mode enabled - check console</div>;
}
```

**Common Fixes:**

- Refresh the page
- Clear localStorage: `localStorage.clear()`
- Check if multiple tabs are interfering

### Issue 4: "Cross-tab state not syncing"

**Symptom:** Disconnect in one tab doesn't affect other tabs.

**Cause:** Using old SDK version or private browsing mode.

**Fix:**

1. Ensure SDK v2.0+ (`npm install @hashpass/connect@latest`)
2. Check if using private/incognito mode (cross-tab sync doesn't work)
3. Verify storage events are firing:

```tsx
useEffect(() => {
  const handler = (e: StorageEvent) => {
    console.log("Storage event:", e.key, e.newValue);
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}, []);
```

### Issue 5: "Token expired immediately after login"

**Symptom:** Login successful, but `getToken()` returns null or expired token.

**Debugging:**

```tsx
function TokenDebug() {
  const { getToken, isConnected } = useHashConnect({ debug: true });

  useEffect(() => {
    if (isConnected) {
      getToken().then((token) => {
        if (token) {
          // Decode JWT to check expiry
          const parts = token.split(".");
          const payload = JSON.parse(
            atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
          );
          const expiresAt = new Date(payload.exp * 1000);
          console.log("Token expires at:", expiresAt);
          console.log(
            "Time until expiry:",
            expiresAt.getTime() - Date.now(),
            "ms"
          );
        }
      });
    }
  }, [isConnected, getToken]);

  return null;
}
```

**Fix:** Ensure your backend is issuing tokens with reasonable expiry times (recommended: 1-24 hours).

### Issue 6: "Module not found: '@hashpass/connect/react'"

**Error:**

```
Module not found: Error: Can't resolve '@hashpass/connect/react'
```

**Cause:** Incorrect import path or old SDK version.

**Fix:**

```tsx
// ❌ Bad (old syntax)
import { useHashConnect } from "@hashpass/connect";

// ✅ Good (correct)
import { useHashConnect } from "@hashpass/connect/react";
```

If error persists:

1. Delete `node_modules` and `package-lock.json`
2. Run `npm install`
3. Restart your dev server

---

## Production Checklist

Before deploying to production, verify:

### Code Quality

- [ ] Debug mode disabled: `useHashConnect({ debug: false })`
- [ ] No console.log statements with sensitive data
- [ ] Error boundaries wrap HashConnect components
- [ ] Loading states prevent duplicate connections
- [ ] TypeScript types used (if applicable)

### User Experience

- [ ] Loading spinner/skeleton during connection
- [ ] Error messages are user-friendly (not technical)
- [ ] Timeout handling (30s max)
- [ ] Disconnect button easily accessible
- [ ] Connection status clearly visible

### Security

- [ ] HTTPS enabled (required for WebSockets)
- [ ] Tokens never logged or exposed in URLs
- [ ] API requests use `getToken()` not stored tokens
- [ ] Session expiry handled gracefully
- [ ] No sensitive data in localStorage keys

### Performance

- [ ] Connection check doesn't block UI render
- [ ] Token refresh happens in background
- [ ] No memory leaks (check with React DevTools Profiler)
- [ ] Bundle size acceptable (check with `npm run build`)

### Testing

- [ ] Unit tests for auth-dependent components
- [ ] Integration test for connect/disconnect flow
- [ ] E2E test for full user journey
- [ ] Test token expiry handling
- [ ] Test network interruption recovery
- [ ] Test cross-tab behavior (if applicable)

### Monitoring

- [ ] Error tracking set up (Sentry, etc.)
- [ ] Connection success/failure metrics
- [ ] Token refresh failure alerts
- [ ] User abandonment tracking (QR shown but not scanned)

### Documentation

- [ ] README includes HashConnect setup
- [ ] Team trained on debug mode usage
- [ ] Known issues documented
- [ ] Support contacts listed

---

## Additional Resources

### Official Documentation

- [Main README](./README.md)
- [Changelog](./CHANGELOG.md)
- [Stability Guide](./STABILITY_CHANGELOG.md)

### Debug Guides

- [Debug Quick Start](./docs/archive/DEBUGGING_QUICK_START.md)
- [Complete Debug Guide](./docs/archive/DEBUG_GUIDE.md)

### Examples

- [React Simple Example](./docs/archive/REACT_SIMPLE_GUIDE.md)
- [Vanilla JS Example](./debug-test.html)

### Support

- **Issues:** Report bugs via GitHub Issues
- **Questions:** Check existing issues or create new one
- **Email:** support@hashpass.com

---

## Version History

| Version | Date       | Key Changes                                |
| ------- | ---------- | ------------------------------------------ |
| 3.1.0   | 2025-12-08 | isInitialized, non-React access, callbacks |
| 3.0.3   | 2025-12-08 | React-only architecture                    |
| 2.0.1   | 2025-12-08 | Bug fixes for connection monitoring        |
| 2.0.0   | 2025-12-08 | Major stability release, proactive refresh |
| 1.0.22  | 2025-11-08 | React hooks, debug logging                 |
| 1.0.0   | 2025-10-01 | Initial release                            |

---

## FAQ

**Q: Do I need to call `connect()` on every page load?**  
A: No. The SDK automatically reconnects if there's a valid stored session. Just check `isConnected`.

**Q: How long do sessions last?**  
A: Tokens are valid for 15-60 minutes (configurable by backend). The SDK refreshes them automatically 5 minutes before expiry.

**Q: Can multiple tabs share a connection?**  
A: Yes. Cross-tab sync in v2.0+ ensures disconnecting one tab disconnects all. But connecting requires manual action in each tab.

**Q: Does this work with Next.js?**  
A: Yes. Use the hook in client components only. Add `'use client'` directive if using App Router.

**Q: Does this work with React Native?**  
A: No. This SDK is for web browsers only. Mobile apps should use native Hedera SDKs.

**Q: What happens if token refresh fails?**  
A: After 3 consecutive failures, the SDK disconnects the user and clears the session.

**Q: Can I customize the QR modal?**  
A: The modal is part of the core SDK. You can pass a `disclaimer` prop, but full customization requires forking the SDK.

**Q: Is SSR (Server-Side Rendering) supported?**  
A: The SDK requires `window` and `localStorage`, so it only works client-side. In SSR frameworks like Next.js, use dynamic imports or client-only components.

---

**End of Guide**

For updates to this guide, check the [GitHub repository](https://github.com/your-org/hash-connect-sdk).

**Current Version:** 3.1.0  
**Last Updated:** December 8, 2025
