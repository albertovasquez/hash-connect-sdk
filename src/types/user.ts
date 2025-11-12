/**
 * Type definitions for user profile and authentication
 */

export interface UserProfile {
  address: string | null;
  clubId: string | null;
  clubName: string | null;
  signature: string | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export interface UserTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthData {
  address: string;
  clubId: string;
  clubName: string;
  accessToken: string;
  refreshToken: string;
}

export interface ConnectionData {
  address: string;
  signature: string;
}

