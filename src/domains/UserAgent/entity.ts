import { storage } from "../../utils/storage";
import { PusherClient } from "../../types/pusher";
import { QRCodeConstructor } from "../../types/qrcode";
import { UserProfile, UserTokens } from "../../types/user";
import { log, logError, logWarn } from "../../config";

type ConnectFunction = (params: {
  openModal: () => void;
  pusherClient: PusherClient;
  channelName: string | null;
  setProfile: (address: string, signature: string, accessToken: string, refreshToken: string) => void;
  getProfile: () => UserProfile;
  setToken: (accessToken: string, refreshToken: string) => void;
  onDisconnect: () => void;
}) => void;

const makeUserAgent = ({
  connect: _connect,
  openModal: _openModal,
  getQrCodeGenerator,
  getPusherClient,
  isExpired,
  getNewTokens,
}: {
  connect?: ConnectFunction;
  openModal?: (onReady: () => void, onClose: () => void) => void;
  getQrCodeGenerator: () => Promise<QRCodeConstructor>;
  getPusherClient: () => Promise<PusherClient>;
  isExpired: (token: string) => boolean;
  getNewTokens: () => Promise<UserTokens>;
}) => {
  // privates
  let sessionId: string | null = null;
  let isConnected = false;
  let isConnecting = false; // Guard against race conditions
  let pusherClient: PusherClient | null = null;
  let qrCodeGenerator: QRCodeConstructor | null = null;
  let QRCodeString: string | null = null;
  let SessionChannelName: string | null = null;
  let tokenRefreshFailureCount = 0; // Track consecutive token refresh failures
  const MAX_TOKEN_REFRESH_FAILURES = 3; // Disconnect after 3 consecutive failures
  let tokenRefreshInProgress: Promise<string | null> | null = null; // Mutex for token refresh
  let profile: UserProfile = {
    address: null,
    signature: null,
    accessToken: null,
    refreshToken: null,
    clubId: null,
    clubName: null,
  };

  // Load existing profile from storage
  try {
    const storedAccessToken = storage.getItem("hc:accessToken");
    if (storedAccessToken) {
      profile.accessToken = storedAccessToken;
      profile.refreshToken = storage.getItem("hc:refreshToken");
      profile.signature = storage.getItem("hc:signature");
      profile.address = storage.getItem("hc:address");
      profile.clubId = storage.getItem("hc:clubId");
      profile.clubName = storage.getItem("hc:clubName");
      log("[UserAgent] Profile loaded from storage:", { 
        hasAddress: !!profile.address, 
        hasAccessToken: !!profile.accessToken,
        hasRefreshToken: !!profile.refreshToken 
      });
    }
  } catch (error) {
      logError("Error loading profile from storage:", error);
  }

  const onDisconnect = () => {
    try {
      log("[Pusher] Disconnecting and cleaning up...");
      storage.removeItem("hc:sessionId");
      
      if (pusherClient) {
        if (SessionChannelName) {
          try {
            log(`[Pusher] Unsubscribing from session channel: ${SessionChannelName}`);
            pusherClient.unsubscribe(SessionChannelName);
          } catch (error) {
            logWarn("[Pusher] Error unsubscribing from session channel:", error);
          }
        }
        
        if (profile.address) {
          const userChannelName = `private-${profile.address}`;
          try {
            log(`[Pusher] Unsubscribing from user channel: ${userChannelName}`);
            pusherClient.unsubscribe(userChannelName);
          } catch (error) {
            logWarn("[Pusher] Error unsubscribing from user channel:", error);
          }
        }
      }
      
      // Reset session state to allow fresh connection
      sessionId = null;
      QRCodeString = null;
      SessionChannelName = null;
      
      isConnected = false;
      isConnecting = false;
      
      // Reset token refresh failure counter and mutex on disconnect
      tokenRefreshFailureCount = 0;
      tokenRefreshInProgress = null;
      log("[Pusher] Token refresh failure counter and mutex reset");
      
      profile = {
        address: null,
        signature: null,
        accessToken: null,
        refreshToken: null,
        clubId: null,
        clubName: null,
      };
    } catch (error) {
      logError("Error during disconnect:", error);
    }
  };

  const connect = async () => {
    log('[UserAgent] connect() called');
    
    // Check if session was cleared (e.g., by React disconnect)
    const storedSessionId = storage.getItem("hc:sessionId");
    if (sessionId && !storedSessionId) {
      log('[UserAgent] Session was cleared externally, resetting state...');
      // Reset state
      sessionId = null;
      QRCodeString = null;
      SessionChannelName = null;
      isConnected = false;
      isConnecting = false;
      profile = {
        address: null,
        clubId: null,
        clubName: null,
        signature: null,
        accessToken: null,
        refreshToken: null,
      };
    }
    
    log('[UserAgent] Current state:', { isConnected, isConnecting, hasSessionId: !!sessionId });
    
    // Guard against multiple simultaneous connection attempts
    if (isConnected || isConnecting) {
      logWarn("[UserAgent] ⚠️ Connection blocked! Already connected or connecting", { 
        isConnected, 
        isConnecting,
        sessionId: sessionId ? `${sessionId.substring(0, 8)}...` : null,
        hasStoredSession: !!storage.getItem("hc:sessionId")
      });
      logWarn("[UserAgent] 💡 Tip: If stuck, clear localStorage and refresh the page");
      return;
    }

    log('[UserAgent] Starting connection process...');
    isConnecting = true;

    try {
      // Initialize pusher client if needed
      if (pusherClient === null) {
        log('[UserAgent] Pusher client not initialized, creating...');
        pusherClient = await getPusherClient();
        log('[UserAgent] ✅ Pusher client initialized');
      }
      
      // Always generate a new session ID if one doesn't exist (e.g., after disconnect)
      if (!sessionId) {
        log('[UserAgent] No session ID exists, generating new one...');
        sessionId = Math.random().toString(36).slice(2);
        QRCodeString = `hc:${sessionId}`;
        SessionChannelName = `private-hc-${sessionId}`;
        log('[UserAgent] ✅ Session created:', { sessionId, QRCodeString, SessionChannelName });
      } else {
        log('[UserAgent] Using existing session:', { sessionId, SessionChannelName });
      }

      log('[UserAgent] Checking if _connect function is provided...');
      if (_connect) {
        log('[UserAgent] ✅ _connect function found, calling it...');
        _connect({
          openModal,
          pusherClient,
          channelName: SessionChannelName,
          setProfile: (
            address: string,
            signature: string,
            accessToken: string,
            refreshToken: string
          ) => {
            profile.address = address;
            profile.signature = signature;
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
          },
          getProfile: () => profile,
          setToken: (accessToken: string, refreshToken: string) => {
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
          },
          onDisconnect,
        });
        log('[UserAgent] ✅ _connect function completed');
      } else {
        throw new Error("Connect function not provided");
      }
      isConnected = true;
      log('[UserAgent] ✅ Connection completed successfully');
    } catch (error) {
      logError("[UserAgent] ❌ Error during connection:", error);
      isConnecting = false;
      throw error;
    } finally {
      isConnecting = false;
    }
  };

  const openModal = async () => {
    log('[UserAgent] openModal() called');
    
    try {
      if (QRCodeString === null) {
        logError("[UserAgent] ❌ QRCodeString is null, cannot open modal");
        return;
      }
      
      log('[UserAgent] QRCodeString available:', QRCodeString);
      
      if (qrCodeGenerator === null) {
        log('[UserAgent] QR code generator not initialized, loading...');
        qrCodeGenerator = await getQrCodeGenerator();
        if (!qrCodeGenerator) {
          logError("[UserAgent] ❌ Failed to load QR code generator");
          return;
        }
        log('[UserAgent] ✅ QR code generator loaded');
      }

      const onReady = (qrCodeGenerator: QRCodeConstructor) => {
        return () => {
          log('[UserAgent] onReady callback executing...');
          
          try {
            if (sessionId) {
              log('[UserAgent] Storing session ID:', sessionId);
              storage.setItem("hc:sessionId", sessionId);
            }
            
            log('[UserAgent] Clearing old credentials from storage');
            storage.removeItem("hc:address");
            storage.removeItem("hc:accessToken");
            storage.removeItem("hc:refreshToken");
            storage.removeItem("hc:signature");
            storage.removeItem("hc:clubId");
            storage.removeItem("hc:clubName");
            const qrCodeDiv = document.getElementById("hash-connect-qrcode");
            if (!qrCodeDiv) {
              logError("[UserAgent] ❌ QR code div not found in DOM");
              return;
            }
            
            log('[UserAgent] ✅ QR code div found');
            
            if (!QRCodeString) {
              logError("[UserAgent] ❌ QRCodeString is null");
              return;
            }
            
            log('[UserAgent] Generating QR code with:', { 
              text: QRCodeString, 
              width: 128, 
              height: 128 
            });
            
            new qrCodeGenerator(qrCodeDiv, {
              text: QRCodeString,
              width: 128,
              height: 128,
              colorDark: "#000000",
              colorLight: "#ffffff",
              correctLevel: qrCodeGenerator.CorrectLevel.H,
            });
            
            log('[UserAgent] ✅ QR code generated successfully');
          } catch (error) {
            logError("[UserAgent] ❌ Error rendering QR code:", error);
          }
        };
      };

      log('[UserAgent] Checking if _openModal function is provided...');
      if (_openModal) {
        log('[UserAgent] ✅ _openModal function found, calling it...');
        _openModal(onReady(qrCodeGenerator), onDisconnect);
        log('[UserAgent] ✅ _openModal function completed');
      } else {
        throw new Error("OpenModal function not provided");
      }
    } catch (error) {
      logError("[UserAgent] ❌ Error opening modal:", error);
    }
  };

  // CHECK IF ANY DATA IN LOCAL STORAGE
  // Auto-connect will be deferred until after page load for better reliability
  const initializeStoredSession = () => {
    try {
      const storedSessionId = storage.getItem("hc:sessionId");
      const storedAddress = storage.getItem("hc:address");
      const storedAccessToken = storage.getItem("hc:accessToken");
      
      // Check if we should auto-connect
      const hasSession = !!storedSessionId;
      const hasCredentials = !!(storedAddress && storedAccessToken);
      
      if (hasSession || hasCredentials) {
        if (hasSession) {
          log("[HashConnect] Found stored session, preparing to auto-connect...");
          sessionId = storedSessionId;
          QRCodeString = `hc:${sessionId}`;
          SessionChannelName = `private-hc-${sessionId}`;
        } else if (hasCredentials) {
          log("[HashConnect] Found stored credentials without session, will create new session and auto-reconnect...");
          // Session will be created in connect() function
        }
        
        // Defer connection until page is fully loaded
        const attemptAutoConnect = () => {
          if (hasCredentials) {
            log("[HashConnect] Attempting auto-connect with stored credentials...");
          } else {
            log("[HashConnect] Attempting auto-connect with stored session...");
          }
          
          connect().catch(error => {
            logError("[HashConnect] ❌ Auto-connect failed:", error);
            log("[HashConnect] Cleaning up failed session...");
            
            // Clean up the failed session so manual connect can work
            isConnecting = false;
            isConnected = false;
            
            log("[HashConnect] You can now manually reconnect");
          });
        };

        // Wait for page to be fully loaded
        if (document.readyState === 'complete') {
          // Page already loaded, connect with small delay to ensure everything is ready
          setTimeout(attemptAutoConnect, 100);
        } else {
          // Wait for page load
          window.addEventListener('load', () => {
            setTimeout(attemptAutoConnect, 100);
          });
        }
      } else {
        log("[HashConnect] No stored session or credentials found, manual connection required");
      }
    } catch (error) {
      logError("[HashConnect] Error checking for stored session:", error);
    }
  };

  // Initialize stored session check
  initializeStoredSession();

  return Object.freeze({
    isReady: () => {
      return isConnected;
    },

    getToken: async () => {
      try {
        log("[getToken] Token request initiated");
        
        if (!isConnected) {
          logWarn("[getToken] ⚠️ Not connected - cannot get token");
          return null;
        }

        if (!profile.accessToken) {
          logWarn("[getToken] ⚠️ No access token available in profile");
          log("[getToken] 💡 User may need to authenticate");
          return null;
        }

        log("[getToken] ✅ Connected with access token");
        log("[getToken] Checking if token is expired...");
        
        const expired = isExpired(profile.accessToken);
        
        if (!expired) {
          log("[getToken] ✅ Token is still valid, returning current token");
          // Reset failure count on successful token use
          tokenRefreshFailureCount = 0;
          return profile.accessToken;
        }
        
        // Check if a refresh is already in progress (race condition prevention)
        if (tokenRefreshInProgress) {
          log("[getToken] 🔒 Token refresh already in progress, waiting for it to complete...");
          const result = await tokenRefreshInProgress;
          log("[getToken] ✅ Waited for concurrent refresh, returning result");
          return result;
        }
        
        log("[getToken] ⚠️ Token is expired, attempting refresh...");
        log(`[getToken] Current failure count: ${tokenRefreshFailureCount}/${MAX_TOKEN_REFRESH_FAILURES}`);
        
        if (tokenRefreshFailureCount >= MAX_TOKEN_REFRESH_FAILURES) {
          logError(`[getToken] ❌ Max consecutive refresh failures reached (${MAX_TOKEN_REFRESH_FAILURES})`);
          logError("[getToken] 🚫 Disconnecting user - requires re-authentication");
          onDisconnect();
          return null;
        }
        
        // Create a promise for this refresh operation (acts as mutex)
        tokenRefreshInProgress = (async () => {
          try {
            log("[getToken] 📡 Calling getNewTokens()...");
            const { accessToken, refreshToken } = await getNewTokens();
            
            log("[getToken] ✅ New tokens received successfully!");
            log("[getToken] Updating storage and profile...");
            
            storage.setItem("hc:accessToken", accessToken);
            storage.setItem("hc:refreshToken", refreshToken);
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
            
            // Reset failure count on successful refresh
            tokenRefreshFailureCount = 0;
            log("[getToken] ✅ Token refresh complete, failure count reset");
            
            return accessToken;
          } catch (error) {
            // Increment failure count
            tokenRefreshFailureCount++;
            
            const err = error instanceof Error ? error : new Error(String(error));
            logError(`[getToken] ❌ Token refresh failed (attempt ${tokenRefreshFailureCount}/${MAX_TOKEN_REFRESH_FAILURES}):`, {
              error: err.message,
              failureCount: tokenRefreshFailureCount
            });
            
            // Check if this is an UNRECOVERABLE error (401, 403, missing credentials, invalid response)
            // Use regex to match exact status codes (not 4010, 4013, etc.)
            const isUnrecoverable = 
              err.message.includes("No address") || 
              err.message.includes("No refresh token") ||
              /status: 401(?:\D|$)/.test(err.message) ||
              /status: 403(?:\D|$)/.test(err.message) ||
              err.message.includes("missing tokens");
            
            if (isUnrecoverable) {
              logError("[getToken] 🚫 UNRECOVERABLE ERROR detected");
              logError("[getToken] 💡 User credentials are invalid or missing");
              logError("[getToken] 🚪 Disconnecting user - re-authentication required");
              onDisconnect();
              return null;
            }
            
            // For transient errors, check if we've hit max failures
            if (tokenRefreshFailureCount >= MAX_TOKEN_REFRESH_FAILURES) {
              logError(`[getToken] 🚫 Max consecutive failures reached after transient errors`);
              logError("[getToken] 💡 This may indicate persistent network issues or server problems");
              logError("[getToken] 🚪 Disconnecting user - please try reconnecting");
              onDisconnect();
              return null;
            }
            
            // For transient errors below threshold, return null but stay connected
            logWarn(`[getToken] ⚠️ Transient error - staying connected`);
            logWarn(`[getToken] 💡 Will retry on next getToken() call (${MAX_TOKEN_REFRESH_FAILURES - tokenRefreshFailureCount} attempts remaining)`);
            logWarn(`[getToken] 💡 Application may need to handle null token gracefully or retry`);
            
            return null;
          } finally {
            // Clear the mutex once the refresh completes (success or failure)
            tokenRefreshInProgress = null;
            log("[getToken] 🔓 Token refresh mutex released");
          }
        })();
        
        // Wait for and return the result of the refresh operation
        return await tokenRefreshInProgress;
      } catch (error) {
        logError("[getToken] ❌ Unexpected error in getToken:", error);
        return null;
      }
    },
    
    getUser: () => {
      if (!isConnected) {
        logWarn("Not connected");
        return;
      }

      const user: {
        address: string | null;
      } = {
        address: profile.address,
      };
      return user;
    },

    getClubName: () => {
      try {
        const clubName = storage.getItem("hc:clubName");
        if (!clubName) {
          logWarn("No club name available");
          return null;
        }
        return clubName;
      } catch (error) {
        logError("Error getting club name:", error);
        return null;
      }
    },
    
    getClubId: () => {
      try {
        const clubId = storage.getItem("hc:clubId");
        if (!clubId) {
          logWarn("No club ID available");
          return null;
        }
        return clubId;
      } catch (error) {
        logError("Error getting club ID:", error);
        return null;
      }
    },
    
    connect,
  });
};

export default makeUserAgent;
