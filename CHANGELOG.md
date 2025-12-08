# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [3.1.11] - 2025-12-08

### 🐛 Critical Bug Fixes - Pusher Error Handling

Fixed two critical bugs in Pusher error handling that could cause inefficient reconnection attempts and loss of debugging information.

### Fixed

#### Bug 1: Error Code 4000 Treated as Recoverable

- **Issue**: Error code `4000` ("Application only accepts SSL") was not included in the `nonRecoverableErrors` list, causing wasted reconnection attempts
- **Impact**: SDK would retry connection 5 times (up to 62 seconds) even though SSL protocol change is required
- **Fix**: Added `4000` to non-recoverable errors list
- **Result**: Immediate failure with clear error message: `"Pusher error [4000]: Application only accepts SSL"`

#### Bug 2: Non-Recoverable Error Messages Overwritten

- **Issue**: Specific error messages for non-recoverable errors (4000, 4001, 4003, 4009, 4100) were being overwritten with generic "Max reconnection attempts reached" message
- **Impact**: Developers lost critical debugging information (error codes and detailed messages)
- **Fix**: Added `nonRecoverableErrorRef` to track and preserve non-recoverable error messages through connection state changes
- **Result**: Specific error messages now preserved, making debugging much easier

### Changed

- **`isRecoverableError()`** - Added error code `4000` to non-recoverable errors list with detailed comments
- **`handleConnectionFailure()`** - Now checks `nonRecoverableErrorRef` before overwriting error messages
- **`handleError()`** - Stores non-recoverable errors in ref to preserve error context
- **`handleStateChange()`** - Clears non-recoverable error ref on successful connection
- **`reconnect()`** - Clears non-recoverable error ref to allow manual reconnection

### Documentation

- Updated `docs/PUSHER_ERROR_HANDLING.md` to include error 4000 in non-recoverable errors table
- Added `BUG_FIXES_v3.1.11.md` with comprehensive bug analysis, test cases, and verification details

### Technical Details

See [BUG_FIXES_v3.1.11.md](./BUG_FIXES_v3.1.11.md) for:

- Root cause analysis
- Complete fix implementation
- Test cases and scenarios
- Migration guide (no changes required)

---

## [3.1.10] - 2025-12-08

### 🔧 Enhanced Pusher Error Handling

Improved handling of Pusher WebSocket connection errors with better parsing, logging, and recovery strategies.

### Added

- **Pusher error code definitions** - Comprehensive mapping of all standard Pusher error codes (1006, 4000-4202)
- **Error parsing function** - Extracts code and message from Pusher's error structure
- **Recoverable vs non-recoverable logic** - Smart detection of which errors should trigger reconnection
- **Enhanced error logging** - Structured logs with error codes and human-readable names
- **Detailed state change logging** - Better visibility into connection state transitions
- **Comprehensive documentation** - New `docs/PUSHER_ERROR_HANDLING.md` guide covering all error codes

### Changed

- **Error handler** - Now parses Pusher error structure and logs with context: `[1006] Connection interrupted - Connection interrupted (200)`
- **Non-recoverable error handling** - Stops reconnection attempts for config/auth errors (4001, 4003, 4009, 4100)
- **State change handler** - Added detailed logging for all connection states (connected, connecting, unavailable, failed, disconnected)
- **README.md** - Added Pusher error handling troubleshooting section and documentation links

### Fixed

- **Error code 1006 handling** - "Connection interrupted" errors now properly logged with context
- **Reconnection for config errors** - SDK no longer wastes attempts reconnecting for non-recoverable errors
- **Error visibility** - Developers can now see exactly what Pusher error occurred

### Documentation

- Added `docs/PUSHER_ERROR_HANDLING.md` - Complete guide covering:
  - All Pusher error codes and meanings
  - Error code 1006 deep dive
  - Reconnection strategy and configuration
  - Connection state flow diagrams
  - Monitoring and debugging best practices
  - Troubleshooting guide
- Added `PUSHER_ERROR_IMPROVEMENTS.md` - Summary of changes for this release

### Impact

- **Better debugging** - Clear, structured error logs with error codes
- **Smarter recovery** - No wasted reconnection attempts on non-recoverable errors
- **Improved monitoring** - Can alert on specific error codes
- **Better documentation** - Comprehensive guide for understanding and handling errors

---

## [3.1.0] - 2025-12-08

### 🎉 Enhanced Developer Experience

Version 3.1.0 adds four carefully designed features that address real pain points observed in production usage. All features are backward compatible and opt-in.

### Added

#### 1. `isInitialized` State (Priority: CRITICAL)

