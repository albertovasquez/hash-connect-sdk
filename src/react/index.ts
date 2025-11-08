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

// Import the main SDK automatically for React users
import '../index';

export { useHashConnect } from './useHashConnect';
export type { UseHashConnectReturn, UseHashConnectOptions } from './useHashConnect';

export { HashConnectProvider, useHashConnectContext } from './HashConnectProvider';
export type { HashConnectProviderProps } from './HashConnectProvider';


