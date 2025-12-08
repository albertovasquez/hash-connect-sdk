/**
 * HashConnect React SDK - v3 (React-Only Architecture)
 * 
 * This is the main entry point for the React-only SDK.
 * No more window.HASHConnect or CustomEvents!
 * 
 * @example
 * ```tsx
 * import { 
 *   HashConnectProvider, 
 *   useHashConnect 
 * } from '@hashpass/connect';
 * 
 * function App() {
 *   return (
 *     <HashConnectProvider disclaimer="By connecting...">
 *       <MyApp />
 *     </HashConnectProvider>
 *   );
 * }
 * 
 * function MyApp() {
 *   const { isConnected, connect, disconnect, userAddress } = useHashConnect();
 *   
 *   return (
 *     <div>
 *       {isConnected ? (
 *         <>
 *           <p>Connected: {userAddress}</p>
 *           <button onClick={disconnect}>Disconnect</button>
 *         </>
 *       ) : (
 *         <button onClick={connect}>Connect</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */

// Import styles for modal and components
import '../styles.css';

// ============================================================================
// Main Exports - Provider and Hook
// ============================================================================

export { HashConnectProvider, useHashConnectContext } from './HashConnectProvider';
export type { HashConnectProviderProps, HashConnectConfig } from './HashConnectProvider';

export { useHashConnect } from './useHashConnect';
export type { UseHashConnectReturn } from './useHashConnect';

// ============================================================================
// Context and Types
// ============================================================================

export { HashConnectContext, initialAuthState } from './HashConnectContext';
export type { AuthState, HashConnectContextType } from './HashConnectContext';

// ============================================================================
// Hooks
// ============================================================================

export {
  useScriptLoader,
  preloadScript,
  useStorage,
  STORAGE_KEYS,
  usePusher,
  useTokenRefresh,
} from './hooks';

export type {
  UseScriptLoaderOptions,
  UseScriptLoaderReturn,
  UseStorageOptions,
  UseStorageReturn,
  StorageKey,
  UsePusherOptions,
  UsePusherReturn,
  UseTokenRefreshOptions,
  UseTokenRefreshReturn,
  TokenRefreshError,
} from './hooks';

// ============================================================================
// Components
// ============================================================================

export {
  HashConnectModal,
  QRCodeDisplay,
  ConnectionStatusIndicator,
} from './components';

export type {
  HashConnectModalProps,
  QRCodeDisplayProps,
  ConnectionStatusIndicatorProps,
} from './components';

// ============================================================================
// Types from core
// ============================================================================

export type { ConnectionState, PusherChannel, PusherClient } from '../types/pusher';
