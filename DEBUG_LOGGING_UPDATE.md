# HashConnect SDK - Debug Logging Update

## Summary

Added comprehensive debug logging capabilities to the HashConnect SDK to help developers diagnose connection issues and understand the QR modal flow.

## Changes Made

### 1. HashConnectProvider Component (`src/react/HashConnectProvider.tsx`)

**Added:**
- Optional `debug` prop to enable logging
- Internal `log()` and `logError()` helper functions
- Detailed logging for:
  - Provider initialization
  - SDK script loading (success/failure)
  - Event listener attachment
  - Connection state changes
  - Connect method execution
  - Disconnect method execution
  - HASHConnect SDK availability checks

**New Props:**
```typescript
interface HashConnectProviderProps {
  children: React.ReactNode;
  debug?: boolean;  // 👈 NEW
}
```

**Usage:**
```tsx
<HashConnectProvider debug={true}>
  <App />
</HashConnectProvider>
```

### 2. useHashConnect Hook (`src/react/useHashConnect.ts`)

**Added:**
- Optional `debug` parameter in options
- Internal `log()` and `logError()` helper functions
- Detailed logging for:
  - Hook initialization
  - SDK script loading
  - Connection checking
  - Event handling
  - Token retrieval
  - All connection state changes

**New Interface:**
```typescript
interface UseHashConnectOptions {
  debug?: boolean;  // 👈 NEW
}

function useHashConnect(options?: UseHashConnectOptions): UseHashConnectReturn
```

**Usage:**
```tsx
const { connect } = useHashConnect({ debug: true });
```

### 3. Modal Utilities (`src/utils/modal.ts`)

**Added:**
- Console logging for all modal operations (always enabled)
- Detailed logs for:
  - Modal open/close operations
  - Session checking
  - DOM element creation
  - QR code div availability
  - Button handler attachment
  - onReady callback execution

**Key Logs:**
```
[Modal] openModal called
[Modal] ✅ Modal element created and added to DOM
[Modal] ✅ Close button found, attaching click handler
[Modal] Calling onReady callback...
[Modal] ✅ onReady callback completed
```

### 4. UserAgent Entity (`src/domains/UserAgent/entity.ts`)

**Added:**
- Console logging for core SDK operations (always enabled)
- Detailed logs for:
  - Connection initialization
  - Pusher client setup
  - Session ID generation
  - Modal opening
  - QR code generation
  - Storage operations
  - All error conditions

**Key Logs:**
```
[UserAgent] connect() called
[UserAgent] Starting connection process...
[UserAgent] ✅ Pusher client initialized
[UserAgent] ✅ Session created
[UserAgent] openModal() called
[UserAgent] ✅ QR code generated successfully
```

## Log Prefixes

All logs are prefixed for easy identification:
- `[HashConnectProvider]` - React Provider logs (optional)
- `[useHashConnect]` - React Hook logs (optional)
- `[Modal]` - Modal operations (always on)
- `[UserAgent]` - Core SDK operations (always on)
- `[Pusher]` - WebSocket events (always on, already existed)

## Logging Strategy

### Conditional Logs (debug mode required)
- React Provider logs
- React Hook logs

These are controlled by the `debug` prop/option and only appear when explicitly enabled.

### Always-On Logs
- Modal operations
- UserAgent (core SDK)
- Pusher events
- Error messages

These logs are always output to help diagnose issues even without debug mode enabled.

## Benefits

1. **Easy Troubleshooting**: Developers can quickly see where the connection flow breaks
2. **Non-Invasive**: Debug mode is opt-in, no performance impact in production
3. **Comprehensive**: Covers the entire connection lifecycle from SDK load to QR display
4. **Contextual**: Each log includes relevant data and state information
5. **User-Friendly**: Clear emojis and descriptive messages make logs easy to scan

## Documentation

Created two new documentation files:

### DEBUG_GUIDE.md
Comprehensive guide covering:
- How to enable debug mode
- Understanding log messages
- Complete connection flow walkthrough
- Common issues and solutions
- Advanced debugging techniques
- Production usage recommendations

### DEBUGGING_QUICK_START.md
Quick reference guide with:
- Fast setup instructions
- Common issues and quick fixes
- Debug checklist
- Working code examples
- Console commands for manual inspection

## Example Output

When debug mode is enabled, developers will see a complete flow like:

```
[HashConnectProvider] Provider mounted, initializing...
[HashConnectProvider] SDK script not found, loading from CDN...
[HashConnectProvider] ✅ SDK script loaded successfully
[HashConnectProvider] HASHConnect available: true
[HashConnectProvider] ✅ Event listener attached for hash-connect-event

[HashConnectProvider] 🔗 Connect method called
[HashConnectProvider] ✅ HASHConnect SDK is available
[HashConnectProvider] Calling window.HASHConnect.connect()...

[UserAgent] connect() called
[UserAgent] Starting connection process...
[UserAgent] ✅ Pusher client initialized
[UserAgent] ✅ Session created: { sessionId: "abc123", ... }

[Modal] openModal called
[Modal] ✅ Modal element created and added to DOM
[Modal] ✅ Close button found, attaching click handler
[Modal] Calling onReady callback...

[UserAgent] onReady callback executing...
[UserAgent] ✅ QR code div found
[UserAgent] Generating QR code...
[UserAgent] ✅ QR code generated successfully

[HashConnectProvider] ✅ Connect call completed
```

## Backward Compatibility

✅ **Fully backward compatible**
- The `debug` prop/option is optional and defaults to `false`
- Existing code continues to work without any changes
- No breaking changes to APIs or behavior

## Testing Recommendations

To test the new debug mode:

1. Enable debug mode in your app:
   ```tsx
   <HashConnectProvider debug={true}>
   ```

2. Open browser Developer Console (F12)

3. Click connect button

4. Verify you see detailed logs with prefixes like `[HashConnectProvider]`, `[UserAgent]`, etc.

5. Check that all steps of the connection flow are logged

6. Try disconnecting and reconnecting to see the full lifecycle

## Production Usage

For production deployments, use environment-based toggling:

```tsx
const isDevelopment = process.env.NODE_ENV === 'development';

<HashConnectProvider debug={isDevelopment}>
  <App />
</HashConnectProvider>
```

This ensures debug logs only appear during development.

## Files Changed

1. `src/react/HashConnectProvider.tsx` - Added debug prop and logging
2. `src/react/useHashConnect.ts` - Added debug option and logging  
3. `src/utils/modal.ts` - Added comprehensive modal logging
4. `src/domains/UserAgent/entity.ts` - Enhanced core SDK logging
5. `DEBUG_GUIDE.md` - New comprehensive debugging guide
6. `DEBUGGING_QUICK_START.md` - New quick reference guide
7. `dist/` - Rebuilt with updated TypeScript definitions

## Next Steps

1. Test the debug mode in your application
2. Share the DEBUGGING_QUICK_START.md with developers having issues
3. Use the detailed logs to identify where your specific issue occurs
4. Report any additional logging needs or improvements

## Support

If you encounter issues not covered by the debug logs:
1. Enable debug mode
2. Capture the complete console output
3. Include browser/OS information
4. Open an issue with the logs and details

