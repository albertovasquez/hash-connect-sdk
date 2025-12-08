/**
 * HashConnect Context - Shared between Provider and Hook
 */

import { createContext } from 'react';
import type { ConnectionState } from '../types/pusher';

// ============================================================================
// Auth State Type
// ============================================================================

export interface AuthState {
  isConnected: boolean;
  isLoading: boolean;
  isModalOpen: boolean;
  userAddress: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  signature: string | null;
  clubId: string | null;
  clubName: string | null;
  sessionId: string | null;
  error: string | null;
}

// ============================================================================
// Context Type
// ============================================================================

export interface HashConnectContextType extends AuthState {
  /** Connect - opens modal and starts authentication flow */
  connect: () => Promise<void>;
  /** Disconnect - clears session and tokens */
  disconnect: () => void;
  /** Get current valid access token (auto-refreshes if expired) */
  getToken: () => Promise<string | null>;
  /** Get club ID */
  getClubId: () => string | null;
  /** Get club name */
  getClubName: () => string | null;
  /** Current Pusher connection state */
  connectionState: ConnectionState;
  /** Make an authenticated API request */
  makeAuthRequest: <T>(url: string, options?: RequestInit) => Promise<T>;
}

// ============================================================================
// Initial State
// ============================================================================

export const initialAuthState: AuthState = {
  isConnected: false,
  isLoading: false,
  isModalOpen: false,
  userAddress: null,
  accessToken: null,
  refreshToken: null,
  signature: null,
  clubId: null,
  clubName: null,
  sessionId: null,
  error: null,
};

// ============================================================================
// Context
// ============================================================================

export const HashConnectContext = createContext<HashConnectContextType | undefined>(undefined);
