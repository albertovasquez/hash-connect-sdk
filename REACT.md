# HashConnect SDK - React Integration Guide

This guide demonstrates how to integrate the HashConnect SDK into your React application.

## Installation

### Option 1: Via npm (Recommended)

```bash
npm install @hashpass/connect
```

### Option 2: Via CDN

```html
<script src="https://unpkg.com/@hashpass/connect/dist/hash-connect.js"></script>
```

## Quick Start

### 1. Using the Built-in Hook (Recommended)

The easiest way to integrate HashConnect in React is to use the built-in hook:

```tsx
import { useHashConnect } from "@hashpass/connect/react";

function App() {
  const {
    isConnected,
    userAddress,
    connect,
    disconnect,
    getToken,
    isLoading,
    error,
  } = useHashConnect();

  const handleApiCall = async () => {
    const token = await getToken();
    if (token) {
      const response = await fetch("https://api.example.com/data", {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  };

  return (
    <div>
      {isConnected ? (
        <div>
          <p>Connected: {userAddress}</p>
          <button onClick={disconnect}>Disconnect</button>
          <button onClick={handleApiCall}>Make API Call</button>
        </div>
      ) : (
        <button onClick={connect} disabled={isLoading}>
          {isLoading ? "Connecting..." : "Connect with HASH Pass"}
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

That's it! No need to manually load scripts or manage state.

### 2. Using the Context Provider

For larger apps, use the Context Provider:

```tsx
import {
  HashConnectProvider,
  useHashConnectContext,
} from "@hashpass/connect/react";

function App() {
  return (
    <HashConnectProvider>
      <MyApp />
    </HashConnectProvider>
  );
}

function MyApp() {
  const { isConnected, userAddress, connect, disconnect } =
    useHashConnectContext();

  return (
    <div>
      {isConnected ? (
        <p>Connected: {userAddress}</p>
      ) : (
        <button onClick={connect}>Connect</button>
      )}
    </div>
  );
}
```

### 3. Manual Integration (Advanced)

If you need more control, you can still manually integrate:

```tsx
import React, { useEffect, useState, useCallback } from "react";

// Extend the Window interface to include HASHConnect
declare global {
  interface Window {
    HASHConnect?: {
      connect: () => Promise<void>;
      getToken: () => Promise<string | null>;
      getUser: () => { address: string | null } | undefined;
      isReady: () => boolean;
    };
  }
}

