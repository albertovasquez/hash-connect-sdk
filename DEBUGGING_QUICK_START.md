# Quick Start: Debugging HashConnect Connection Issues

## Enable Debug Mode

### Option 1: Using Provider

```tsx
import { HashConnectProvider } from "@hashpass/connect/react";

<HashConnectProvider debug={true}>
  <App />
</HashConnectProvider>;
```

### Option 2: Using Hook

```tsx
import { useHashConnect } from "@hashpass/connect/react";

const { connect, isConnected } = useHashConnect({ debug: true });
```

## What You'll See

Once debug mode is enabled, open your browser's **Developer Console** (F12 or Cmd+Option+I on Mac).

You'll see detailed logs showing:

```
[HashConnectProvider] Provider mounted, initializing...
[HashConnectProvider] SDK script not found, loading from CDN...
[HashConnectProvider] ✅ SDK script loaded successfully
[HashConnectProvider] 🔗 Connect method called
[UserAgent] connect() called
[UserAgent] Starting connection process...
[UserAgent] ✅ Pusher client initialized
[UserAgent] ✅ Session created: { sessionId, QRCodeString, SessionChannelName }
[Modal] openModal called
[Modal] ✅ Modal element created and added to DOM
[UserAgent] ✅ QR code generated successfully
```

## Common Issues & Quick Fixes

### ❌ Modal Not Appearing

**Check the console for:**

```
❌ [Modal] Body element not found
```

➡️ **Fix:** Ensure your app has a `<body>` tag and is properly mounted.

```
❌ [UserAgent] QRCodeString is null, cannot open modal
```

➡️ **Fix:** Pusher initialization failed. Check network connectivity.

```
❌ [UserAgent] QR code div not found in DOM
```

➡️ **Fix:** Modal was closed too quickly. Check for competing close handlers.

### ❌ SDK Not Loading

**Check the console for:**

```
❌ [HashConnectProvider] Failed to load SDK script
```

➡️ **Fix:** CDN issue or network blocking. Consider hosting SDK locally.

```
❌ HashConnect SDK not loaded
```

➡️ **Fix:** Script still loading. Add a loading state before calling connect.

### ❌ Connection Not Working

**Check the console for:**

```
[Pusher] Subscribing to channel: private-hc-xxxxx
```

If you see no "Received" messages after this:
➡️ **Fix:** WebSocket blocked or mobile app not sending events. Check Pusher config.

## Quick Debug Checklist

Run these in your browser console:

```javascript
// 1. Check if SDK loaded
console.log("SDK loaded:", !!window.HASHConnect);

// 2. Check SDK methods
console.log("Methods:", Object.keys(window.HASHConnect || {}));

// 3. Check session storage
console.log("Session:", localStorage.getItem("hc:sessionId"));

// 4. Check if modal exists
console.log("Modal:", !!document.getElementById("hash-connect-modal"));

// 5. Check if QR div exists
console.log("QR Div:", !!document.getElementById("hash-connect-qrcode"));
```

## Complete Working Example

```tsx
import React from "react";
import { useHashConnect } from "@hashpass/connect/react";

function App() {
  const { connect, disconnect, isConnected, isLoading, userAddress, error } =
    useHashConnect({
      debug: true, // 👈 Enable debug mode
    });

  React.useEffect(() => {
    console.log("Connection state changed:", {
      isConnected,
      isLoading,
      userAddress,
      error,
    });
  }, [isConnected, isLoading, userAddress, error]);

  return (
    <div>
      <h1>HashConnect Debug Example</h1>

      {error && (
        <div style={{ color: "red", padding: "10px", border: "1px solid red" }}>
          Error: {error}
        </div>
      )}

      <div>Status: {isConnected ? "✅ Connected" : "⭕ Disconnected"}</div>

      {isLoading && <div>⏳ Loading...</div>}

      {userAddress && <div>Address: {userAddress}</div>}

      <button onClick={connect} disabled={isConnected || isLoading}>
        {isLoading ? "Connecting..." : "Connect"}
      </button>

      {isConnected && <button onClick={disconnect}>Disconnect</button>}
    </div>
  );
}

export default App;
```

## Production Build

**Important:** Disable debug mode in production:

```tsx
// Automatically enable only in development
const isDev = process.env.NODE_ENV === "development";

<HashConnectProvider debug={isDev}>
  <App />
</HashConnectProvider>;

// Or in hook
const hook = useHashConnect({ debug: isDev });
```

## Need More Help?

See the complete [DEBUG_GUIDE.md](./DEBUG_GUIDE.md) for:

- Detailed log flow explanation
- Advanced troubleshooting
- DOM inspection techniques
- WebSocket debugging
- Complete error reference

## Reporting Issues

When reporting issues, include:

1. Complete console output with debug mode enabled
2. Browser and OS version
3. Your code snippet
4. Expected vs actual behavior
5. Any error messages or stack traces

This helps us help you faster! 🚀
