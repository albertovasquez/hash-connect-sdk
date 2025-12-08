# Fixing "Connection Blocked" Issue

## The Problem

You see `[UserAgent] connect() called` but nothing happens after that. This happens when the SDK has a **stuck auto-connect** from a previous session.

## The Symptoms

```
[HashConnectProvider] 🔗 Connect method called
[HashConnectProvider] ✅ HASHConnect SDK is available
[HashConnectProvider] Calling window.HASHConnect.connect()...
[UserAgent] connect() called
[UserAgent] ⚠️ Connection blocked! Already connected or connecting
```

## Why It Happens

1. You connected previously, which stored a session ID in localStorage
2. When your app loads, the SDK tries to auto-reconnect with that session
3. The auto-reconnect gets stuck or fails silently
4. The SDK thinks a connection is "in progress" and blocks your manual connect attempt

## Quick Fix

### Option 1: Clear via Console

Open your browser console (F12) and run:

```javascript
// Clear stuck session
localStorage.removeItem("hc:sessionId");
localStorage.removeItem("hc:address");
localStorage.removeItem("hc:accessToken");
localStorage.removeItem("hc:refreshToken");
localStorage.removeItem("hc:signature");

// Reload the page
location.reload();
```

### Option 2: Add a Clear Button (Recommended for Development)

Add this to your app during development:

```tsx
function MyComponent() {
  const { connect, disconnect, isConnected } = useHashConnect({ debug: true });

  const clearSession = () => {
    localStorage.removeItem("hc:sessionId");
    localStorage.removeItem("hc:address");
    localStorage.removeItem("hc:accessToken");
    localStorage.removeItem("hc:refreshToken");
    localStorage.removeItem("hc:signature");
    window.location.reload();
  };

  return (
    <div>
      <button onClick={connect}>Connect</button>
      {isConnected && <button onClick={disconnect}>Disconnect</button>}

      {/* Development helper */}
      {process.env.NODE_ENV === "development" && (
        <button onClick={clearSession} style={{ background: "red" }}>
          🗑️ Clear Stuck Session
        </button>
      )}
    </div>
  );
}
```

## Prevention

### Proper Disconnect Flow

Always disconnect properly before closing your app:

```tsx
function MyComponent() {
  const { disconnect, isConnected } = useHashConnect({ debug: true });

  React.useEffect(() => {
    // Clean up on unmount if needed
    return () => {
      if (isConnected) {
        // Optional: disconnect on unmount
        // disconnect();
      }
    };
  }, [isConnected, disconnect]);

  return <div>{/* Your UI */}</div>;
}
```

## Improved Logging (v1.0.4+)

As of version 1.0.4, the SDK now shows clearer warnings when a connection is blocked:

```
[UserAgent] connect() called
[UserAgent] Current state: { isConnected: false, isConnecting: true, hasSessionId: true }
[UserAgent] ⚠️ Connection blocked! Already connected or connecting {
  isConnected: false,
  isConnecting: true,
  sessionId: "6bfxbp5q...",
  hasStoredSession: true
}
[UserAgent] 💡 Tip: If stuck, clear localStorage and refresh the page
```

If you see this warning, follow the Quick Fix steps above.

## Auto-Connect Improvements (v1.0.4+)

The SDK now automatically cleans up failed auto-connect attempts:

```
[HashConnect] Attempting auto-connect with stored session...
[HashConnect] ❌ Auto-connect failed: [error]
[HashConnect] Cleaning up failed session...
[HashConnect] You can now manually reconnect
```

After this, you should be able to click connect manually without needing to clear localStorage.

## When to Clear Session Storage

You should clear the session when:

1. ✅ **Connection gets stuck** - Shows "Connection blocked" warning
2. ✅ **Testing/Development** - Want to start fresh
3. ✅ **Switching accounts** - Need to connect with a different wallet
4. ✅ **After errors** - Auto-connect keeps failing

You should NOT clear session when:

1. ❌ **Normal disconnect** - Use the disconnect button instead
2. ❌ **Page refresh** - Session should persist across refreshes
3. ❌ **During active connection** - Let the connection complete first

## Debugging

To check if you have a stored session:

```javascript
console.log("Session ID:", localStorage.getItem("hc:sessionId"));
console.log("Address:", localStorage.getItem("hc:address"));
console.log("Has tokens:", {
  access: !!localStorage.getItem("hc:accessToken"),
  refresh: !!localStorage.getItem("hc:refreshToken"),
});
```

If you see a Session ID but can't connect, you have a stuck session.

## Future Improvements

We're working on:

- Automatic detection and cleanup of stuck sessions
- Session timeout/expiry handling
- Better auto-reconnect retry logic
- UI indicator when auto-connect is happening

## Need Help?

If clearing the session doesn't fix the issue:

1. Enable debug mode: `useHashConnect({ debug: true })`
2. Clear localStorage and refresh
3. Try connecting again
4. Copy ALL console logs (from page load to connect attempt)
5. Report the issue with the logs

The logs will show exactly where the connection process is failing.
