# Pusher Connection Monitoring & Reconnection Strategy

## Overview

The Hash Connect SDK now includes visual connection status indicators and automatic reconnection capabilities for the Pusher WebSocket connection. This ensures users are always aware of the connection state and the system can recover from temporary network issues.

## Features

### 1. Visual Connection Indicator

The QR code modal now displays a connection status indicator at the top showing the current Pusher connection state:

- **🟠 Connecting** - Initial connection attempt
- **🟢 Connected** - Successfully connected to Pusher
- **🔴 Disconnected** - Connection lost
- **🔴 Connection Failed** - Connection attempt failed
- **🟠 Reconnecting** - Attempting to reconnect

### 2. Automatic Reconnection

The SDK implements intelligent reconnection logic with:

- **Exponential Backoff**: Delays between reconnection attempts increase exponentially (2s, 4s, 8s, etc.)
- **Maximum Attempts**: Up to 3 automatic reconnection attempts
- **Maximum Delay**: Capped at 30 seconds between attempts
- **Pusher Built-in Reconnection**: Leverages Pusher's native reconnection alongside custom logic

### 3. Connection State Monitoring

Real-time monitoring of Pusher connection states:

- `initialized` - Pusher client created
- `connecting` - Attempting to establish connection
- `connected` - Connection established successfully
- `unavailable` - Network unavailable (automatic reconnect)
- `failed` - Connection attempt failed
- `disconnected` - Connection closed

## Implementation Details

### Architecture

The implementation consists of:

1. **Type Definitions** (`src/types/pusher.ts`)

   - Added `PusherConnection` interface
   - Added `ConnectionState` type
   - Enhanced `PusherClient` interface with connection property

2. **Modal UI Updates** (`src/utils/modal.ts`)

   - Added connection status indicator HTML
   - Added `updateConnectionStatus()` utility function
   - Status updates are non-blocking (gracefully handles modal not open)

3. **Connection Logic** (`src/utils/connect.ts`)

   - `monitorPusherConnection()` - Sets up connection state listeners
   - `handleConnectionFailure()` - Manages reconnection with exponential backoff
   - `disconnect()` - Properly cleanup connection and prevent reconnects
   - Reconnection configuration constants

4. **Styling** (`src/styles.css`)
   - Status indicator styles with color coding
   - Pulse animations for active states (connecting, reconnecting)
   - Positioned at top of modal for visibility

### Reconnection Configuration

```typescript
const RECONNECT_CONFIG = {
  maxAttempts: 3, // Maximum automatic reconnection attempts
  baseDelay: 2000, // Base delay: 2 seconds
  maxDelay: 30000, // Maximum delay: 30 seconds
};
```

### Exponential Backoff Formula

```
delay = min(baseDelay × 2^attempt, maxDelay)

Attempt 1: min(2000 × 2^0, 30000) = 2,000ms  (2 seconds)
Attempt 2: min(2000 × 2^1, 30000) = 4,000ms  (4 seconds)
Attempt 3: min(2000 × 2^2, 30000) = 8,000ms  (8 seconds)
```

## Usage

No changes required for developers! The connection monitoring is automatic:

```typescript
// Vanilla JS - Automatic
window.HASHConnect.connect();

// React - Automatic
const { connect } = useHashConnect(config);
connect();
```

## Debugging

Enable debug logs to monitor connection state:

```typescript
const config = {
  // ... other config
  DEBUG: true, // Enable debug logging
};
```

Debug log examples:

```
[Pusher] Setting up connection state monitoring...
[Pusher] Initial connection state: connecting
[Pusher] Connection state changed: connecting -> connected
[Pusher] ✅ Successfully connected to Pusher
[Pusher] Connection state changed: connected -> disconnected
[Reconnect] Attempting reconnection 1/3 in 2000ms
[Reconnect] Calculated delay for attempt 1: 2000ms
[Reconnect] Executing reconnection attempt 1
```

## Error Handling

### Connection Failures

When a connection fails:

1. UI updates to show "Connection Failed" status
2. System attempts automatic reconnection with exponential backoff
3. After 3 failed attempts, status remains "Failed"
4. User can manually close and reopen modal to retry

