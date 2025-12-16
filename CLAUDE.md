# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HashConnect SDK v3** is a React-only authentication and wallet integration library for web applications. It provides seamless HASH Pass authentication with built-in JWT token management, real-time WebSocket communication via Pusher, and QR code-based mobile wallet connection.

**Key characteristics:**
- Pure React Context-based architecture (no global state)
- SSR/Next.js compatible with `'use client'` directives
- TypeScript-first with full type safety
- UMD bundle with externalized React dependencies
- Currently at v3.1.12 with active maintenance

## Build and Development Commands

```bash
# Install dependencies
npm install

# Production build (clean, bundle, generate types)
npm run build

# Development build with file watching
npm run build:dev

# TypeScript type checking only
npm run typecheck

# Remove build artifacts
npm run clean
```

**Build Pipeline:**
1. `npm run build` removes `/dist`, runs webpack for bundling, then generates TypeScript declarations
2. Webpack produces `dist/hash-connect.js` (UMD format) with React/React-DOM externalized
3. TypeScript compiler generates `.d.ts` files with source maps
4. Entry point: `src/react/index.ts`

## High-Level Architecture

### State Management Pattern

All authentication state is managed in a single React Context via `HashConnectProvider.tsx` (932 lines):

```typescript
interface AuthState {
  isInitialized: boolean      // SDK finished initial localStorage check
  isConnected: boolean        // User authenticated
  isLoading: boolean          // Connection in progress
  isModalOpen: boolean        // Modal visibility
  userAddress: string | null
  accessToken: string | null  // JWT token
  refreshToken: string | null
  signature: string | null
  clubId: string | null
  clubName: string | null
  sessionId: string | null
  error: string | null
}
```

The provider orchestrates four core hooks and exposes methods through `useHashConnect()` for components.

### Core Hooks Architecture

Four specialized hooks handle specific concerns:

1. **`usePusher`** (470 lines) - WebSocket connection management
   - Loads Pusher library from CDN
   - Manages connection lifecycle with auto-reconnect (exponential backoff)
   - Handles 15+ Pusher error codes with recovery logic
   - Supports private channel authentication

2. **`useTokenRefresh`** (445 lines) - JWT token lifecycle management
   - Auto-detects token expiration from JWT payload
   - Refreshes tokens 30 seconds before expiry
   - Handles refresh token rotation
   - Persists tokens across page reloads

3. **`useScriptLoader`** (315 lines) - External CDN script loading
   - Dynamically loads Pusher and QR code libraries
   - Prevents duplicate script loads (global cache)
   - SSR-safe with server-check safeguards
   - Includes retry logic for load failures

4. **`useStorage`** (192 lines) - Safe localStorage access
   - Cross-tab synchronization
   - In-memory fallback when storage unavailable
   - SSR-safe implementation
   - Prefixed keys (`hc:` prefix) to avoid collisions

### User-Facing API Flow

```
<HashConnectProvider>
  └─ Initializes state + loads Pusher/QR Code
      ├─ useStorage (checks localStorage for existing session)
      ├─ usePusher (connects WebSocket)
      ├─ useTokenRefresh (manages JWT lifecycle)
      └─ useScriptLoader (loads CDN dependencies)

useHashConnect() hook
  ├─ connect() → opens HashConnectModal → QR code display
  ├─ disconnect() → clears localStorage + closes modal
  ├─ getToken() → returns valid JWT with auto-refresh
  ├─ makeAuthRequest<T>(url, options) → authenticated fetch
  └─ State: isInitialized, isConnected, isLoading, userAddress, etc.
```

### Storage Keys

Session data is stored in localStorage with the `hc:` prefix:
- `hc:sessionId` - Current session identifier
- `hc:address` - Connected user's wallet address
- `hc:accessToken` - JWT access token
- `hc:refreshToken` - JWT refresh token
- `hc:signature` - User signature
- `hc:clubId` - User's club ID
- `hc:clubName` - User's club name

### Directory Structure

```
src/
├── react/
│   ├── components/            # UI components
│   │   ├── HashConnectModal.tsx (164 lines)
│   │   ├── QRCodeDisplay.tsx (153 lines)
│   │   └── ConnectionStatusIndicator.tsx (94 lines)
│   ├── hooks/                 # Core hooks
│   │   ├── usePusher.ts (470 lines)
│   │   ├── useTokenRefresh.ts (445 lines)
│   │   ├── useScriptLoader.ts (315 lines)
│   │   └── useStorage.ts (192 lines)
│   ├── HashConnectProvider.tsx (932 lines) - State orchestration
│   ├── useHashConnect.ts (120 lines) - User-facing hook
│   ├── HashConnectContext.ts (71 lines)
│   ├── index.ts (118 lines) - Public API exports
│   └── types/ - Local type definitions
├── types/ - Shared types (pusher, qrcode, user)
├── standalone.ts (249 lines) - Non-React token access
└── config.ts - Configuration constants
```

## Key Architectural Patterns

### 1. Single Source of Truth
All authentication state lives in React Context. No global objects or CustomEvents. Components access state through `useHashConnect()` hook.

