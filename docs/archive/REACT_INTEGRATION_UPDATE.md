# React Integration Update - v1.0.1

## What's New

Version 1.0.1 adds **built-in React support** to `@hashpass/connect`! No more copying and pasting hooks - they're now part of the package.

## Installation

```bash
npm install @hashpass/connect
```

React is an optional peer dependency, so it won't be installed automatically for vanilla JS users.

## Usage

### Simple Hook

```tsx
import { useHashConnect } from '@hashpass/connect/react';

function App() {
  const { 
    isConnected, 
    userAddress, 
    connect, 
    disconnect, 
    getToken,
    isLoading,
    error 
  } = useHashConnect();

  return (
    <div>
      {isConnected ? (
        <div>
          <p>Connected: {userAddress}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <button onClick={connect} disabled={isLoading}>
          {isLoading ? 'Connecting...' : 'Connect'}
        </button>
      )}
    </div>
  );
}
```

### Context Provider

```tsx
import { HashConnectProvider, useHashConnectContext } from '@hashpass/connect/react';

function App() {
  return (
    <HashConnectProvider>
      <YourApp />
    </HashConnectProvider>
  );
}

function YourApp() {
  const { isConnected, connect } = useHashConnectContext();
  // ...
}
```

## What's Included

### Exports

The package now has two entry points:

1. **`@hashpass/connect`** - Main SDK (vanilla JS)
2. **`@hashpass/connect/react`** - React hooks and components

### React Components

- **`useHashConnect()`** - Main hook with all functionality
- **`HashConnectProvider`** - Context provider for app-wide state
- **`useHashConnectContext()`** - Hook to access context
- Full TypeScript support with type definitions

### Bundle Sizes

- Main SDK: `hash-connect.js` (24.7 KB minified)
- React bundle: `react.js` (5 KB minified)
- TypeScript definitions included

## API

### `useHashConnect()`

Returns:
- `isConnected: boolean`
- `isLoading: boolean`
- `userAddress: string | null`
- `error: string | null`
- `connect: () => Promise<void>`
- `disconnect: () => void`
- `getToken: () => Promise<string | null>`
- `makeAuthRequest: <T>(url, options?) => Promise<T>` - Helper for authenticated requests

### `makeAuthRequest()`

Built-in helper for making authenticated API calls:

```tsx
const { makeAuthRequest } = useHashConnect();

// Automatically adds Authorization header with token
const data = await makeAuthRequest<UserProfile>('https://api.example.com/profile');
```

## Publishing to npm

Version 1.0.1 is ready to publish:

```bash
# Build is automatic on publish
npm publish
```

## Migration from v1.0.0

If you were using a custom hook from the documentation, you can now import directly:

**Before:**
```tsx
// You had to copy this from docs
import { useHashConnect } from './hooks/useHashConnect';
```

**After:**
```tsx
// Now it's part of the package!
import { useHashConnect } from '@hashpass/connect/react';
```

No breaking changes - v1.0.0 users can continue using vanilla JS without any changes.

## File Structure

```
dist/
├── hash-connect.js          # Main SDK bundle
├── react.js                 # React components bundle
└── react/                   # TypeScript definitions
    ├── index.d.ts
    ├── useHashConnect.d.ts
    └── HashConnectProvider.d.ts
```

## Benefits

✅ **No Copy-Paste** - Import directly from package
✅ **Type Safety** - Full TypeScript support
✅ **Smaller Client Code** - Hook logic in package, not your repo
✅ **Easy Updates** - Get hook improvements via package updates
✅ **Better DX** - Auto-complete and inline docs
✅ **Optional** - React users opt-in, doesn't affect vanilla JS users

## Next Steps

1. **Publish v1.0.1**: `npm publish`
2. **Test installation**: `npm install @hashpass/connect@1.0.1`
3. **Update docs**: Already done in REACT.md
4. **Announce**: Share the new React integration!

## Documentation

- [README.md](./README.md) - Updated with React example
- [REACT.md](./REACT.md) - Complete React integration guide
- [CHANGELOG.md](./CHANGELOG.md) - Version history

## Questions?

See [REACT.md](./REACT.md) for comprehensive examples and guides.