- Added `isInitialized: boolean` to `AuthState` interface and `useHashConnect()` return value
- Eliminates setTimeout workarounds when checking for existing sessions on mount
- SDK sets `isInitialized: false` initially, then `true` after localStorage check completes
- **Problem solved**: Apps can now distinguish "SDK still checking" from "no session found"
- **Usage**: `if (!isInitialized) return <Spinner />` - proper loading states without guessing

#### 2. Non-React Token Access (Priority: HIGH)

- Added `getAccessToken(): Promise<string | null>` - async function with auto-refresh
- Added `getAuthState()` - sync function for quick auth checks
- Works in API interceptors, utility functions, and other non-React code
- **Problem solved**: No more bypassing SDK to read tokens directly from localStorage
- **Usage**: `import { getAccessToken } from '@hashpass/connect'` in any file
- **Implementation**: New file `src/standalone.ts` with zero React dependencies

#### 3. Auth State Change Callbacks (Priority: MEDIUM)

- Added `onAuthStateChange?: (event) => void` prop to `HashConnectProvider`
- Fires on: `'connected'`, `'disconnected'`, `'refreshed'`
- Event structure: `{ type, isConnected, userAddress, clubId }`
- **Problem solved**: Easy routing redirects and analytics without useEffect watchers
- **Usage**: `<HashConnectProvider onAuthStateChange={event => router.push('/login')} />`

#### 4. Integrated Logging (Priority: LOW)

- Added `onLog?: (event) => void` prop to `HashConnectProvider`
- Receives: `{ message: string, timestamp: Date }`
- Console logging automatically suppressed when `onLog` is provided
- **Problem solved**: Send SDK logs to Sentry/Datadog without duplicate console output
- **Usage**: `<HashConnectProvider onLog={event => logger.debug(event.message)} />`

### Changed

- `HashConnectProvider` now accepts two new optional props: `onAuthStateChange` and `onLog`
- localStorage restoration `useEffect` now sets `isInitialized` state in both success and failure paths
- Token refresh callback now fires `onAuthStateChange` event with type `'refreshed'`
- `log()` function modified to prioritize `onLog` callback over console output

### Documentation

- Updated `README.md` with v3.1.0 feature overview and examples
- Updated `REACT_INTEGRATION_GUIDE.md` with comprehensive v3.1.0 patterns
- All four features documented with usage examples and rationale

### Technical Details

- **New files**: `src/standalone.ts` (non-React token access functions)
- **Modified files**:
  - `src/react/HashConnectContext.ts` - added `isInitialized` to `AuthState`
  - `src/react/HashConnectProvider.tsx` - added callbacks, event firing, and log routing
  - `src/react/useHashConnect.ts` - exposed `isInitialized` in return type
  - `src/react/index.ts` - exported new standalone functions
- **Breaking changes**: None - all features are additive and opt-in

### References

- Improvements based on production feedback from PokerID integration
- See `V3_IMPROVEMENT_ROADMAP.md` for detailed rationale and implementation notes

---

## [3.0.3] - 2025-12-08

### Fixed

- **Object Not Extensible Error** - Fixed runtime error "Cannot add property \_storage, object is not extensible" by including `_storage` in the object returned by `makeUserAgent()` instead of attempting to add it after object creation.

---

## [2.0.1] - 2025-12-08

### Fixed

- **Duplicate Pusher Connection Monitoring Listeners** - Fixed issue where `monitorPusherConnection()` would bind duplicate `state_change` listeners on subsequent `connect()` calls, causing redundant event handling and potential race conditions. Added `isMonitoringActive` flag to ensure only one listener is active per Pusher connection instance.

### Added

- **Complete React Integration Guide** - Added comprehensive 1500+ line guide (`REACT_INTEGRATION_GUIDE.md`) covering all aspects of React integration with best practices, common pitfalls, and advanced patterns.

---

## [2.0.0] - 2025-12-08

### 🎉 Major Stability Release

Version 2.0.0 represents a comprehensive overhaul of HashConnect SDK's connection stability and reliability. This release eliminates the most common authentication failures and provides a production-ready foundation.

### Added

#### Phase 1: Critical Stability Fixes

- **Token Expiry Validation on Auto-Reconnect** - Tokens are now validated before auto-reconnect attempts, preventing "connected but expired" states
- **Enhanced Reconnection Resilience** - Increased Pusher reconnection attempts from 3 to 5 for better desktop network handling
- **React Loading State Protection** - Added 30-second timeout to prevent `isLoading` from getting stuck forever
- **Consistent Storage Access** - Exposed `window.HASHConnect._storage` for React components to use SafeStorage consistently

