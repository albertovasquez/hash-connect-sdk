# Migration Guide: v2 → v3

This guide helps you migrate from HashConnect SDK v2 (hybrid architecture) to v3 (React-only).

## Overview

v3 is a complete rewrite with a React-only architecture. The main changes are:

| Aspect            | v2                                               | v3                       |
| ----------------- | ------------------------------------------------ | ------------------------ |
| Architecture      | Hybrid (Vanilla JS + React wrapper)              | Pure React               |
| Entry point       | `window.HASHConnect` + `@hashpass/connect/react` | `@hashpass/connect`      |
| State management  | Dual (SDK memory + React state)                  | Single React Context     |
| Communication     | CustomEvents                                     | Direct React callbacks   |
| Modal             | DOM manipulation                                 | React Portal             |
| React requirement | Optional peer dependency                         | Required peer dependency |

## Breaking Changes

### 1. `window.HASHConnect` Removed

**v2:**

```javascript
// Vanilla JS usage
await window.HASHConnect.connect();
const token = await window.HASHConnect.getToken();
const user = window.HASHConnect.getUser();
```

**v3:**

```tsx
// React only
import { useHashConnect } from "@hashpass/connect";

function MyComponent() {
  const { connect, getToken, userAddress } = useHashConnect();
  // ...
}
```

### 2. Import Path Changed

**v2:**

```tsx
import { useHashConnect } from "@hashpass/connect/react";
```

**v3:**

```tsx
import { useHashConnect } from "@hashpass/connect";
```

### 3. Provider is Required

**v2:**

```tsx
// Provider was optional - hook could work standalone
function App() {
  const { connect } = useHashConnect(); // Worked without provider
  return <button onClick={connect}>Connect</button>;
}
```

**v3:**

```tsx
// Provider is required
import { HashConnectProvider, useHashConnect } from "@hashpass/connect";

function App() {
  return (
    <HashConnectProvider>
      <MyApp />
    </HashConnectProvider>
  );
}

function MyApp() {
  const { connect } = useHashConnect(); // Must be within provider
  return <button onClick={connect}>Connect</button>;
}
```

### 4. CustomEvents Removed

**v2:**

```javascript
document.addEventListener("hash-connect-event", (event) => {
  if (event.detail.eventType === "connected") {
    console.log("Connected:", event.detail.user);
  }
});
```

**v3:**

```tsx
// Use React state directly
function MyComponent() {
  const { isConnected, userAddress } = useHashConnect();

  useEffect(() => {
    if (isConnected) {
      console.log("Connected:", userAddress);
    }
  }, [isConnected, userAddress]);
}
```

### 5. CDN Usage No Longer Supported

**v2:**

```html
<script src="https://unpkg.com/@hashpass/connect/dist/hash-connect.js"></script>
<script>
  window.HASHConnect.connect();
</script>
```

**v3:**
CDN usage is not supported. Use npm/yarn/pnpm:

```bash
npm install @hashpass/connect
```

### 6. React is Now Required

**v2:**

```json
{
  "peerDependencies": {
    "react": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true }
  }
}
```

**v3:**

```json
{
  "peerDependencies": {
    "react": "^17.0.0 || ^18.0.0 || ^19.0.0"
  }
}
```

## Migration Steps

### Step 1: Update Package

```bash
npm install @hashpass/connect@3
```

### Step 2: Update Imports

Find and replace all imports:

```tsx
// Before
import { useHashConnect, HashConnectProvider } from "@hashpass/connect/react";

// After
import { useHashConnect, HashConnectProvider } from "@hashpass/connect";
```

### Step 3: Add Provider at Root

Wrap your app with the provider:

```tsx
// App.tsx or _app.tsx
import { HashConnectProvider } from "@hashpass/connect";

function App() {
  return (
    <HashConnectProvider disclaimer="Your disclaimer text">
      <YourApp />
    </HashConnectProvider>
  );
}
```

### Step 4: Remove window.HASHConnect Usage

Replace any vanilla JS usage:

```tsx
// Before
const handleConnect = async () => {
  if (window.HASHConnect) {
    await window.HASHConnect.connect();
  }
};

// After
const { connect } = useHashConnect();
const handleConnect = async () => {
  await connect();
};
```

### Step 5: Remove CustomEvent Listeners

Replace event listeners with React state:

```tsx
// Before
useEffect(() => {
  const handler = (e: CustomEvent) => {
    if (e.detail.eventType === "connected") {
      setConnected(true);
      setAddress(e.detail.user);
    }
  };
  document.addEventListener("hash-connect-event", handler);
  return () => document.removeEventListener("hash-connect-event", handler);
}, []);

// After
const { isConnected, userAddress } = useHashConnect();
// State is managed automatically
```

### Step 6: Update TypeScript Types

Remove manual type declarations:

```typescript
// Before - manual types in your code
declare global {
  interface Window {
    HASHConnect?: {
      connect: () => Promise<void>;
      // ...
    };
  }
}

// After - types are exported from package
import type { UseHashConnectReturn, AuthState } from "@hashpass/connect";
```

## New Features in v3

### 1. SSR/Next.js Support

All hooks are SSR-safe:

```tsx
// Works in Next.js App Router
"use client";
import { useHashConnect } from "@hashpass/connect";
```

### 2. Improved TypeScript

Full type safety with exported types:

```tsx
import type {
  AuthState,
  HashConnectContextType,
  ConnectionState,
} from "@hashpass/connect";
```

### 3. makeAuthRequest Helper

Built-in authenticated request helper:

```tsx
const { makeAuthRequest } = useHashConnect();

// Token is automatically included
const data = await makeAuthRequest<{ items: Item[] }>("/api/items");
```

### 4. Cross-tab Synchronization

Sessions sync across tabs automatically - no extra code needed.

### 5. Core Hooks Available

Access underlying hooks for advanced use cases:

```tsx
import { useStorage, usePusher, useTokenRefresh } from "@hashpass/connect";
```

## Frequently Asked Questions

### Can I still use the SDK without React?

No. v3 is React-only. If you need vanilla JS support, continue using v2.x.

### Will v2 continue to receive updates?

v2 will receive critical security patches only. New features will be v3-only.

### Does v3 work with React Native?

v3 is designed for React web applications. React Native support may come in a future version.

### My app uses Create React App. Do I need changes?

Just update imports and add the provider. CRA works the same as before.

### My app uses Next.js. What changes are needed?

1. Add `'use client'` directive to components using the hook
2. Wrap with provider at the layout level
3. See the Next.js section in README.md

## Need Help?

- 📖 [Full Documentation](https://docs.hashconnect.io)
- 💬 [GitHub Issues](https://github.com/bitlabs/hash-connect-sdk/issues)
- 📧 support@bitlabs.com
