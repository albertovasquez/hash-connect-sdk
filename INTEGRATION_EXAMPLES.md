# Integration Examples

Real-world examples of integrating HashConnect SDK into different frameworks and use cases.

## Table of Contents

- [Vanilla JavaScript](#vanilla-javascript)
- [React Hooks](#react-hooks)
- [React Context](#react-context)
- [Next.js](#nextjs)
- [Vue 3](#vue-3)
- [API Integration](#api-integration)
- [Gated Content](#gated-content)

---

## Vanilla JavaScript

### Simple Authentication

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>HashConnect Demo</title>
    <style>
      .app {
        max-width: 600px;
        margin: 50px auto;
        padding: 20px;
        font-family: system-ui;
      }
      .user-info {
        background: #f0f0f0;
        padding: 15px;
        border-radius: 8px;
        margin-top: 20px;
      }
    </style>
  </head>
  <body>
    <div class="app">
      <h1>My App</h1>
      <div id="hash-connect"></div>
      <div id="user-info" class="user-info" style="display: none;"></div>
    </div>

    <script src="https://unpkg.com/@hashpass/connect/dist/hash-connect.js"></script>
    <script>
      const userInfoEl = document.getElementById("user-info");

      // Listen for connection events
      document.addEventListener("hash-connect-event", (event) => {
        const { eventType, user } = event.detail;

        if (eventType === "connected") {
          userInfoEl.innerHTML = `
          <h3>Welcome!</h3>
          <p>Address: ${user}</p>
          <button onclick="loadUserData()">Load My Data</button>
        `;
          userInfoEl.style.display = "block";
        } else if (eventType === "disconnected") {
          userInfoEl.style.display = "none";
        }
      });

      async function loadUserData() {
        const token = await window.HASHConnect.getToken();

        try {
          const response = await fetch("https://api.example.com/user/profile", {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          const data = await response.json();
          console.log("User data:", data);
        } catch (error) {
          console.error("Failed to load data:", error);
        }
      }
    </script>
  </body>
</html>
```

---

## React Hooks

### Complete Hook Implementation

```tsx
// hooks/useHashConnect.ts
import { useState, useEffect, useCallback, useRef } from "react";

interface UseHashConnectReturn {
  isConnected: boolean;
  isLoading: boolean;
  userAddress: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  getToken: () => Promise<string | null>;
  makeAuthRequest: <T>(url: string, options?: RequestInit) => Promise<T>;
}

export const useHashConnect = (): UseHashConnectReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Load SDK script
    if (!scriptLoadedRef.current) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@hashpass/connect/dist/hash-connect.js";
      script.async = true;
      document.body.appendChild(script);
      scriptLoadedRef.current = true;
    }

    // Listen for connection events
    const handleHashConnectEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { eventType, user } = customEvent.detail;

      if (eventType === "connected") {
        setIsConnected(true);
        setUserAddress(user);
        setIsLoading(false);
        setError(null);
      } else if (eventType === "disconnected") {
        setIsConnected(false);
        setUserAddress(null);
        setIsLoading(false);
      }
    };

    document.addEventListener("hash-connect-event", handleHashConnectEvent);

    // Check if already connected
    const checkConnection = setInterval(() => {
      if (window.HASHConnect?.isReady()) {
        const user = window.HASHConnect.getUser();
        if (user?.address) {
          setIsConnected(true);
          setUserAddress(user.address);
        }
        clearInterval(checkConnection);
      }
    }, 100);

    return () => {
      document.removeEventListener(
        "hash-connect-event",
        handleHashConnectEvent
      );
      clearInterval(checkConnection);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!window.HASHConnect) {
      setError("HashConnect SDK not loaded");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await window.HASHConnect.connect();
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : "Connection failed");
    }
  }, []);

  const disconnect = useCallback(() => {
    const disconnectBtn = document.getElementById(
      "hash-connect-disconnect-btn"
    );
    disconnectBtn?.click();
  }, []);

  const getToken = useCallback(async () => {
    if (!window.HASHConnect) return null;
    return await window.HASHConnect.getToken();
  }, []);

  const makeAuthRequest = useCallback(
    async <T,>(url: string, options: RequestInit = {}): Promise<T> => {
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

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }

      return response.json();
    },
    [getToken]
  );

  return {
    isConnected,
    isLoading,
    userAddress,
    error,
    connect,
    disconnect,
    getToken,
    makeAuthRequest,
  };
};
```

### Using the Hook

```tsx
// App.tsx
import React from "react";
import { useHashConnect } from "./hooks/useHashConnect";

interface UserProfile {
  name: string;
  email: string;
  balance: number;
}

export default function App() {
  const {
    isConnected,
    isLoading,
    userAddress,
    error,
    connect,
    disconnect,
    makeAuthRequest,
  } = useHashConnect();

  const [profile, setProfile] = React.useState<UserProfile | null>(null);

  const loadProfile = async () => {
    try {
      const data = await makeAuthRequest<UserProfile>(
        "https://api.example.com/profile"
      );
      setProfile(data);
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Welcome</h1>
          <button
            onClick={connect}
            disabled={isLoading}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg"
          >
            {isLoading ? "Connecting..." : "Connect with HASH Pass"}
          </button>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}
          </span>
          <button
            onClick={disconnect}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Disconnect
          </button>
        </div>
      </header>

      <main>
        {!profile ? (
          <button
            onClick={loadProfile}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Load Profile
          </button>
        ) : (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Profile</h2>
            <p>Name: {profile.name}</p>
            <p>Email: {profile.email}</p>
            <p>Balance: ${profile.balance}</p>
          </div>
        )}
      </main>
    </div>
  );
}
```

---

## React Context

See the comprehensive Context Provider example in [REACT.md](./REACT.md#3-context-provider-pattern-recommended-for-large-apps).

---

## Next.js

### App Router (Next.js 13+)

```tsx
// app/providers.tsx
"use client";

import { HashConnectProvider } from "@/contexts/HashConnectContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <HashConnectProvider>{children}</HashConnectProvider>;
}
```

```tsx
// app/layout.tsx
import { Providers } from "./providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

```tsx
// app/page.tsx
"use client";

import { useHashConnect } from "@/contexts/HashConnectContext";

export default function Home() {
  const { isConnected, userAddress, connect } = useHashConnect();

  return (
    <main>
      {isConnected ? (
        <p>Connected: {userAddress}</p>
      ) : (
        <button onClick={connect}>Connect</button>
      )}
    </main>
  );
}
```

### Pages Router (Next.js 12)

```tsx
// pages/_app.tsx
import type { AppProps } from "next/app";
import { HashConnectProvider } from "@/contexts/HashConnectContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <HashConnectProvider>
      <Component {...pageProps} />
    </HashConnectProvider>
  );
}
```

---

## Vue 3

### Composable

```typescript
// composables/useHashConnect.ts
import { ref, onMounted, onUnmounted } from "vue";

export function useHashConnect() {
  const isConnected = ref(false);
  const isLoading = ref(false);
  const userAddress = ref<string | null>(null);
  const error = ref<string | null>(null);

  const handleHashConnectEvent = (event: Event) => {
    const customEvent = event as CustomEvent;
    const { eventType, user } = customEvent.detail;

    if (eventType === "connected") {
      isConnected.value = true;
      userAddress.value = user;
      isLoading.value = false;
      error.value = null;
    } else if (eventType === "disconnected") {
      isConnected.value = false;
      userAddress.value = null;
      isLoading.value = false;
    }
  };

  const connect = async () => {
    if (!window.HASHConnect) {
      error.value = "HashConnect SDK not loaded";
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      await window.HASHConnect.connect();
    } catch (err) {
      isLoading.value = false;
      error.value = err instanceof Error ? err.message : "Connection failed";
    }
  };

  const disconnect = () => {
    const disconnectBtn = document.getElementById(
      "hash-connect-disconnect-btn"
    );
    disconnectBtn?.click();
  };

  const getToken = async () => {
    if (!window.HASHConnect) return null;
    return await window.HASHConnect.getToken();
  };

  onMounted(() => {
    // Load script
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@hashconnect/sdk/dist/hash-connect.js";
    script.async = true;
    document.body.appendChild(script);

    document.addEventListener("hash-connect-event", handleHashConnectEvent);

    // Check if already connected
    const interval = setInterval(() => {
      if (window.HASHConnect?.isReady()) {
        const user = window.HASHConnect.getUser();
        if (user?.address) {
          isConnected.value = true;
          userAddress.value = user.address;
        }
        clearInterval(interval);
      }
    }, 100);
  });

  onUnmounted(() => {
    document.removeEventListener("hash-connect-event", handleHashConnectEvent);
  });

  return {
    isConnected,
    isLoading,
    userAddress,
    error,
    connect,
    disconnect,
    getToken,
  };
}
```

### Component Usage

```vue
<template>
  <div class="app">
    <div v-if="!isConnected">
      <button @click="connect" :disabled="isLoading">
        {{ isLoading ? "Connecting..." : "Connect with HASH Pass" }}
      </button>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <div v-else>
      <p>Connected: {{ userAddress }}</p>
      <button @click="disconnect">Disconnect</button>
      <button @click="loadData">Load Data</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useHashConnect } from "@/composables/useHashConnect";

const {
  isConnected,
  isLoading,
  userAddress,
  error,
  connect,
  disconnect,
  getToken,
} = useHashConnect();

const loadData = async () => {
  const token = await getToken();
  // Make authenticated API call
};
</script>
```

---

## API Integration

### Authenticated API Client

```typescript
// utils/apiClient.ts
class HashConnectAPIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await window.HASHConnect?.getToken();

    if (!token) {
      throw new Error("Not authenticated");
    }

    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async get<T>(endpoint: string): Promise<T> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`GET ${endpoint} failed: ${response.statusText}`);
    }

    return response.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`POST ${endpoint} failed: ${response.statusText}`);
    }

    return response.json();
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`PUT ${endpoint} failed: ${response.statusText}`);
    }

    return response.json();
  }

  async delete<T>(endpoint: string): Promise<T> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      throw new Error(`DELETE ${endpoint} failed: ${response.statusText}`);
    }

    return response.json();
  }
}

export const apiClient = new HashConnectAPIClient("https://api.example.com");
```

### Usage

```typescript
// Get user profile
const profile = await apiClient.get("/user/profile");

// Update settings
await apiClient.put("/user/settings", { theme: "dark" });

// Create post
const post = await apiClient.post("/posts", { title: "Hello", content: "..." });
```

---

## Gated Content

### Protect Routes/Components

```tsx
// components/ProtectedRoute.tsx
import { useHashConnect } from "@/hooks/useHashConnect";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isConnected, isLoading } = useHashConnect();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isConnected) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

### Usage with React Router

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## Additional Resources

- [React Integration Guide](./REACT.md)
- [Main Documentation](./README.md)
- [Publishing Guide](./PUBLISHING.md)

## Need Help?

- GitHub Issues: https://github.com/bitlabs/hash-connect-sdk/issues
- Documentation: https://docs.hashconnect.io
