# HashConnect SDK

> Secure authentication and wallet integration for web applications

[![npm version](https://badge.fury.io/js/%40hashpass%2Fconnect.svg)](https://www.npmjs.com/package/@hashpass/connect)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

HashConnect SDK provides a simple and secure way to integrate HASH Pass authentication into your web applications. It offers seamless wallet connection, token management, and user authentication through QR code scanning.

## 🎉 What's New in v2.0.0

**Production-Ready Stability Release** - Comprehensive improvements to connection reliability:

- ✅ **No more session loss after refresh** - Smart token validation prevents expired reconnections
- ✅ **No more auth timeouts** - Proactive token refresh keeps sessions alive
- ✅ **Better network resilience** - 5 reconnection attempts with automatic event re-binding
- ✅ **Cross-tab synchronization** - Multiple tabs stay in sync
- ✅ **Clean React integration** - Proper disconnect API and memoized hooks

See [STABILITY_CHANGELOG.md](./STABILITY_CHANGELOG.md) for complete details.

### 📚 New in v2.0.1

- [Complete React Integration Guide](./REACT_INTEGRATION_GUIDE.md) - Comprehensive guide for React developers with best practices, common pitfalls, and advanced patterns

## Features

✨ **Easy Integration** - Add authentication to your app in minutes  
🔒 **Secure** - Built-in JWT token management and automatic refresh  
📱 **QR Code Authentication** - Seamless mobile wallet connection  
⚡ **Real-time** - Powered by Pusher for instant connection updates  
🎨 **Customizable** - Style the UI to match your brand  
♻️ **Session Persistence** - Automatic reconnection on page refresh  
🔄 **Smart Reconnection** - No page refresh needed after disconnect  
⚛️ **React Support** - Built-in hooks and context provider included  
🛡️ **Production Ready** - Comprehensive stability improvements in v2.0

## Installation

### NPM/Yarn

```bash
npm install @hashpass/connect
```

```bash
yarn add @hashpass/connect
```

### CDN

```html
<script src="https://unpkg.com/@hashpass/connect/dist/hash-connect.js"></script>
```

## Quick Start

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My App</title>
  </head>
  <body>
    <!-- The SDK will inject the connect button here -->
    <div id="hash-connect"></div>

    <script src="https://unpkg.com/@hashpass/connect/dist/hash-connect.js"></script>
    <script>
      // Listen for connection events
      document.addEventListener("hash-connect-event", (event) => {
        if (event.detail.eventType === "connected") {
          console.log("User connected:", event.detail.user);
        } else if (event.detail.eventType === "disconnected") {
          console.log("User disconnected");
        }
      });

      // Or manually trigger connection
      async function connect() {
        await window.HASHConnect.connect();
      }

      // Get user token for API calls
      async function makeAuthenticatedRequest() {
        const token = await window.HASHConnect.getToken();

        const response = await fetch("https://api.example.com/data", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        return response.json();
      }
    </script>
  </body>
</html>
```

### React

The SDK includes built-in React hooks! Just import and use:

```tsx
import { useHashConnect } from "@hashpass/connect/react";

function App() {
  const { isConnected, userAddress, connect, disconnect, getToken } =
    useHashConnect();

  const handleApiCall = async () => {
    const token = await getToken();
    // Make authenticated API call
  };

  return (
    <div>
      {isConnected ? (
        <div>
          <p>Connected: {userAddress}</p>
          <button onClick={handleApiCall}>Make API Call</button>
        </div>
      ) : (
        <button onClick={connect}>Connect with HASH Pass</button>
      )}
    </div>
  );
}
```

## API Reference

### `window.HASHConnect`

The SDK exposes a global object with the following methods:

#### `connect(): Promise<void>`

Initiates the connection flow and opens the QR code modal.

```javascript
await window.HASHConnect.connect();
```

#### `getToken(): Promise<string | null>`

Retrieves the current access token. Automatically refreshes expired tokens.

```javascript
const token = await window.HASHConnect.getToken();
```

#### `getUser(): { address: string | null } | undefined`

Gets the currently connected user information.

```javascript
const user = window.HASHConnect.getUser();
console.log(user?.address); // "0x..."
```

#### `isReady(): boolean`

Checks if a user is connected.

```javascript
const isConnected = window.HASHConnect.isReady();
```

#### `disconnect(): void` **✨ New in v2.0**

Programmatically disconnects the user and cleans up the session.

```javascript
window.HASHConnect.disconnect();
```

#### `getClubId(): string | null`

Gets the club ID of the connected user (if available).

```javascript
const clubId = window.HASHConnect.getClubId();
```

#### `getClubName(): string | null`

Gets the club name of the connected user (if available).

```javascript
const clubName = window.HASHConnect.getClubName();
```

## Events

The SDK dispatches custom `hash-connect-event` events:

```javascript
document.addEventListener("hash-connect-event", (event) => {
  const { eventType, user } = event.detail;

  if (eventType === "connected") {
    console.log("User connected:", user);
  } else if (eventType === "disconnected") {
    console.log("User disconnected");
  }
});
```

## Configuration

The SDK automatically injects a connect button into any element with the `id="hash-connect"`:

```html
<div id="hash-connect"></div>
```

To use your own custom button:

```html
<button onclick="window.HASHConnect.connect()">Connect Wallet</button>
```

## Styling

The SDK comes with default styles. Customize them by overriding these CSS selectors:

```css
/* Connect button */
#hash-connect-btn {
  background: your-color;
  border-radius: 8px;
  padding: 12px 24px;
}

/* Disconnect button */
#hash-connect-disconnect-btn {
  background: your-color;
  padding: 8px 16px;
}

/* Modal overlay */
#hash-connect-modal-overlay {
  backdrop-filter: blur(4px);
}

