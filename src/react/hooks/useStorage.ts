/**
 * React hook for safe localStorage access
 * SSR-safe: falls back to in-memory storage when localStorage is unavailable
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

export interface UseStorageOptions {
  /** Prefix for all keys (default: 'hc:') */
  prefix?: string;
  /** Enable cross-tab synchronization */
  syncAcrossTabs?: boolean;
}

export interface UseStorageReturn {
  /** Get an item from storage */
  getItem: (key: string) => string | null;
  /** Set an item in storage */
  setItem: (key: string, value: string) => boolean;
  /** Remove an item from storage */
  removeItem: (key: string) => boolean;
  /** Clear all prefixed items */
  clear: () => boolean;
  /** Whether localStorage is available */
  isAvailable: boolean;
}

/**
 * Hook for safe localStorage access with SSR support
 * 
 * @example
 * ```tsx
 * const storage = useStorage({ prefix: 'hc:' });
 * 
 * // Store a value
 * storage.setItem('token', 'abc123');
 * 
 * // Retrieve a value
 * const token = storage.getItem('token');
 * 
 * // Remove a value
 * storage.removeItem('token');
 * ```
 */
export function useStorage(options: UseStorageOptions = {}): UseStorageReturn {
  const { prefix = 'hc:', syncAcrossTabs = true } = options;
  
  // In-memory fallback storage
  const fallbackRef = useRef(new Map<string, string>());
  
  // Check if localStorage is available (SSR-safe)
  const isAvailable = useMemo(() => {
    if (typeof window === 'undefined') return false;
    
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Track storage updates for re-renders
  const [, forceUpdate] = useState({});

  const getItem = useCallback((key: string): string | null => {
    const prefixedKey = `${prefix}${key}`;
    
    // SSR safety
    if (typeof window === 'undefined') {
      return fallbackRef.current.get(prefixedKey) ?? null;
    }
    
    try {
      if (isAvailable) {
        return localStorage.getItem(prefixedKey);
      }
      return fallbackRef.current.get(prefixedKey) ?? null;
    } catch {
      return fallbackRef.current.get(prefixedKey) ?? null;
    }
  }, [prefix, isAvailable]);

  const setItem = useCallback((key: string, value: string): boolean => {
    const prefixedKey = `${prefix}${key}`;
    
    // SSR safety
    if (typeof window === 'undefined') {
      fallbackRef.current.set(prefixedKey, value);
      return true;
    }
    
    try {
      if (isAvailable) {
        localStorage.setItem(prefixedKey, value);
        return true;
      }
      fallbackRef.current.set(prefixedKey, value);
      return true;
    } catch (error) {
      // Quota exceeded or other error - use fallback
      console.warn('[useStorage] localStorage write failed, using fallback:', error);
      fallbackRef.current.set(prefixedKey, value);
      return false;
    }
  }, [prefix, isAvailable]);

  const removeItem = useCallback((key: string): boolean => {
    const prefixedKey = `${prefix}${key}`;
    
    // SSR safety
    if (typeof window === 'undefined') {
      fallbackRef.current.delete(prefixedKey);
      return true;
    }
    
    try {
      if (isAvailable) {
        localStorage.removeItem(prefixedKey);
      }
      fallbackRef.current.delete(prefixedKey);
      return true;
    } catch {
      fallbackRef.current.delete(prefixedKey);
      return false;
    }
  }, [prefix, isAvailable]);

  const clear = useCallback((): boolean => {
    // SSR safety
    if (typeof window === 'undefined') {
      fallbackRef.current.clear();
      return true;
    }
    
    try {
      if (isAvailable) {
        // Only clear our prefixed keys
        const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
        keys.forEach(k => localStorage.removeItem(k));
      }
      fallbackRef.current.clear();
      return true;
    } catch {
      fallbackRef.current.clear();
      return false;
    }
  }, [prefix, isAvailable]);

  // Cross-tab synchronization
  useEffect(() => {
    if (!syncAcrossTabs || typeof window === 'undefined') return;

    const handleStorageChange = (event: StorageEvent) => {
      // Only react to our prefixed keys
      if (!event.key?.startsWith(prefix)) return;
      
      // Force re-render to pick up new values
      forceUpdate({});
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [prefix, syncAcrossTabs]);

  // Memoize the return object to prevent unnecessary re-renders
  // of components that depend on the storage object reference
  return useMemo(() => ({
    getItem,
    setItem,
    removeItem,
    clear,
    isAvailable,
  }), [getItem, setItem, removeItem, clear, isAvailable]);
}

/**
 * Storage keys used by HashConnect
 */
export const STORAGE_KEYS = {
  SESSION_ID: 'sessionId',
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  ADDRESS: 'address',
  SIGNATURE: 'signature',
  CLUB_ID: 'clubId',
  CLUB_NAME: 'clubName',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
