# NPM Package Usage Guide

## Important: Two-Step Import for React

When using the React components from the npm package, you need to **import the main SDK first** to initialize `window.HASHConnect`, then import the React components.

### ✅ Correct Usage

```tsx
// Step 1: Import the main SDK (initializes window.HASHConnect)
import "@hashpass/connect";

// Step 2: Import React components
import { useHashConnect } from "@hashpass/connect/react";

function MyComponent() {
  const { connect, isConnected, isLoading, userAddress } = useHashConnect({
    debug: true,
  });

  return (
    <div>
      {!isConnected && (
        <button onClick={connect} disabled={isLoading}>
          {isLoading ? "Connecting..." : "Connect Wallet"}
        </button>
      )}

      {isConnected && <div>Connected: {userAddress}</div>}
    </div>
  );
}
```

### ❌ Wrong Usage

```tsx
// This won't work - React components need the main SDK to be imported first
import { useHashConnect } from "@hashpass/connect/react";

function MyComponent() {
  const { connect } = useHashConnect(); // ❌ window.HASHConnect not available
  // ...
}
```

## With Provider

```tsx
// app.tsx or main entry file
import "@hashpass/connect"; // ✅ Import main SDK first
import { HashConnectProvider } from "@hashpass/connect/react";

function App() {
  return (
    <HashConnectProvider debug={true}>
      <MyApp />
    </HashConnectProvider>
  );
}
```

```tsx
// MyComponent.tsx
import { useHashConnectContext } from "@hashpass/connect/react";

function MyComponent() {
  const { connect, isConnected, userAddress } = useHashConnectContext();

  return (
    <div>
      {!isConnected && <button onClick={connect}>Connect</button>}
      {isConnected && <div>Connected: {userAddress}</div>}
    </div>
  );
}
```

## Why Two Imports?

The `@hashpass/connect` package exports two separate bundles:

1. **Main SDK** (`@hashpass/connect`) - Vanilla JavaScript SDK that:

   - Initializes `window.HASHConnect`
   - Includes styles, QR code generation, Pusher integration
   - Works standalone without React

2. **React Components** (`@hashpass/connect/react`) - React wrappers that:
   - Expect `window.HASHConnect` to already exist
   - Provide hooks and providers for React apps
   - Are lightweight and don't include the core SDK

By separating them, you can:

- Use the vanilla SDK without React
- Keep the React bundle small
- Avoid loading the SDK multiple times

## Installation

```bash
npm install @hashpass/connect
```

## TypeScript

TypeScript types are included:

```tsx
import { useHashConnect, UseHashConnectReturn } from "@hashpass/connect/react";

const myHook: UseHashConnectReturn = useHashConnect({ debug: true });
```

## Debugging

Enable debug mode to see detailed logs:

```tsx
const { connect } = useHashConnect({ debug: true });

// Or with Provider
<HashConnectProvider debug={true}>
  <App />
</HashConnectProvider>;
```

This will show logs like:

```
[useHashConnect] Hook mounted, initializing...
[useHashConnect] HASHConnect available: true
[useHashConnect] 🔗 Connect method called
[HashConnect] handleHashConnect called with data: {...}
[HashConnect] Dispatching connected event...
[useHashConnect] 📨 Received hash-connect-event: { eventType: 'connected', ... }
```

## Complete Example

```tsx
// main.tsx or app.tsx
import React from "react";
import ReactDOM from "react-dom/client";

// Step 1: Import main SDK
import "@hashpass/connect";

// Step 2: Import React components
import { useHashConnect } from "@hashpass/connect/react";

function App() {
  const { connect, disconnect, isConnected, isLoading, userAddress, error } =
    useHashConnect({ debug: process.env.NODE_ENV === "development" });

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>My DApp</h1>

      {!isConnected && (
        <button onClick={connect} disabled={isLoading}>
          {isLoading ? "Connecting..." : "Connect Wallet"}
        </button>
      )}

      {isConnected && (
        <div>
          <p>Connected: {userAddress}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## Troubleshooting

### "HASHConnect SDK not initialized"

If you see this error in the console:

```
❌ HASHConnect SDK not initialized. Make sure you imported from @hashpass/connect/react
```

**Solution:** Make sure you import the main SDK before the React components:

```tsx
import "@hashpass/connect"; // ✅ Add this
import { useHashConnect } from "@hashpass/connect/react";
```

### Modal not showing / isLoading stuck

Enable debug mode to see detailed logs:

```tsx
const hook = useHashConnect({ debug: true });
```

Check the console for where the flow breaks. See [DEBUG_GUIDE.md](./DEBUG_GUIDE.md) for more info.

### "window.HASHConnect is undefined"

The main SDK hasn't been imported or hasn't finished initializing. Make sure:

1. You imported `'@hashpass/connect'` before using React components
2. The import is at the top level of your app, not inside a component
3. Your bundler (Webpack/Vite) is correctly processing the imports

## CDN vs NPM

### CDN Usage (Vanilla JS)

For vanilla JavaScript apps without a bundler:

```html
<script src="https://unpkg.com/@hashpass/connect/dist/hash-connect.js"></script>
<script>
  // window.HASHConnect is now available
  window.HASHConnect.connect();
</script>
```

### NPM Usage (React/Modern Apps)

For apps with a bundler (Webpack, Vite, etc.):

```tsx
import "@hashpass/connect"; // Initializes window.HASHConnect
import { useHashConnect } from "@hashpass/connect/react";
```

**Benefits of NPM:**

- Versioning control
- Tree shaking
- TypeScript types
- Works offline
- No CDN dependency
- Faster loading (bundled with your app)

## Next Steps

- Read [REACT.md](./REACT.md) for full React documentation
- See [DEBUG_GUIDE.md](./DEBUG_GUIDE.md) for debugging tips
- Check [INTEGRATION_EXAMPLES.md](./INTEGRATION_EXAMPLES.md) for more examples
