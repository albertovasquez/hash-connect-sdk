# HashConnect SDK v3

> React-only authentication and wallet integration for web applications

[![npm version](https://badge.fury.io/js/%40hashpass%2Fconnect.svg)](https://www.npmjs.com/package/@hashpass/connect)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

HashConnect SDK provides a simple and secure way to integrate HASH Pass authentication into your React applications. It offers seamless wallet connection, token management, and user authentication through QR code scanning.

## 🎉 What's New in v3.0.0

**React-Only Architecture** - Complete rewrite for modern React applications:

- ✅ **Pure React** - No more `window.HASHConnect` or CustomEvents
- ✅ **Single source of truth** - State managed entirely in React Context
- ✅ **SSR/Next.js support** - All hooks are SSR-safe with `'use client'` directives
- ✅ **TypeScript-first** - Full type safety with exported types
- ✅ **Smaller bundle** - Removed duplicate state management code
- ✅ **Better DX** - Simple Provider + Hook pattern

> ⚠️ **Breaking Changes**: v3 is React-only. See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for upgrading from v2.

## Features

✨ **Easy Integration** - Add authentication to your app in minutes  
🔒 **Secure** - Built-in JWT token management and automatic refresh  
📱 **QR Code Authentication** - Seamless mobile wallet connection  
⚡ **Real-time** - Powered by Pusher for instant connection updates  
🎨 **Customizable** - Style the UI to match your brand  
♻️ **Session Persistence** - Automatic reconnection on page refresh  
🔄 **Cross-tab Sync** - Multiple tabs stay in sync automatically  
⚛️ **React Native** - Built specifically for React applications  
🛡️ **Production Ready** - Battle-tested in production environments

## Requirements

- **React** 17.0.0 or higher
- **Node.js** 16.0.0 or higher

## Installation

```bash
npm install @hashpass/connect
```

```bash
yarn add @hashpass/connect
```

```bash
pnpm add @hashpass/connect
```

## Quick Start

### 1. Wrap your app with the Provider

```tsx
// App.tsx
import { HashConnectProvider } from "@hashpass/connect";

function App() {
  return (
    <HashConnectProvider disclaimer="By connecting, you agree to our terms.">
      <MyApp />
    </HashConnectProvider>
  );
}
```

### 2. Use the hook in your components

```tsx
// MyComponent.tsx
import { useHashConnect } from "@hashpass/connect";

function MyComponent() {
  const {
    isConnected,
    userAddress,
    connect,
    disconnect,
    getToken,
    isLoading,
    error,
  } = useHashConnect();

  const handleApiCall = async () => {
    const token = await getToken();
    if (token) {
      const response = await fetch("https://api.example.com/data", {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  };

  if (isLoading) {
    return <div>Connecting...</div>;
  }

  if (isConnected) {
    return (
      <div>
        <p>Connected: {userAddress}</p>
        <button onClick={handleApiCall}>Make API Call</button>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={connect}>Connect with HASH Pass</button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

That's it! The modal, QR code, and connection management are all handled automatically.

## API Reference

### `HashConnectProvider`

The context provider that manages all authentication state.

```tsx
<HashConnectProvider
  debug={false} // Enable debug logging
  disclaimer="Your terms here" // Text shown in modal
  config={{
    // Optional custom config
    pusherKey: "your-key",
    pusherCluster: "us2",
    authEndpoint: "https://api.example.com",
  }}
>
  {children}
</HashConnectProvider>
```

### `useHashConnect()`

The main hook for accessing authentication state and methods.

```tsx
const {
  // State
  isConnected, // boolean - Whether user is connected
  isLoading, // boolean - Whether connection is in progress
  isModalOpen, // boolean - Whether modal is visible
  userAddress, // string | null - Connected wallet address
  clubId, // string | null - User's club ID
  clubName, // string | null - User's club name
  error, // string | null - Current error message
  connectionState, // string - Pusher connection state

  // Methods
  connect, // () => Promise<void> - Start connection flow
  disconnect, // () => void - Disconnect and clear session
  getToken, // () => Promise<string | null> - Get valid access token
  getClubId, // () => string | null - Get club ID
  getClubName, // () => string | null - Get club name
  makeAuthRequest, // <T>(url, options?) => Promise<T> - Make authenticated request
} = useHashConnect();
```

### `makeAuthRequest`

Helper for making authenticated API calls:

```tsx
const { makeAuthRequest } = useHashConnect();

// Token is automatically included in Authorization header
const data = await makeAuthRequest<{ items: Item[] }>(
  "https://api.example.com/items"
);

// With custom options
const result = await makeAuthRequest<{ success: boolean }>(
  "https://api.example.com/action",
  {
    method: "POST",
    body: JSON.stringify({ action: "do-something" }),
  }
);
```

## Next.js Integration

The SDK is fully compatible with Next.js (both Pages Router and App Router).

### App Router (Next.js 13+)

```tsx
// app/providers.tsx
"use client";

import { HashConnectProvider } from "@hashpass/connect";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <HashConnectProvider disclaimer="By connecting...">
      {children}
    </HashConnectProvider>
  );
}

