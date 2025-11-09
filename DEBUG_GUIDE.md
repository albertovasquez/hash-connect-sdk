# HashConnect SDK - Debug Mode Guide

This guide explains how to use the new debug mode to troubleshoot connection issues and understand the QR modal flow.

## Overview

The HashConnect SDK now includes comprehensive logging capabilities that can be enabled through the React Provider or Hook. When debug mode is enabled, you'll see detailed console logs showing:

- Script loading status
- Modal opening/closing events
- Connection state changes
- Event dispatching and handling
- QR code generation
- Pusher channel subscription
- Error conditions

## Enabling Debug Mode

### Using HashConnectProvider

Add the `debug` prop to enable logging:

```tsx
import { HashConnectProvider } from "@hashpass/connect/react";

function App() {
  return (
    <HashConnectProvider debug={true}>
      <YourApp />
    </HashConnectProvider>
  );
}
```

### Using useHashConnect Hook

Pass the `debug` option to enable logging:

```tsx
import { useHashConnect } from "@hashpass/connect/react";

function MyComponent() {
  const { connect, isConnected, isLoading } = useHashConnect({ debug: true });

  return (
    <div>
      <button onClick={connect}>Connect</button>
      {isLoading && <p>Loading...</p>}
      {isConnected && <p>Connected!</p>}
    </div>
  );
}
```

## Understanding the Log Messages

### Log Prefixes

Each log message is prefixed with its source component:

- `[HashConnectProvider]` - Logs from the React Provider
- `[useHashConnect]` - Logs from the React Hook
- `[UserAgent]` - Logs from the core SDK connection logic
- `[Modal]` - Logs from the modal UI component
- `[Pusher]` - Logs from WebSocket/Pusher events

### Connection Flow

Here's what a successful connection flow looks like in the console:

```
1. [HashConnectProvider] Provider mounted, initializing...
2. [HashConnectProvider] SDK script not found, loading from CDN...
3. [HashConnectProvider] ✅ SDK script loaded successfully
4. [HashConnectProvider] HASHConnect available: true
5. [HashConnectProvider] ✅ Event listener attached for hash-connect-event

6. [HashConnectProvider] 🔗 Connect method called
7. [HashConnectProvider] ✅ HASHConnect SDK is available
8. [HashConnectProvider] Calling window.HASHConnect.connect()...

9. [UserAgent] connect() called
10. [UserAgent] Starting connection process...
11. [UserAgent] Pusher client not initialized, creating...
12. [UserAgent] ✅ Pusher client initialized
13. [UserAgent] No session ID exists, generating new one...
14. [UserAgent] ✅ Session created: { sessionId, QRCodeString, SessionChannelName }
15. [UserAgent] ✅ _connect function found, calling it...

16. [Pusher] Subscribing to channel: private-hc-xxxxx
17. [Pusher] Successfully subscribed to channel: private-hc-xxxxx
18. [Pusher] Binding to event: client-send-authorization-to-site
19. [Pusher] Binding to event: client-send-unauthorization-to-site
20. [Pusher] Binding to event: client-hash-pass-connect

21. [Modal] openModal called
22. [Modal] Checking existing session: { hasSession: false }
23. [Modal] Body element found, creating modal...
24. [Modal] ✅ Modal element created and added to DOM
25. [Modal] ✅ Close button found, attaching click handler
26. [Modal] Calling onReady callback...

27. [UserAgent] onReady callback executing...
28. [UserAgent] Storing session ID: xxxxx
29. [UserAgent] Clearing old credentials from storage
30. [UserAgent] ✅ QR code div found
31. [UserAgent] Generating QR code...
32. [UserAgent] ✅ QR code generated successfully
33. [Modal] ✅ onReady callback completed

34. [UserAgent] ✅ _connect function completed
35. [UserAgent] ✅ Connection completed successfully
36. [HashConnectProvider] ✅ Connect call completed
```

### When User Scans QR Code

```
1. [Pusher] ✅ Received: client-hash-pass-connect { address: "0x...", hasSignature: true }
2. [Pusher] Setting up user subscription...
3. [Pusher] Subscribing to user channel: private-0x...
4. [Pusher] ✅ User channel subscribed successfully

5. [Pusher] ✅ Received: client-send-authorization-to-site { address: "0x...", hasAccessToken: true, hasRefreshToken: true }
6. [HashConnect] ✅ Connection successful!

7. [HashConnectProvider] 📨 Received hash-connect-event: { eventType: "connected", user: "0x..." }
8. [HashConnectProvider] ✅ Connected event received, updating state...
```

