/**
 * HashConnect React Components
 * 
 * UI components for the React-only SDK architecture.
 * All components include 'use client' directive for Next.js App Router support.
 * 
 * @example
 * ```tsx
 * import { 
 *   HashConnectModal, 
 *   QRCodeDisplay, 
 *   ConnectionStatusIndicator 
 * } from '@hashpass/connect';
 * ```
 */

// Modal component - main connection UI
export { HashConnectModal } from './HashConnectModal';
export type { HashConnectModalProps } from './HashConnectModal';

// QR Code display component
export { QRCodeDisplay } from './QRCodeDisplay';
export type { QRCodeDisplayProps } from './QRCodeDisplay';

// Connection status indicator
export { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
export type { ConnectionStatusIndicatorProps } from './ConnectionStatusIndicator';

// Debug overlay component
export { DebugOverlay } from './DebugOverlay';
export type { DebugOverlayProps } from './DebugOverlay';
