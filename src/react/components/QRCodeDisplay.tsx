'use client';

/**
 * QR Code display component
 * Loads QRCode library from CDN and renders a QR code
 */

import React, { useRef, useEffect, useState } from 'react';
import { useScriptLoader } from '../hooks/useScriptLoader';
import type { QRCodeConstructor, QRCodeCorrectLevel } from '../../types/qrcode';

// QRCode CDN URL
const QRCODE_SCRIPT_URL = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';

export interface QRCodeDisplayProps {
  /** The value to encode in the QR code */
  value: string;
  /** Size of the QR code in pixels (default: 130) */
  size?: number;
  /** Dark color (default: #000000) */
  colorDark?: string;
  /** Light color (default: #ffffff) */
  colorLight?: string;
  /** Custom class name */
  className?: string;
  /** Error correction level: L, M, Q, H (default: H) */
  correctLevel?: 'L' | 'M' | 'Q' | 'H';
}

declare global {
  interface Window {
    QRCode: QRCodeConstructor;
  }
}

/**
 * Displays a QR code for the given value
 * 
 * @example
 * ```tsx
 * <QRCodeDisplay 
 *   value="hc:abc123" 
 *   size={150}
 * />
 * ```
 */
export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 130,
  colorDark = '#000000',
  colorLight = '#ffffff',
  className = '',
  correctLevel = 'H',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Load QRCode script from CDN
  const { loaded, loading, error: scriptError } = useScriptLoader(QRCODE_SCRIPT_URL, {
    retries: 3,
  });

  // Generate QR code when script is loaded and value changes
  useEffect(() => {
    if (!loaded || !containerRef.current || !value) return;

    // Check if QRCode is available
    if (!window.QRCode) {
      setError('QRCode library not available');
      return;
    }

    try {
      // Clear previous QR code
      containerRef.current.innerHTML = '';

      // Get correct level value from the QRCode library
      const correctLevelValue = window.QRCode.CorrectLevel[correctLevel];

      // Generate new QR code
      new window.QRCode(containerRef.current, {
        text: value,
        width: size,
        height: size,
        colorDark,
        colorLight,
        correctLevel: correctLevelValue,
      });

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
    }
  }, [loaded, value, size, colorDark, colorLight, correctLevel]);

  // Handle loading state
  if (loading) {
    return (
      <div 
        id="hash-connect-qrcode" 
        className={className}
        style={{ 
          width: size, 
          height: size, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: colorLight,
        }}
        aria-busy="true"
        aria-label="Loading QR code..."
      >
        <span style={{ fontSize: '0.75rem', color: '#666' }}>Loading...</span>
      </div>
    );
  }

  // Handle error state
  if (scriptError || error) {
    return (
      <div 
        id="hash-connect-qrcode" 
        className={className}
        style={{ 
          width: size, 
          height: size, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#fee',
          border: '1px solid #f00',
        }}
        role="alert"
      >
        <span style={{ fontSize: '0.75rem', color: '#c00' }}>
          {error || 'Failed to load QR code'}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id="hash-connect-qrcode"
      className={className}
      aria-label={`QR code for: ${value}`}
      role="img"
    />
  );
};

export default QRCodeDisplay;
