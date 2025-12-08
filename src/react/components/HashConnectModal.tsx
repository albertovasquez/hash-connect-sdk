'use client';

/**
 * HashConnect Modal component
 * Renders a modal using React Portal for connecting via QR code
 */

import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeDisplay } from './QRCodeDisplay';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import type { ConnectionState } from '../../types/pusher';

export interface HashConnectModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Session URL to encode in QR code */
  sessionUrl: string;
  /** Current connection state */
  connectionState: ConnectionState;
  /** Optional disclaimer text */
  disclaimer?: string;
  /** Logo URL (optional, uses default Hash Pass logo) */
  logoUrl?: string;
  /** Title (default: "Hash Pass") */
  title?: string;
  /** Subtitle (default: "Connect") */
  subtitle?: string;
}

// Default Hash Pass logo
const DEFAULT_LOGO_URL = 'https://static.wixstatic.com/media/1c3ebd_9660355aa2644311ab42dfaece940db0~mv2.png/v1/fill/w_166,h_19,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/1c3ebd_9660355aa2644311ab42dfaece940db0~mv2.png';

/**
 * Modal for HashConnect QR code authentication
 * 
 * @example
 * ```tsx
 * <HashConnectModal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   sessionUrl="hc:abc123"
 *   connectionState="connecting"
 *   disclaimer="By connecting, you agree to our terms."
 * />
 * ```
 */
export const HashConnectModal: React.FC<HashConnectModalProps> = ({
  isOpen,
  onClose,
  sessionUrl,
  connectionState,
  disclaimer,
  logoUrl = DEFAULT_LOGO_URL,
  title = 'Hash Pass',
  subtitle = 'Connect',
}) => {
  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Handle content click (stop propagation)
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Handle status indicator click (reload page for reconnection)
  const handleStatusClick = useCallback(() => {
    if (connectionState === 'failed' || connectionState === 'disconnected') {
      window.location.reload();
    }
  }, [connectionState]);

  // Don't render if not open or SSR
  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const modalContent = (
    <div
      id="hash-connect-modal"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hash-connect-modal-title"
    >
      <div
        id="hash-connect-modal-content"
        onClick={handleContentClick}
      >
        {/* Close button */}
        <button
          id="hash-connect-close-button"
          onClick={onClose}
          aria-label="Close modal"
          type="button"
        >
          ✕
        </button>

        {/* Connection status indicator */}
        <ConnectionStatusIndicator
          status={connectionState}
          onClick={handleStatusClick}
        />

        {/* Main content */}
        <div id="hash-connect-content">
          <h1 id="hash-connect-modal-title">{title}</h1>
          <h2>{subtitle}</h2>

          {/* QR Code */}
          <QRCodeDisplay value={sessionUrl} size={130} />

          {/* Disclaimer */}
          {disclaimer && (
            <div id="hash-connect-modal-footer">
              {disclaimer}
            </div>
          )}
        </div>

        {/* Logo */}
        <div id="hash-connect-logo">
          <img
            src={logoUrl}
            alt={title}
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );

  // Render modal using portal
  return createPortal(modalContent, document.body);
};

export default HashConnectModal;