### Network Unavailable

When network becomes unavailable:

1. Pusher automatically detects the issue
2. Status updates to "Reconnecting"
3. Pusher's built-in reconnection activates
4. Once network returns, connection is automatically restored

### Manual Disconnect

When user manually disconnects:

1. `isManualDisconnect` flag is set
2. Automatic reconnection is disabled
3. Connection cleanup is performed
4. No reconnection attempts are made

## Best Practices

### For Debugging Connection Issues

1. **Enable Debug Mode**

   ```typescript
   const config = { DEBUG: true };
   ```

2. **Check Browser Console**

   - Look for `[Pusher]` and `[Reconnect]` prefixed logs
   - Monitor connection state changes
   - Check for error messages

3. **Monitor Network Tab**

   - Verify WebSocket connection in browser DevTools
   - Check for connection upgrades/downgrades

4. **Check Pusher Dashboard**
   - Verify channel subscriptions
   - Monitor connection events
   - Check for rate limiting

### For Production

1. **Monitor Connection States**

   - Track how often reconnections occur
   - Monitor failure rates
   - Alert on persistent failures

2. **Adjust Configuration**

   - Increase `maxAttempts` for unstable networks
   - Adjust `baseDelay` based on average reconnection time
   - Modify `maxDelay` for different use cases

3. **User Feedback**
   - The visual indicator provides immediate feedback
   - Consider adding retry button for failed states
   - Notify users of persistent connection issues

## Technical Notes

### Why Exponential Backoff?

Exponential backoff prevents overwhelming the server with reconnection attempts and gives the network time to stabilize.

### Why 3 Attempts?

Three attempts balance user experience with resource usage:

- **1st attempt (2s)**: Catches brief network glitches
- **2nd attempt (4s)**: Handles short disconnections
- **3rd attempt (8s)**: Last chance for automatic recovery

After 3 attempts, manual intervention prevents infinite loops and battery drain.

### State Persistence

Connection state is **not** persisted. Each page load establishes a fresh connection. This ensures clean state and prevents stale connection issues.

### React Integration

The connection monitoring works seamlessly with the React `useHashConnect` hook. Connection events are dispatched to update React state automatically.

## Future Enhancements

Potential improvements:

1. **Manual Retry Button**: Show retry button after max attempts reached
2. **Configurable Reconnection**: Allow apps to customize reconnection behavior
3. **Connection Health Checks**: Periodic pings to verify connection health
4. **Metrics & Analytics**: Track connection quality metrics
5. **User Notifications**: Toast messages for connection state changes

## Troubleshooting

### Indicator Not Showing

- **Issue**: Connection indicator doesn't appear in modal
- **Fix**: Ensure modal is open when connection is established
- **Verify**: Check `#hash-connect-status-indicator` element exists

### Reconnection Not Working

- **Issue**: No automatic reconnection after disconnect
- **Possible Causes**:
  - Manual disconnect triggered (expected behavior)
  - Max attempts reached (3)
  - Invalid Pusher configuration
- **Fix**: Check console logs for reconnection attempts

### Status Stuck on "Connecting"

- **Issue**: Status indicator stuck showing "Connecting..."
- **Possible Causes**:
  - Network issues
  - Invalid Pusher credentials
  - CORS issues
- **Fix**: Check network tab and Pusher configuration

### Multiple Reconnections

- **Issue**: Seeing more reconnections than expected
- **Possible Causes**:
  - Unstable network
  - Server-side disconnections
  - Rate limiting
- **Fix**: Increase `maxDelay` and monitor Pusher dashboard

## Support

For issues or questions:

1. Check debug logs (`DEBUG: true`)
2. Review browser console for errors
3. Verify Pusher configuration
4. Check network connectivity
5. Contact Hash Pass support

## Changelog

### Version 1.0.19 (TBD)

- ✅ Added visual connection status indicator
- ✅ Implemented exponential backoff reconnection
- ✅ Added connection state monitoring
- ✅ Enhanced Pusher type definitions
- ✅ Added comprehensive logging