export const HashConnectButton: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load the HashConnect SDK
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@hashpass/connect/dist/hash-connect.js";
    script.async = true;
    document.body.appendChild(script);

    // Listen for connection events
    const handleConnect = (event: CustomEvent) => {
      if (event.detail.eventType === "connected") {
        setIsConnected(true);
        setUserAddress(event.detail.user);
        console.log("User connected:", event.detail.user);
      }
    };

    const handleDisconnect = (event: CustomEvent) => {
      if (event.detail.eventType === "disconnected") {
        setIsConnected(false);
        setUserAddress(null);
        console.log("User disconnected");
      }
    };

    document.addEventListener(
      "hash-connect-event",
      handleConnect as EventListener
    );
    document.addEventListener(
      "hash-connect-event",
      handleDisconnect as EventListener
    );

    // Check if already connected on mount
    const checkConnection = () => {
      if (window.HASHConnect?.isReady()) {
        const user = window.HASHConnect.getUser();
        if (user?.address) {
          setIsConnected(true);
          setUserAddress(user.address);
        }
      }
    };

    // Wait for SDK to load
    const interval = setInterval(() => {
      if (window.HASHConnect) {
        checkConnection();
        clearInterval(interval);
      }
    }, 100);

    return () => {
      document.removeEventListener(
        "hash-connect-event",
        handleConnect as EventListener
      );
      document.removeEventListener(
        "hash-connect-event",
        handleDisconnect as EventListener
      );
      clearInterval(interval);
      document.body.removeChild(script);
    };
  }, []);

  const handleConnect = useCallback(async () => {
    if (!window.HASHConnect) {
      console.error("HashConnect SDK not loaded");
      return;
    }

    setIsLoading(true);
    try {
      await window.HASHConnect.connect();
    } catch (error) {
      console.error("Connection error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (isConnected && userAddress) {
    return (
      <div className="hash-connect-profile">
        <span>
          Connected: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
        </span>
        <button
          onClick={() => {
            // Trigger disconnect from the SDK
            document.getElementById("hash-connect-disconnect-btn")?.click();
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className="hash-connect-button"
    >
      {isLoading ? "Connecting..." : "Connect with HASH Pass"}
    </button>
  );
};
```

## API Reference

### `useHashConnect()`

The main hook for HashConnect integration.

**Returns:**

- `isConnected: boolean` - Whether a user is connected
- `isLoading: boolean` - Whether a connection is in progress
- `userAddress: string | null` - The connected user's address
- `error: string | null` - Any error that occurred
- `connect: () => Promise<void>` - Initiate connection
- `disconnect: () => void` - Disconnect the user
- `getToken: () => Promise<string | null>` - Get access token
- `makeAuthRequest: <T>(url, options?) => Promise<T>` - Make authenticated API request

**Example:**

```tsx
const {
  isConnected,
  userAddress,
  connect,
  disconnect,
  getToken,
  makeAuthRequest,
} = useHashConnect();
```

### `HashConnectProvider`

Context provider for HashConnect.

**Props:**

- `children: React.ReactNode` - Child components

**Example:**

```tsx
<HashConnectProvider>
  <App />
</HashConnectProvider>
```

### `useHashConnectContext()`

Hook to access the HashConnect context (must be used within `HashConnectProvider`).

**Returns:**

- `isConnected: boolean` - Whether a user is connected
- `isLoading: boolean` - Whether a connection is in progress
- `userAddress: string | null` - The connected user's address
- `connect: () => Promise<void>` - Initiate connection
- `disconnect: () => void` - Disconnect the user
- `getToken: () => Promise<string | null>` - Get access token

---

## Advanced: Custom Hook Implementation

If you need to customize the hook behavior, here's the full implementation you can modify:

```tsx
// hooks/useHashConnect.ts
import { useState, useEffect, useCallback } from "react";

interface HashConnectState {
  isConnected: boolean;
  isLoading: boolean;
  userAddress: string | null;
  error: string | null;
}

export const useHashConnect = () => {
  const [state, setState] = useState<HashConnectState>({
    isConnected: false,
    isLoading: false,
    userAddress: null,
    error: null,
  });

  useEffect(() => {
    // Listen for connection events
    const handleHashConnectEvent = (event: CustomEvent) => {
      const { eventType, user } = event.detail;

      if (eventType === "connected") {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          userAddress: user,
          isLoading: false,
          error: null,
        }));
      } else if (eventType === "disconnected") {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          userAddress: null,
          isLoading: false,
        }));
      }
    };

    document.addEventListener(
      "hash-connect-event",
      handleHashConnectEvent as EventListener
    );

    // Check if already connected
    const checkConnection = () => {
      if (window.HASHConnect?.isReady()) {
        const user = window.HASHConnect.getUser();
        if (user?.address) {
          setState((prev) => ({
            ...prev,
            isConnected: true,
            userAddress: user.address,
          }));
        }
      }
    };

    const interval = setInterval(() => {
      if (window.HASHConnect) {
        checkConnection();
        clearInterval(interval);
      }
    }, 100);

    return () => {
      document.removeEventListener(
        "hash-connect-event",
        handleHashConnectEvent as EventListener
      );
      clearInterval(interval);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!window.HASHConnect) {
      setState((prev) => ({
        ...prev,
        error: "HashConnect SDK not loaded",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await window.HASHConnect.connect();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Connection failed",
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    // Trigger disconnect button if it exists
    const disconnectBtn = document.getElementById(
      "hash-connect-disconnect-btn"
    );
    if (disconnectBtn) {
      disconnectBtn.click();
    }
  }, []);

  const getToken = useCallback(async () => {
    if (!window.HASHConnect) {
      return null;
    }
    return await window.HASHConnect.getToken();
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    getToken,
  };
};
```

**Usage:**

```tsx
import { useHashConnect } from "./hooks/useHashConnect";

function App() {
  const {
    isConnected,
    userAddress,
    isLoading,
    error,
    connect,
    disconnect,
    getToken,
  } = useHashConnect();

  const handleApiCall = async () => {
    const token = await getToken();
    if (token) {
      // Make authenticated API call
      const response = await fetch("https://api.example.com/data", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  };

  return (
    <div>
      {isConnected ? (
        <div>
          <p>Connected: {userAddress}</p>
          <button onClick={disconnect}>Disconnect</button>
          <button onClick={handleApiCall}>Make API Call</button>
        </div>
      ) : (
        <button onClick={connect} disabled={isLoading}>
          {isLoading ? "Connecting..." : "Connect"}
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

---

## Installation Notes

The React components are included as part of the `@hashpass/connect` package. React is marked as an optional peer dependency, so it won't be installed automatically if you're only using the vanilla JS version.

For React projects, ensure you have React installed:

```bash
npm install react
```

Then import from the `/react` subpath:

```tsx
import { useHashConnect } from "@hashpass/connect/react";
```

---

## Advanced: Custom Context Provider

If you want to create your own context provider with custom logic:

```tsx
// contexts/HashConnectContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";

interface HashConnectContextType {
  isConnected: boolean;
  userAddress: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  getToken: () => Promise<string | null>;
  isLoading: boolean;
}

const HashConnectContext = createContext<HashConnectContextType | undefined>(
  undefined
);

export const HashConnectProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load SDK script
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@hashpass/connect/dist/hash-connect.js";
    script.async = true;
    document.body.appendChild(script);

    const handleHashConnectEvent = (event: CustomEvent) => {
      const { eventType, user } = event.detail;

      if (eventType === "connected") {
        setIsConnected(true);
        setUserAddress(user);
        setIsLoading(false);
      } else if (eventType === "disconnected") {
        setIsConnected(false);
        setUserAddress(null);
        setIsLoading(false);
      }
    };

    document.addEventListener(
      "hash-connect-event",
      handleHashConnectEvent as EventListener
    );

    return () => {
      document.removeEventListener(
        "hash-connect-event",
        handleHashConnectEvent as EventListener
      );
      document.body.removeChild(script);
    };
  }, []);

  const connect = async () => {
    if (!window.HASHConnect) {
      console.error("HashConnect SDK not loaded");
      return;
    }
    setIsLoading(true);
    await window.HASHConnect.connect();
  };

  const disconnect = () => {
    document.getElementById("hash-connect-disconnect-btn")?.click();
  };

  const getToken = async () => {
    return window.HASHConnect?.getToken() || null;
  };

  return (
    <HashConnectContext.Provider
      value={{
        isConnected,
        userAddress,
        connect,
        disconnect,
        getToken,
        isLoading,
      }}
    >
      {children}
    </HashConnectContext.Provider>
  );
};

export const useHashConnect = () => {
  const context = useContext(HashConnectContext);
  if (!context) {
    throw new Error("useHashConnect must be used within HashConnectProvider");
  }
  return context;
};
```

**App Setup:**

```tsx
// App.tsx
import { HashConnectProvider } from "./contexts/HashConnectContext";

function App() {
  return (
    <HashConnectProvider>
      <YourApp />
    </HashConnectProvider>
  );
}
```

**Usage in Components:**

```tsx
// components/Profile.tsx
import { useHashConnect } from "../contexts/HashConnectContext";

export const Profile = () => {
  const { isConnected, userAddress, connect, disconnect, isLoading } =
    useHashConnect();

  if (!isConnected) {
    return (
      <button onClick={connect} disabled={isLoading}>
        {isLoading ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div>
      <p>Address: {userAddress}</p>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
};
```

## API Reference

### Window.HASHConnect

The SDK exposes the following methods on `window.HASHConnect`:

#### `connect()`

Initiates the connection flow and opens the QR code modal.

```typescript
await window.HASHConnect.connect();
```

#### `getToken()`

Retrieves the current access token. Automatically refreshes if expired.

```typescript
const token = await window.HASHConnect.getToken();
```

#### `getUser()`

Gets the current connected user information.

```typescript
const user = window.HASHConnect.getUser();
console.log(user?.address); // "0x..."
```

#### `isReady()`

Checks if the user is connected and ready.

```typescript
const isConnected = window.HASHConnect.isReady();
```

## Events

The SDK dispatches custom events that you can listen to:

### `hash-connect-event`

Fired when connection state changes.

```typescript
document.addEventListener("hash-connect-event", (event: CustomEvent) => {
  if (event.detail.eventType === "connected") {
    console.log("Connected:", event.detail.user);
  } else if (event.detail.eventType === "disconnected") {
    console.log("Disconnected");
  }
});
```

## Styling

The SDK comes with default styles, but you can customize them:

```css
/* Override default button styles */
#hash-connect-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

#hash-connect-btn:hover {
  transform: scale(1.05);
}

#hash-connect-disconnect-btn {
  background: #ef4444;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  color: white;
  cursor: pointer;
}
```

## Next.js Integration

For Next.js apps, ensure the SDK loads only on the client side:

```tsx
import dynamic from "next/dynamic";

const HashConnectButton = dynamic(
  () =>
    import("../components/HashConnectButton").then(
      (mod) => mod.HashConnectButton
    ),
  { ssr: false }
);

export default function Home() {
  return (
    <div>
      <HashConnectButton />
    </div>
  );
}
```

## TypeScript Support

Add the type definitions to your project:

```typescript
// types/hash-connect.d.ts
declare global {
  interface Window {
    HASHConnect?: {
      connect: () => Promise<void>;
      getToken: () => Promise<string | null>;
      getUser: () => { address: string | null } | undefined;
      isReady: () => boolean;
    };
  }
}

export {};
```

## Troubleshooting

### SDK Not Loading

Ensure the script is loaded before calling any methods:

```typescript
const waitForHashConnect = () => {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (window.HASHConnect) {
        clearInterval(interval);
        resolve(window.HASHConnect);
      }
    }, 100);
  });
};

await waitForHashConnect();
```

### Connection Not Persisting

The SDK automatically handles reconnection using stored session data. If issues persist, check local storage:

```typescript
// Clear session if needed
localStorage.removeItem("hc:sessionId");
localStorage.removeItem("hc:accessToken");
localStorage.removeItem("hc:refreshToken");
localStorage.removeItem("hc:address");
```

## Examples

Check out the example apps:

- [Basic React Example](./examples/react-basic)
- [Next.js Example](./examples/nextjs)
- [Context Provider Example](./examples/react-context)

## Support

For issues and questions, please visit:

- GitHub Issues: https://github.com/your-org/hash-connect-sdk/issues
- Documentation: https://docs.hashconnect.io