#### Phase 2: Core Stability Improvements

- **Proactive Token Refresh** - Background monitoring refreshes tokens 5 minutes before expiry, preventing silent expiration during inactivity
- **Cross-Tab Synchronization** - Multiple tabs now sync disconnections and token updates via storage events
- **Event Re-binding After Reconnection** - Pusher events are automatically re-bound after network interruption recovery

#### Phase 3: API Improvements

- **Public Disconnect Method** - Exposed `window.HASHConnect.disconnect()` for clean programmatic disconnection
- **React Hook Improvements** - Memoized log functions to prevent unnecessary re-renders and potential infinite loops

### Changed

- **Reconnection Configuration** - `maxAttempts` increased from 3 to 5 (provides ~30 seconds of retry time)
- **Token Monitoring** - Added 60-second interval check for proactive token refresh
- **React Callbacks** - All callbacks now properly memoized with correct dependency arrays
- **Storage Access** - All React components now use SafeStorage instead of direct localStorage calls

### Fixed

- ✅ No more "session lost after page refresh" - Token validation prevents expired reconnections
- ✅ No more "authentication stops working after 15-60 minutes" - Proactive refresh keeps tokens fresh
- ✅ Better recovery from network interruptions - 5 reconnection attempts with event re-binding
- ✅ Cross-tab state synchronization - Tabs stay in sync when one disconnects
- ✅ React UI never stuck in loading state - 30-second timeout with error message
- ✅ Clean disconnect method - No more DOM button clicking hacks
- ✅ Performance improvements - Memoized callbacks prevent unnecessary re-renders

### Breaking Changes

**None for end users** - The public API (`connect()`, `disconnect()`, `getToken()`, etc.) remains unchanged. All breaking changes are internal architecture improvements.

### Migration Guide

No migration required! Simply update your package:

```bash
npm install @hashpass/connect@2.0.0
```

Your existing code will continue to work without changes. The v2.0.0 improvements happen automatically under the hood.

### Technical Details

**Files Modified:**

- `src/utils/connect.ts` - Reconnection config, token validation, event re-binding
- `src/domains/UserAgent/entity.ts` - Proactive refresh, cross-tab sync, disconnect API
- `src/react/useHashConnect.ts` - Timeout, storage consistency, memoization
- `src/react/HashConnectProvider.tsx` - Storage consistency, memoization
- `src/index.ts` - Exposed storage for React components

**Testing Recommendations:**

1. Test auto-reconnect after page refresh with various token states
2. Test long-running sessions (>60 minutes) to verify proactive refresh
3. Test network interruptions with browser DevTools throttling
4. Test cross-tab scenarios (disconnect in one tab, observe others)
5. Test React loading timeout with simulated slow connections

---

## [1.0.3] - 2025-11-08

### Fixed

- Added `typesVersions` to `package.json` for better TypeScript module resolution with `/react` subpath imports
- Fixed TypeScript type errors when importing from `@hashpass/connect/react`

## [1.0.2] - 2025-11-08

### Fixed

- Updated React peer dependency to support React 19 (`^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0`)

## [1.0.1] - 2025-11-08

### Added

- **React Integration** - Built-in React hooks and context provider
  - `useHashConnect()` hook for easy integration
  - `HashConnectProvider` and `useHashConnectContext()` for context-based state management
  - `makeAuthRequest()` helper for authenticated API calls
  - Full TypeScript support with type definitions
  - Import from `@hashpass/connect/react`

### Changed

- Package exports now include `/react` subpath for React components
- Updated documentation with simplified React integration examples
- React is now an optional peer dependency

### Fixed

- Build process now generates separate bundles for main SDK and React components

## [1.0.0] - 2025-11-08

### Added

- Initial release of HashConnect SDK
- QR code authentication flow
- Automatic token management and refresh
- Session persistence with auto-reconnection
- Real-time Pusher integration
- Custom events for connection state changes
- TypeScript type definitions
- Comprehensive React integration guide
- Smart reconnection without page refresh

### Features

- `connect()` - Initiate wallet connection
- `getToken()` - Get JWT access token with auto-refresh
- `getUser()` - Get connected user information
- `isReady()` - Check connection status
- Custom event dispatching for state changes
- Automatic session cleanup on disconnect
- Modal UI for QR code display
- Customizable styling

### Security

- JWT token storage in localStorage
- Automatic token refresh before expiration
- Secure Pusher channel authentication
- Complete session cleanup on disconnect

## [Unreleased]

### Planned

- React Native support
- Vue.js composables
- Angular integration
- Improved error handling and user feedback
- Multi-language support
- Custom theming API