## Common Issues and How to Debug

### Issue: Modal Not Appearing

**Look for these log messages:**

```
❌ [Modal] Body element not found
```

**Solution:** The modal requires a `<body>` tag. Ensure your React app is mounted in the document body.

```
❌ [UserAgent] QRCodeString is null, cannot open modal
```

**Solution:** Session wasn't created properly. Check if Pusher client initialization is failing.

```
❌ [UserAgent] Failed to load QR code generator
```

**Solution:** Network issue loading the QR code library. Check console for script loading errors.

### Issue: SDK Not Loading

**Look for these log messages:**

```
❌ [HashConnectProvider] Failed to load SDK script: [error details]
```

**Solution:** Check network connection and CDN availability. You may need to host the SDK locally.

```
❌ HashConnect SDK not loaded
```

**Solution:** The SDK script hasn't finished loading yet. Consider adding a loading state or delay before calling connect.

### Issue: QR Code Not Generating

**Look for these log messages:**

```
❌ [UserAgent] QR code div not found in DOM
```

**Solution:** The modal was closed or removed before the QR code could render. Check if there are competing modal close events.

```
❌ [UserAgent] Error rendering QR code: [error details]
```

**Solution:** The QR code library encountered an error. Check the error details for specifics.

### Issue: Not Receiving Connection Events

**Look for these log messages:**

```
[Pusher] Subscribing to channel: private-hc-xxxxx
```

If you don't see subsequent "Received" messages, the WebSocket connection may be blocked or the mobile app isn't sending events.

**Solution:**

- Check browser console for WebSocket errors
- Verify Pusher configuration
- Ensure the mobile app is properly connected to the same Pusher instance

## Production Usage

**⚠️ Important:** Disable debug mode in production to avoid verbose console output and potential performance impact:

```tsx
// Development
<HashConnectProvider debug={process.env.NODE_ENV === 'development'}>

// Or
const { connect } = useHashConnect({
  debug: process.env.NODE_ENV === 'development'
});
```

## Additional Debugging

### Check Window Object

In the browser console, you can manually check:

```javascript
// Check if SDK is loaded
console.log(window.HASHConnect);

// Check available methods
console.log(Object.keys(window.HASHConnect));

// Check if ready
console.log(window.HASHConnect?.isReady());

// Get current user
console.log(window.HASHConnect?.getUser());
```

### Check Local Storage

The SDK stores session data in localStorage:

```javascript
// Check stored session
console.log(localStorage.getItem("hc:sessionId"));
console.log(localStorage.getItem("hc:address"));
console.log(localStorage.getItem("hc:clubId"));
console.log(localStorage.getItem("hc:accessToken"));
```

### Monitor DOM Changes

Watch for modal creation:

```javascript
// Check if modal exists
console.log(document.getElementById("hash-connect-modal"));

// Check if QR code div exists
console.log(document.getElementById("hash-connect-qrcode"));
```

## Getting Help

If you're still experiencing issues after enabling debug mode:

1. Copy the complete console output
2. Include browser version and OS
3. Describe what you expected vs. what happened
4. Share any error messages
5. Open an issue on the GitHub repository with this information

## Example Debug Session

Here's a complete example showing debug mode in action:

```tsx
import React from "react";
import { useHashConnect } from "@hashpass/connect/react";

function DebugExample() {
  const { connect, disconnect, isConnected, isLoading, userAddress, error } =
    useHashConnect({ debug: true });

  return (
    <div>
      <h1>HashConnect Debug Example</h1>

      <div>
        <strong>Status:</strong> {isConnected ? "Connected" : "Disconnected"}
      </div>

      {isLoading && <div>Loading...</div>}

      {error && <div style={{ color: "red" }}>Error: {error}</div>}

      {userAddress && (
        <div>
          <strong>Address:</strong> {userAddress}
        </div>
      )}

      <div>
        <button onClick={connect} disabled={isConnected || isLoading}>
          Connect
        </button>
        <button onClick={disconnect} disabled={!isConnected}>
          Disconnect
        </button>
      </div>

      <div
        style={{ marginTop: "20px", padding: "10px", background: "#f5f5f5" }}
      >
        <strong>Debug Tip:</strong> Open your browser's Developer Console (F12)
        to see detailed connection logs.
      </div>
    </div>
  );
}

export default DebugExample;
```

With debug mode enabled, this component will output detailed logs showing:

- When the component mounts and initializes
- When the connect button is clicked
- The entire connection flow
- Any errors that occur
- When events are received
- State changes

This makes it much easier to diagnose issues and understand the connection lifecycle.