### 2. SSR-Safe Design
Every hook uses:
- `'use client'` directive (Next.js App Router)
- `typeof window !== 'undefined'` checks
- Storage fallback to in-memory when localStorage unavailable

### 3. Token Lifecycle Management
- Tokens stored in localStorage with `hc:` prefix
- JWT expiration detected from token payload (not server time)
- Auto-refresh triggered 30 seconds before expiry
- Refresh token rotation on successful refresh

### 4. Real-Time Communication
- Pusher WebSocket connection for instant updates
- Private channel authentication for security
- Auto-reconnect with exponential backoff (1s → 32s max)
- Comprehensive error handling for 15+ Pusher error codes

### 5. Script Loading Strategy
- Pusher and QR code libraries loaded from CDN (not bundled)
- Global script cache prevents duplicate loads
- Retry logic for failed CDN requests
- Dynamic loading allows code to run without Pusher initially

## Testing and Type Checking

**Current Status:**
- No automated test framework configured
- Empty `/src/react/__tests__/` directory
- Type checking via TypeScript compiler

**Type Checking:**
```bash
npm run typecheck    # Run tsc to check for type errors
```

**Manual Testing Resources:**
- `pusher-connection-test.html` - Browser-based Pusher connection verification
- Integration guides in `/docs/` for manual testing scenarios

## Important Files and Their Roles

| File | Lines | Purpose | Key Concepts |
|------|-------|---------|--------------|
| `HashConnectProvider.tsx` | 932 | Main state container and orchestrator | Context provider, effect hooks, state initialization |
| `usePusher.ts` | 470 | WebSocket connection | CDN loading, error handling, auto-reconnect |
| `useTokenRefresh.ts` | 445 | JWT management | Token expiration, auto-refresh, rotation |
| `useScriptLoader.ts` | 315 | External script loading | CDN, global cache, error handling, SSR safety |
| `useStorage.ts` | 192 | localStorage abstraction | Cross-tab sync, SSR fallback, prefixed keys |
| `standalone.ts` | 249 | Non-React API | API interceptor usage, utility functions |
| `HashConnectModal.tsx` | 164 | QR code modal UI | Portal rendering, child components, styling |
| `QRCodeDisplay.tsx` | 153 | QR code rendering | qrcodejs integration, dynamic sizing |

## Development Patterns

### Adding a New Feature
1. If it's new state, add to `AuthState` interface in `HashConnectProvider.tsx`
2. Add state variable and management logic in `HashConnectProvider`
3. Export through `useHashConnect()` hook (in `useHashConnect.ts`)
4. Update context value that's passed to provider
5. Use in components via `const { newFeature } = useHashConnect()`

### Handling Errors
- Pusher errors: Use error codes (1000-4999) documented in `usePusher.ts`
- Token errors: Caught in `useTokenRefresh.ts` with fallback handling
- Script load errors: Retry logic in `useScriptLoader.ts`
- General errors: Set in `AuthState.error` and displayed in modal

### Testing Changes
1. Run `npm run typecheck` to verify types
2. Run `npm run build` to ensure bundling succeeds
3. Test with manual HTML file: `pusher-connection-test.html`
4. Test in real Next.js/React app via npm link

## Recent Changes and Versions

**v3.1.12** - Current version

**v3.1.11** - Bug fixes for Pusher error handling
- Fixed error code 4000 (SSL) treated as recoverable
- Fixed non-recoverable error messages being overwritten
- Improved error tracking with refs

**v3.1.0** - Major features
- `isInitialized` state for proper loading state handling
- Non-React token access (`getAccessToken()`, `getAuthState()`)
- Auth state change callbacks (`onAuthStateChange`)
- Consolidated logging system (`onLog`)

**v3.0.0** - Architecture rewrite
- Migrated from `window.HASHConnect` to React Context
- Removed CustomEvents
- Pure React hooks-based approach

## Configuration and Constants

Main configuration in `config.ts`:
- Pusher cluster and key
- Auth endpoint for token refresh
- API base URL
- Timeouts and retry limits

Provider accepts optional `config` prop to override defaults:
```tsx
<HashConnectProvider
  config={{
    pusherKey: "custom-key",
    pusherCluster: "us2",
    authEndpoint: "https://api.example.com/auth",
  }}
>
```

## Dependencies

**Peer Dependencies:**
- React: ^17.0.0 || ^18.0.0 || ^19.0.0

**Build Dependencies:**
- Webpack 5: Module bundling
- Babel 7: JavaScript transpilation
- TypeScript 5.4: Type checking and declaration generation
- ts-loader: Webpack TypeScript loader

**External Services (loaded from CDN):**
- Pusher library (8.0.1) - Real-time WebSocket
- qrcodejs (1.0.0) - QR code generation

React and React-DOM are externalized in the bundle (expected to be provided by consumer).

## TypeScript Configuration

- Target: ES6
- Module: ES6 (transpiled by Babel for bundling)
- JSX: react
- Strict mode enabled
- Source maps included
- `.d.ts` files generated for full type safety
