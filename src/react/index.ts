/**
 * React integration for HashConnect SDK
 * 
 * @example
 * import { useHashConnect } from '@hashpass/connect/react';
 * 
 * function MyComponent() {
 *   const { isConnected, connect, disconnect } = useHashConnect();
 *   // ...
 * }
 * 
 * @example
 * import { HashConnectProvider, useHashConnectContext } from '@hashpass/connect/react';
 * 
 * function App() {
 *   return (
 *     <HashConnectProvider>
 *       <MyApp />
 *     </HashConnectProvider>
 *   );
 * }
 */

export { useHashConnect } from './useHashConnect';
export type { UseHashConnectReturn } from './useHashConnect';

export { HashConnectProvider, useHashConnectContext } from './HashConnectProvider';
export type { HashConnectProviderProps } from './HashConnectProvider';

