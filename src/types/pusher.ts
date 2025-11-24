/**
 * Type definitions for Pusher
 */

export interface PusherChannel {
  bind: (eventName: string, callback: (data: any) => void) => void;
  unbind: (eventName?: string, callback?: (data: any) => void) => void;
  trigger: (eventName: string, data: any) => void;
}

export interface PusherConnection {
  state: string;
  bind: (eventName: string, callback: (...args: any[]) => void) => void;
  unbind: (eventName?: string) => void;
}

export interface PusherClient {
  subscribe: (channelName: string) => PusherChannel;
  unsubscribe: (channelName: string) => void;
  disconnect: () => void;
  connection: PusherConnection;
}

export interface PusherConfig {
  cluster: string;
  authEndpoint: string;
}

export type ConnectionState = 
  | 'initialized'
  | 'connecting'
  | 'connected'
  | 'unavailable'
  | 'failed'
  | 'disconnected';

