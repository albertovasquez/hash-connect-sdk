'use client';

/**
 * useHashConnect Hook - React-Only Architecture (v3)
 * 
 * This hook provides access to HashConnect functionality.
 * Must be used within a HashConnectProvider.
 * 
 * @example
 * ```tsx
 * import { useHashConnect } from '@hashpass/connect';
 * 
 * function MyComponent() {
 *   const { 
 *     isConnected, 
 *     userAddress, 
 *     connect, 
 *     disconnect,
 *     getToken,
 *   } = useHashConnect();
 * 
 *   if (!isConnected) {
 *     return <button onClick={connect}>Connect Wallet</button>;
 *   }
 * 
 *   return (
 *     <div>
 *       <p>Connected: {userAddress}</p>
 *       <button onClick={disconnect}>Disconnect</button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useContext } from 'react';
import { HashConnectContext } from './HashConnectContext';
import type { HashConnectContextType } from './HashConnectContext';

// Re-export the context type for external use
export type { HashConnectContextType } from './HashConnectContext';

// ============================================================================
// Return Types
// ============================================================================

export interface UseHashConnectReturn {
  /** Whether user is connected */
  isConnected: boolean;
  /** Whether connection is in progress */
  isLoading: boolean;
  /** Whether modal is currently open */
  isModalOpen: boolean;
  /** Connected user's wallet address */
  userAddress: string | null;
  /** User's club ID (if any) */
  clubId: string | null;
  /** User's club name (if any) */
  clubName: string | null;
  /** Current error message (if any) */
  error: string | null;
  /** Current Pusher connection state */
  connectionState: string;
  /** Start connection flow (opens modal) */
  connect: () => Promise<void>;
  /** Disconnect and clear session */
  disconnect: () => void;
  /** Get valid access token (auto-refreshes if expired) */
  getToken: () => Promise<string | null>;
  /** Get club ID */
  getClubId: () => string | null;
  /** Get club name */
  getClubName: () => string | null;
  /** Make authenticated API request */
  makeAuthRequest: <T>(url: string, options?: RequestInit) => Promise<T>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook to access HashConnect functionality
 * Must be used within a HashConnectProvider
 * 
 * @returns HashConnect state and methods
 * @throws Error if used outside of HashConnectProvider
 */
export function useHashConnect(): UseHashConnectReturn {
  const context = useContext(HashConnectContext);
  
  if (!context) {
    throw new Error(
      'useHashConnect must be used within a HashConnectProvider. ' +
      'Make sure your component is wrapped with <HashConnectProvider>.'
    );
  }

  return {
    isConnected: context.isConnected,
    isLoading: context.isLoading,
    isModalOpen: context.isModalOpen,
    userAddress: context.userAddress,
    clubId: context.clubId,
    clubName: context.clubName,
    error: context.error,
    connectionState: context.connectionState,
    connect: context.connect,
    disconnect: context.disconnect,
    getToken: context.getToken,
    getClubId: context.getClubId,
    getClubName: context.getClubName,
    makeAuthRequest: context.makeAuthRequest,
  };
}

export default useHashConnect;
