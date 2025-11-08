# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
