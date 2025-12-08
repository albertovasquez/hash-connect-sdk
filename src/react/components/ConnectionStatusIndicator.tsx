'use client';

/**
 * Connection status indicator component
 * Shows the current Pusher connection state with visual feedback
 */

import React from 'react';
import type { ConnectionState } from '../../types/pusher';

export interface ConnectionStatusIndicatorProps {
  /** Current connection state */
  status: ConnectionState;
  /** Click handler (e.g., for manual reconnection) */
  onClick?: () => void;
  /** Custom class name */
  className?: string;
  /** Whether to show the text label */
  showText?: boolean;
}

/** Status configuration for each connection state */
const STATUS_CONFIG: Record<ConnectionState, { className: string; text: string }> = {
  initialized: { className: 'status-connecting', text: 'Initializing...' },
  connecting: { className: 'status-connecting', text: 'Connecting...' },
  connected: { className: 'status-connected', text: 'Connected' },
  disconnected: { className: 'status-disconnected', text: 'Disconnected' },
  failed: { className: 'status-failed', text: 'Connection Failed' },
  unavailable: { className: 'status-reconnecting', text: 'Reconnecting...' },
};

/**
 * Visual indicator showing the current connection status
 * 
 * @example
 * ```tsx
 * <ConnectionStatusIndicator 
 *   status={connectionState} 
 *   onClick={() => window.location.reload()}
 * />
 * ```
 */
export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  status,
  onClick,
  className = '',
  showText = true,
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.connecting;
  const isInteractive = typeof onClick === 'function';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  // Only attach interactive handlers and attributes when onClick is provided
  const interactiveProps = isInteractive
    ? {
        onClick: () => onClick?.(),
        onKeyDown: handleKeyDown,
        role: 'button' as const,
        tabIndex: 0,
        style: { cursor: 'pointer' },
      }
    : {
        role: 'status' as const,
        style: { cursor: 'default' },
      };

  return (
    <div
      id="hash-connect-status-indicator"
      className={className}
      aria-label={`Connection status: ${config.text}`}
      {...interactiveProps}
    >
      <span
        id="hash-connect-status-dot"
        className={config.className}
        aria-hidden="true"
      />
      {showText && (
        <span id="hash-connect-status-text">
          {config.text}
        </span>
      )}
    </div>
  );
};

export default ConnectionStatusIndicator;
