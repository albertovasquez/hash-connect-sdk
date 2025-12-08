/**
 * React hook for loading external scripts (Pusher, QRCode)
 * SSR-safe: handles server-side rendering gracefully
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseScriptLoaderOptions {
  /** Number of retry attempts on failure */
  retries?: number;
  /** Callback when script loads successfully */
  onLoad?: () => void;
  /** Callback when script fails to load */
  onError?: (error: Error) => void;
}

export interface UseScriptLoaderReturn {
  /** Whether the script has loaded successfully */
  loaded: boolean;
  /** Whether the script is currently loading */
  loading: boolean;
  /** Error if script failed to load */
  error: Error | null;
  /** Manually retry loading the script */
  retry: () => void;
}

// Track loaded scripts globally to avoid duplicate loading
const loadedScripts = new Map<string, boolean>();
const loadingPromises = new Map<string, Promise<void>>();

/**
 * Hook to load an external script with retry support
 * 
 * @example
 * ```tsx
 * const { loaded, loading, error } = useScriptLoader(
 *   'https://js.pusher.com/8.0.1/pusher.min.js',
 *   { retries: 3 }
 * );
 * 
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Failed to load</div>;
 * if (loaded) return <div>Ready!</div>;
 * ```
 */
export function useScriptLoader(
  src: string,
  options: UseScriptLoaderOptions = {}
): UseScriptLoaderReturn {
  const { retries = 3, onLoad, onError } = options;

  const [loaded, setLoaded] = useState(() => {
    // Check if already loaded (SSR-safe)
    if (typeof window === 'undefined') return false;
    return loadedScripts.get(src) ?? false;
  });
  
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !loadedScripts.get(src) && loadingPromises.has(src);
  });
  
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Use refs for callbacks to avoid stale closures in async operations
  // This ensures the current callbacks are always called, even if they change mid-load
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  
  // Track current src and retries to detect stale retry attempts
  const currentSrcRef = useRef(src);
  const currentRetriesRef = useRef(retries);
  
  // Track pending retry timeout for cleanup
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Keep refs up to date
  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);
  
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Clear any pending retry timeout
  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const loadScript = useCallback(async (attemptsLeft: number, targetSrc: string): Promise<void> => {
    // SSR safety check
    if (typeof window === 'undefined') return;

    // Check if this retry is still for the current src (prevents stale retries)
    if (targetSrc !== currentSrcRef.current) {
      return; // Abort - src changed, this retry is stale
    }

    // Already loaded
    if (loadedScripts.get(targetSrc)) {
      setLoaded(true);
      setLoading(false);
      return;
    }

    // Check if already loading
    const existingPromise = loadingPromises.get(targetSrc);
    if (existingPromise) {
      await existingPromise;
      return;
    }

    // Check if script tag already exists in DOM
    const existingScript = document.querySelector(`script[src="${targetSrc}"]`) as HTMLScriptElement | null;
    if (existingScript) {
      // Script tag exists, but we need to verify it has actually finished loading
      // A script tag can be present in the DOM but still be loading
      
      // Create a promise to wait for the existing script to load
      const existingLoadPromise = new Promise<void>((resolve, reject) => {
        // Check if the script has already loaded by checking for expected globals
        // This is a heuristic - if the script finished loading, certain globals should exist
        // For common scripts like Pusher and QRCode, check their globals
        const scriptAlreadyExecuted = (
          (targetSrc.includes('pusher') && typeof window.Pusher !== 'undefined') ||
          (targetSrc.includes('qrcode') && typeof window.QRCode !== 'undefined')
        );
        
        if (scriptAlreadyExecuted) {
          loadedScripts.set(targetSrc, true);
          setLoaded(true);
          setLoading(false);
          onLoadRef.current?.();
          resolve();
          return;
        }
        
        // Script tag exists but hasn't executed yet - wait for it
        setLoading(true);
        
        const handleLoad = () => {
          cleanup();
          loadedScripts.set(targetSrc, true);
          setLoaded(true);
          setLoading(false);
          onLoadRef.current?.();
          resolve();
        };
        
        const handleError = () => {
          cleanup();
          // Remove the failed script and let our retry logic handle it
          existingScript.remove();
          loadedScripts.delete(targetSrc);
          // Delete the failed promise to allow retry attempts
          loadingPromises.delete(targetSrc);
          
          const err = new Error(`Existing script failed to load: ${targetSrc}`);
          setLoading(false);
          setError(err);
          onErrorRef.current?.(err);
          reject(err);
        };
        
        const cleanup = () => {
          existingScript.removeEventListener('load', handleLoad);
          existingScript.removeEventListener('error', handleError);
        };
        
        existingScript.addEventListener('load', handleLoad);
        existingScript.addEventListener('error', handleError);
        
        // Safety timeout - if the script doesn't load within 30s, consider it failed
        // This handles edge cases where events might have already fired
        setTimeout(() => {
          // Re-check if global exists (script might have loaded in the meantime)
          const globalNowExists = (
            (targetSrc.includes('pusher') && typeof window.Pusher !== 'undefined') ||
            (targetSrc.includes('qrcode') && typeof window.QRCode !== 'undefined')
          );
          
          if (globalNowExists) {
            handleLoad();
          }
          // If not loaded by timeout, the error handler will eventually fire
          // or we keep waiting - don't force an error here as network might be slow
        }, 5000);
      });
      
      loadingPromises.set(targetSrc, existingLoadPromise);
      
      try {
        await existingLoadPromise;
      } catch (err) {
        // Error already handled
      }
      return;
    }

    setLoading(true);
    setError(null);

    const loadPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = targetSrc;
      script.async = true;

      script.onload = () => {
        loadedScripts.set(targetSrc, true);
        loadingPromises.delete(targetSrc);
        setLoaded(true);
        setLoading(false);
        onLoadRef.current?.();
        resolve();
      };

      script.onerror = () => {
        loadingPromises.delete(targetSrc);
        script.remove();

        const err = new Error(`Failed to load script: ${targetSrc}`);
        
        // Check if this is still the current src before retrying
        if (targetSrc !== currentSrcRef.current) {
          reject(err); // Abort - src changed
          return;
        }
        
        if (attemptsLeft > 0) {
          // Retry with exponential backoff
          // Use currentRetriesRef to get correct delay calculation
          const totalRetries = currentRetriesRef.current;
          const delay = Math.pow(2, totalRetries - attemptsLeft) * 500;
          
          // Clear any existing retry timeout before setting a new one
          clearRetryTimeout();
          
          retryTimeoutRef.current = setTimeout(() => {
            // Double-check src hasn't changed before retrying
            if (targetSrc === currentSrcRef.current) {
              loadScript(attemptsLeft - 1, targetSrc).catch(reject);
            } else {
              reject(new Error('Script source changed during retry'));
            }
          }, delay);
        } else {
          setLoading(false);
          setError(err);
          onErrorRef.current?.(err);
          reject(err);
        }
      };

      document.head.appendChild(script);
    });

    loadingPromises.set(targetSrc, loadPromise);

    try {
      await loadPromise;
    } catch (err) {
      // Error already handled in onerror
    }
  }, [clearRetryTimeout]); // Removed src/retries - using refs and passing targetSrc as parameter

  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') return;

    // Update ref SYNCHRONOUSLY before calling loadScript to prevent race condition
    // This ensures the ref is up-to-date when loadScript checks it at line 109
    currentSrcRef.current = src;
    currentRetriesRef.current = retries;

    // Clear any pending retry from previous src
    clearRetryTimeout();
    
    // Pass retries as attemptsLeft so that retries: 3 means 1 initial + 3 retries = 4 total attempts
    loadScript(retries, src);
    
    // Cleanup: cancel pending retries when src changes or component unmounts
    return () => {
      clearRetryTimeout();
    };
  }, [src, retryCount, loadScript, retries, clearRetryTimeout]);

  const retry = useCallback(() => {
    setRetryCount(c => c + 1);
    setError(null);
    loadedScripts.delete(src);
  }, [src]);

  return { loaded, loading, error, retry };
}

/**
 * Preload a script without waiting for it
 * Useful for preloading scripts that will be needed soon
 */
export function preloadScript(src: string): void {
  if (typeof window === 'undefined') return;
  if (loadedScripts.get(src) || loadingPromises.has(src)) return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'script';
  link.href = src;
  document.head.appendChild(link);
}
