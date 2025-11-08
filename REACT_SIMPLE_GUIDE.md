# React Usage Guide

## Installation

```bash
npm install @hashpass/connect
```

## Simple Usage - One Import!

```tsx
import { useHashConnect } from "@hashpass/connect/react";

function MyComponent() {
  const { connect, isConnected, isLoading, userAddress } = useHashConnect({
    debug: true, // Enable detailed console logs
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

**That's it!** Just import from `@hashpass/connect/react` and everything works. ✨

## Complete Example

```tsx
import React from "react";
import { useHashConnect } from "@hashpass/connect/react";

function App() {
  const { connect, disconnect, isConnected, isLoading, userAddress, error } =
    useHashConnect({
      debug: process.env.NODE_ENV === "development",
    });

  if (error) {
    return <div style={{ color: "red" }}>Error: {error}</div>;
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

export default App;
```

## Using Provider (Optional)

If you prefer Context API pattern:

```tsx
import {
  HashConnectProvider,
  useHashConnectContext,
} from "@hashpass/connect/react";

function App() {
  return (
    <HashConnectProvider debug={true}>
      <MyComponent />
    </HashConnectProvider>
  );
}

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

## API Reference

### useHashConnect(options?)

```tsx
const {
  connect, // () => Promise<void> - Opens QR modal
  disconnect, // () => void - Disconnects wallet
  isConnected, // boolean - Connection status
  isLoading, // boolean - Loading state
  userAddress, // string | null - Connected wallet address
  error, // string | null - Error message if any
  getToken, // () => Promise<string | null> - Get auth token
  makeAuthRequest, // <T>(url, options?) => Promise<T> - Make authenticated request
} = useHashConnect({
  debug: true, // Enable console logs (optional)
});
```

### HashConnectProvider

```tsx
<HashConnectProvider debug={true}>{children}</HashConnectProvider>
```

### useHashConnectContext()

Same API as `useHashConnect()` but must be used within `HashConnectProvider`.

## Debug Mode

Enable debug mode to see detailed logs:

```tsx
const hook = useHashConnect({ debug: true });
```

You'll see logs like:

```
[useHashConnect] Hook mounted, initializing...
[useHashConnect] HASHConnect available: true
[useHashConnect] 🔗 Connect method called
[UserAgent] connect() called
[UserAgent] Starting connection process...
[Modal] openModal called
[Modal] ✅ Modal element created and added to DOM
[UserAgent] ✅ QR code generated successfully
[Pusher] ✅ Received: client-send-authorization-to-site
[HashConnect] handleHashConnect called with data: {...}
[HashConnect] Dispatching connected event...
[useHashConnect] 📨 Received hash-connect-event: { eventType: 'connected', ... }
[useHashConnect] State updated: { isLoading: false, isConnected: true, ... }
```

## TypeScript

Full TypeScript support included:

```tsx
import { useHashConnect, UseHashConnectReturn } from "@hashpass/connect/react";

const hook: UseHashConnectReturn = useHashConnect({ debug: true });
```

## Common Patterns

### Loading State

```tsx
function ConnectButton() {
  const { connect, isLoading } = useHashConnect();

  return (
    <button onClick={connect} disabled={isLoading}>
      {isLoading ? (
        <>
          <Spinner /> Connecting...
        </>
      ) : (
        "Connect Wallet"
      )}
    </button>
  );
}
```

### Protected Route

```tsx
function ProtectedPage() {
  const { isConnected, connect } = useHashConnect();

  if (!isConnected) {
    return (
      <div>
        <h1>Please connect your wallet</h1>
        <button onClick={connect}>Connect</button>
      </div>
    );
  }

  return <div>Protected content</div>;
}
```

### Making Authenticated Requests

```tsx
function UserProfile() {
  const { makeAuthRequest, isConnected } = useHashConnect();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (isConnected) {
      makeAuthRequest<UserProfile>("/api/profile")
        .then(setProfile)
        .catch(console.error);
    }
  }, [isConnected, makeAuthRequest]);

  return <div>{profile ? <div>{profile.name}</div> : "Loading..."}</div>;
}
```

### Custom Token Usage

```tsx
function CustomAuth() {
  const { getToken } = useHashConnect();

  const handleSubmit = async () => {
    const token = await getToken();
    if (token) {
      // Use token for your custom auth flow
      await fetch("/api/authenticate", {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  };

  return <button onClick={handleSubmit}>Submit</button>;
}
```

## Troubleshooting

### Modal Not Showing

Enable debug mode and check console:

```tsx
const hook = useHashConnect({ debug: true });
```

Look for:

- `[Modal] openModal called`
- `[Modal] ✅ Modal element created and added to DOM`
- `[UserAgent] ✅ QR code generated successfully`

### isLoading Stuck on True

This should be fixed in v1.0.9+. If you still see this:

1. Enable debug mode
2. Look for `[HashConnect] Dispatching connected event...`
3. If you don't see it, clear localStorage and try again:

```javascript
localStorage.clear();
location.reload();
```

### Connection State Not Updating

Make sure you're using the latest version:

```bash
npm update @hashpass/connect
```

Check version in console:

```javascript
console.log(window.HASHConnect);
```

## Advanced Usage

### Disconnect on Component Unmount

```tsx
function MyComponent() {
  const { disconnect, isConnected } = useHashConnect();

  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [isConnected, disconnect]);

  return <div>...</div>;
}
```

### Multiple Instances (Not Recommended)

The SDK maintains a singleton instance of `window.HASHConnect`. Multiple hook instances will share the same connection state, which is usually what you want. If you need isolation, consider using multiple providers in different parts of your app tree.

## Performance Tips

1. **Use debug mode only in development:**

   ```tsx
   debug: process.env.NODE_ENV === "development";
   ```

2. **Memoize connect handlers:**

   ```tsx
   const handleConnect = useCallback(() => {
     connect();
   }, [connect]);
   ```

3. **Use Provider for global state:**
   Wrap your app root with Provider to avoid prop drilling.

## Next Steps

- Check [DEBUG_GUIDE.md](./DEBUG_GUIDE.md) for detailed debugging
- See [STUCK_CONNECTION_FIX.md](./STUCK_CONNECTION_FIX.md) for connection issues
- Read [REACT.md](./REACT.md) for full documentation

## Support

If you encounter issues:

1. Enable debug mode
2. Copy console logs
3. Include browser/OS version
4. Open an issue on GitHub with the details