// app/layout.tsx
import { Providers } from "./providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Pages Router

```tsx
// pages/_app.tsx
import { HashConnectProvider } from "@hashpass/connect";

export default function App({ Component, pageProps }) {
  return (
    <HashConnectProvider disclaimer="By connecting...">
      <Component {...pageProps} />
    </HashConnectProvider>
  );
}
```

## Advanced Usage

### Custom Components

Export individual UI components for custom layouts:

```tsx
import {
  HashConnectModal,
  QRCodeDisplay,
  ConnectionStatusIndicator
} from '@hashpass/connect';

// Use components individually
<QRCodeDisplay value="hc:session123" size={200} />
<ConnectionStatusIndicator status="connected" />
```

### Core Hooks

For advanced use cases, access the underlying hooks:

```tsx
import {
  useStorage,
  usePusher,
  useTokenRefresh,
  useScriptLoader,
} from "@hashpass/connect";

// SSR-safe localStorage with fallback
const storage = useStorage({ prefix: "myapp:" });

// Pusher connection management
const { client, connectionState, subscribe } = usePusher({
  key: "your-key",
  cluster: "us2",
});
```

## Styling

The SDK uses specific CSS class names and IDs that you can override:

```css
/* Modal overlay */
#hash-connect-modal {
  backdrop-filter: blur(4px);
}

/* Modal content */
#hash-connect-modal-content {
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

/* QR Code container */
#hash-connect-qrcode {
  padding: 16px;
}

/* Status indicator */
#hash-connect-status-indicator {
  font-size: 14px;
}

/* Status dot colors */
.status-connected {
  background: #10b981;
}
.status-connecting {
  background: #f59e0b;
}
.status-disconnected {
  background: #ef4444;
}
```

## Local Storage

Session data is stored with the `hc:` prefix:

- `hc:sessionId` - Current session identifier
- `hc:address` - Connected user address
- `hc:accessToken` - JWT access token
- `hc:refreshToken` - JWT refresh token
- `hc:signature` - User signature
- `hc:clubId` - User's club ID
- `hc:clubName` - User's club name

## TypeScript

Full TypeScript support with exported types:

```tsx
import type {
  AuthState,
  HashConnectContextType,
  UseHashConnectReturn,
  ConnectionState,
} from "@hashpass/connect";
```

## Building from Source

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Type check
npm run typecheck
```

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions

## Security

- JWT tokens stored in localStorage
- Automatic token refresh before expiration
- Secure Pusher channel authentication
- Session cleanup on disconnect
- No sensitive data exposed to global scope

## Troubleshooting

### "useHashConnect must be used within a HashConnectProvider"

Ensure your component is wrapped with the provider:

```tsx
<HashConnectProvider>
  <YourComponent /> {/* useHashConnect works here */}
</HashConnectProvider>
```

### Connection not persisting

The SDK automatically restores sessions from localStorage. If issues persist:

```javascript
// Clear session manually
localStorage.removeItem("hc:accessToken");
localStorage.removeItem("hc:refreshToken");
localStorage.removeItem("hc:address");
```

### Next.js hydration errors

Ensure the provider is marked as a client component:

```tsx
"use client";
import { HashConnectProvider } from "@hashpass/connect";
```

## Migration from v2

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed upgrade instructions.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © BitLabs

## Support

- 📧 Email: support@bitlabs.com
- 💬 Issues: [GitHub Issues](https://github.com/bitlabs/hash-connect-sdk/issues)
- 📖 Documentation: [Full Documentation](https://docs.hashconnect.io)