/* Modal content */
#hash-connect-modal {
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}
```

## Local Storage

The SDK stores session data in localStorage:

- `hc:sessionId` - Current session identifier
- `hc:address` - Connected user address
- `hc:accessToken` - JWT access token
- `hc:refreshToken` - JWT refresh token
- `hc:signature` - User signature

To manually clear the session:

```javascript
localStorage.removeItem("hc:sessionId");
localStorage.removeItem("hc:address");
localStorage.removeItem("hc:accessToken");
localStorage.removeItem("hc:refreshToken");
localStorage.removeItem("hc:signature");
```

## Building from Source

First, install dependencies:

```bash
npm install
```

Build for production:

```bash
npm run build
```

Build for development (with watch mode):

```bash
npm run build-dev
```

Clean build artifacts:

```bash
npm run clean
```

## Development

### Prerequisites

- Node.js 16+
- npm or yarn

### Project Structure

```
hash-connect-sdk/
├── src/
│   ├── domains/          # Core domain logic
│   │   └── UserAgent/    # User authentication logic
│   ├── eventListeners/   # Event handlers
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── dist/                 # Compiled output
├── types/                # Global type definitions
└── webpack.config.js     # Webpack configuration
```

### Testing

Load `dist/index.html` in your browser to test the SDK locally.

## Publishing to NPM

1. Update version in `package.json`
2. Build the project: `npm run build`
3. Login to npm: `npm login`
4. Publish: `npm publish`

The `prepublishOnly` script automatically builds before publishing.

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions

## Security

- JWT tokens are stored in localStorage
- Automatic token refresh before expiration
- Secure Pusher channel authentication
- Session cleanup on disconnect

## Troubleshooting

### SDK not loading

Ensure the script is fully loaded before calling methods:

```javascript
const interval = setInterval(() => {
  if (window.HASHConnect) {
    clearInterval(interval);
    // SDK is ready
  }
}, 100);
```

### Connection not persisting

Check that localStorage is not being cleared by other scripts or browser settings.

### QR code not appearing

Ensure the modal container exists and isn't being blocked by other elements with high z-index.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © BitLabs

## Support

- 📧 Email: support@bitlabs.com
- 💬 Issues: [GitHub Issues](https://github.com/bitlabs/hash-connect-sdk/issues)
- 📖 Documentation: [Full Documentation](https://docs.hashconnect.io)
