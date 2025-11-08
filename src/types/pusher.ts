/**
 * Type definitions for Pusher
 */

export interface PusherChannel {
  bind: (eventName: string, callback: (data: any) => void) => void;
  unbind: (eventName?: string, callback?: (data: any) => void) => void;
  trigger: (eventName: string, data: any) => void;
}

export interface PusherClient {
  subscribe: (channelName: string) => PusherChannel;
  unsubscribe: (channelName: string) => void;
  disconnect: () => void;
}

export interface PusherConfig {
  cluster: string;
  authEndpoint: string;
}

