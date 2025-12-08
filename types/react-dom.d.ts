/**
 * Minimal type declarations for react-dom
 * Full types should be installed via @types/react-dom for development
 */

declare module 'react-dom' {
  import { ReactNode, ReactPortal } from 'react';
  
  export function createPortal(
    children: ReactNode,
    container: Element | DocumentFragment,
    key?: null | string
  ): ReactPortal;
  
  export function render(
    element: ReactNode,
    container: Element | DocumentFragment | null
  ): void;
  
  export function unmountComponentAtNode(container: Element): boolean;
  
  export function flushSync<R>(fn: () => R): R;
}
