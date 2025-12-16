'use client';

/**
 * Debug overlay component for HashConnect
 * Shows internal logs in a fixed overlay at bottom-right corner
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LogEvent } from '../HashConnectProvider';

export interface DebugOverlayProps {
  /** Whether the overlay is visible */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Log events to display */
  logs: LogEvent[];
}

/**
 * Format timestamp for display (HH:mm:ss.SSS)
 */
function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

/**
 * Determine log level from message content
 */
function getLogLevel(message: string): 'info' | 'error' | 'warning' | 'success' {
  if (message.includes('❌') || message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
    return 'error';
  }
  if (message.includes('⚠️') || message.toLowerCase().includes('warning')) {
    return 'warning';
  }
  if (message.includes('✅') || message.toLowerCase().includes('success')) {
    return 'success';
  }
  return 'info';
}

/**
 * Extract component prefix from log message
 */
function extractPrefix(message: string): string {
  const match = message.match(/^\[([^\]]+)\]/);
  return match ? match[1] : 'Unknown';
}

/**
 * Debug overlay for displaying SDK logs
 *
 * @example
 * ```tsx
 * <DebugOverlay
 *   isOpen={isDebugMode}
 *   onClose={() => setIsDebugMode(false)}
 *   logs={debugLogs}
 * />
 * ```
 */
export const DebugOverlay: React.FC<DebugOverlayProps> = ({
  isOpen,
  onClose,
  logs,
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Handle scroll to detect manual scrolling
  const handleScroll = () => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
      setAutoScroll(isAtBottom);
    }
  };

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Don't render if not open or SSR
  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const overlayContent = (
    <div id="hash-connect-debug-overlay">
      <div id="hash-connect-debug-header">
        <div id="hash-connect-debug-title">
          <span id="hash-connect-debug-icon">🐛</span>
          <span>HashConnect Debug</span>
          <span id="hash-connect-debug-count">({logs.length})</span>
        </div>
        <div id="hash-connect-debug-actions">
          <button
            id="hash-connect-debug-scroll-btn"
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
            aria-label={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
          >
            {autoScroll ? '📌' : '📍'}
          </button>
          <button
            id="hash-connect-debug-close-btn"
            onClick={onClose}
            aria-label="Close debug overlay"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        id="hash-connect-debug-logs"
        ref={logContainerRef}
        onScroll={handleScroll}
      >
        {logs.length === 0 ? (
          <div id="hash-connect-debug-empty">
            No logs yet. Logs will appear here as the SDK operates.
          </div>
        ) : (
          logs.map((log, index) => {
            const level = getLogLevel(log.message);
            const prefix = extractPrefix(log.message);

            return (
              <div
                key={`${log.timestamp.getTime()}-${index}`}
                className={`hash-connect-debug-log hash-connect-debug-log-${level}`}
              >
                <span className="hash-connect-debug-log-time">
                  {formatTime(log.timestamp)}
                </span>
                <span className="hash-connect-debug-log-prefix">
                  {prefix}
                </span>
                <span className="hash-connect-debug-log-message">
                  {log.message.replace(/^\[[^\]]+\]\s*/, '')}
                </span>
              </div>
            );
          })
        )}
      </div>

      {!autoScroll && (
        <div id="hash-connect-debug-scroll-notice">
          Auto-scroll disabled. Click 📍 to re-enable.
        </div>
      )}
    </div>
  );

  // Render overlay using portal
  return createPortal(overlayContent, document.body);
};

export default DebugOverlay;
