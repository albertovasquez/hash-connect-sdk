/**
 * React hook for loading external scripts (Pusher, QRCode)
 * SSR-safe: handles server-side rendering gracefully
 */

import { useState, useEffect, useCallback } from 'react';

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

  const loadScript = useCallback(async (attemptsLeft: number): Promise<void> => {
    // SSR safety check
    if (typeof window === 'undefined') return;

    // Already loaded
    if (loadedScripts.get(src)) {
      setLoaded(true);
      setLoading(false);
      return;
    }

    // Check if already loading
    const existingPromise = loadingPromises.get(src);
    if (existingPromise) {
      await existingPromise;
      return;
    }

    // Check if script tag already exists in DOM
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      loadedScripts.set(src, true);
      setLoaded(true);
      setLoading(false);
      onLoad?.();
      return;
    }

    setLoading(true);
    setError(null);

    const loadPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;

      script.onload = () => {
        loadedScripts.set(src, true);
        loadingPromises.delete(src);
        setLoaded(true);
        setLoading(false);
        onLoad?.();
        resolve();
      };

      script.onerror = () => {
        loadingPromises.delete(src);
        script.remove();

        const err = new Error(`Failed to load script: ${src}`);
        
        if (attemptsLeft > 0) {
          // Retry with exponential backoff
          const delay = Math.pow(2, retries - attemptsLeft) * 500;
          setTimeout(() => {
            loadScript(attemptsLeft - 1).catch(reject);
          }, delay);
        } else {
          setLoading(false);
          setError(err);
          onError?.(err);
          reject(err);
        }
      };

      document.head.appendChild(script);
    });

    loadingPromises.set(src, loadPromise);

    try {
      await loadPromise;
    } catch (err) {
      // Error already handled in onerror
    }
  }, [src, retries, onLoad, onError]);

  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') return;

    loadScript(retries - 1);
  }, [src, retryCount]); // eslint-disable-line react-hooks/exhaustive-deps

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
