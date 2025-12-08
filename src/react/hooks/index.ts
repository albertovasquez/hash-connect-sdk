/**
 * HashConnect React Hooks
 * 
 * Core hooks for the React-only SDK architecture.
 * All hooks are SSR-safe and can be used with Next.js.
 * 
 * @example
 * ```tsx
 * import { useStorage, usePusher, useTokenRefresh } from '@hashpass/connect';
 * ```
 */

// Script loader hook - for loading external CDN scripts
export { useScriptLoader, preloadScript } from './useScriptLoader';
export type { UseScriptLoaderOptions, UseScriptLoaderReturn } from './useScriptLoader';

// Storage hook - safe localStorage with fallback
export { useStorage, STORAGE_KEYS } from './useStorage';
export type { UseStorageOptions, UseStorageReturn, StorageKey } from './useStorage';

// Pusher hook - real-time communication
export { usePusher } from './usePusher';
export type { UsePusherOptions, UsePusherReturn } from './usePusher';

// Token refresh hook - automatic token management
export { useTokenRefresh } from './useTokenRefresh';
export type { 
  UseTokenRefreshOptions, 
  UseTokenRefreshReturn, 
  TokenRefreshError,
  LogEvent as TokenRefreshLogEvent
} from './useTokenRefresh';
