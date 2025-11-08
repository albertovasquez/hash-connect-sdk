import { storage } from "../../utils/storage";
import { PusherClient } from "../../types/pusher";
import { QRCodeConstructor } from "../../types/qrcode";
import { UserProfile, UserTokens } from "../../types/user";

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
  let profile: UserProfile = {
    address: null,
    signature: null,
    accessToken: null,
    refreshToken: null,
  };

  // Load existing profile from storage
  try {
    const storedAccessToken = storage.getItem("hc:accessToken");
    if (storedAccessToken) {
      profile.accessToken = storedAccessToken;
      profile.refreshToken = storage.getItem("hc:refreshToken");
      profile.signature = storage.getItem("hc:signature");
      profile.address = storage.getItem("hc:address");
    }
  } catch (error) {
    console.error("Error loading profile from storage:", error);
  }

  const onDisconnect = () => {
    try {
      console.log("[Pusher] Disconnecting and cleaning up...");
      storage.removeItem("hc:sessionId");
      
      if (pusherClient) {
        if (SessionChannelName) {
          try {
            console.log(`[Pusher] Unsubscribing from session channel: ${SessionChannelName}`);
            pusherClient.unsubscribe(SessionChannelName);
          } catch (error) {
            console.warn("[Pusher] Error unsubscribing from session channel:", error);
          }
        }
        
        if (profile.address) {
          const userChannelName = `private-${profile.address}`;
          try {
            console.log(`[Pusher] Unsubscribing from user channel: ${userChannelName}`);
            pusherClient.unsubscribe(userChannelName);
          } catch (error) {
            console.warn("[Pusher] Error unsubscribing from user channel:", error);
          }
        }
      }
      
      // Reset session state to allow fresh connection
      sessionId = null;
      QRCodeString = null;
      SessionChannelName = null;
      
      isConnected = false;
      isConnecting = false;
      profile = {
        address: null,
        signature: null,
        accessToken: null,
        refreshToken: null,
      };
    } catch (error) {
      console.error("Error during disconnect:", error);
    }
  };

  const connect = async () => {
    // Guard against multiple simultaneous connection attempts
    if (isConnected || isConnecting) {
      console.warn("Already connected or connecting");
      return;
    }

    isConnecting = true;

    try {
      // Initialize pusher client if needed
      if (pusherClient === null) {
        pusherClient = await getPusherClient();
      }
      
      // Always generate a new session ID if one doesn't exist (e.g., after disconnect)
      if (!sessionId) {
        sessionId = Math.random().toString(36).slice(2);
        QRCodeString = `hc:${sessionId}`;
        SessionChannelName = `private-hc-${sessionId}`;
      }

      if (_connect) {
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
      } else {
        throw new Error("Connect function not provided");
      }
      isConnected = true;
    } catch (error) {
      console.error("Error during connection:", error);
      isConnecting = false;
      throw error;
    } finally {
      isConnecting = false;
    }
  };

  const openModal = async () => {
    try {
      if (QRCodeString === null) {
        console.error("QRCodeString is null, cannot open modal");
        return;
      }
      
      if (qrCodeGenerator === null) {
        qrCodeGenerator = await getQrCodeGenerator();
        if (!qrCodeGenerator) {
          console.error("Failed to load QR code generator");
          return;
        }
      }

      const onReady = (qrCodeGenerator: QRCodeConstructor) => {
        return () => {
          try {
            if (sessionId) {
              storage.setItem("hc:sessionId", sessionId);
            }
            storage.removeItem("hc:address");
            storage.removeItem("hc:accessToken");
            storage.removeItem("hc:refreshToken");
            storage.removeItem("hc:signature");
            
            const qrCodeDiv = document.getElementById("hash-connect-qrcode");
            if (!qrCodeDiv) {
              console.error("QR code div not found");
              return;
            }
            
            if (!QRCodeString) {
              console.error("QRCodeString is null");
              return;
            }
            
            new qrCodeGenerator(qrCodeDiv, {
              text: QRCodeString,
              width: 128,
              height: 128,
              colorDark: "#000000",
              colorLight: "#ffffff",
              correctLevel: qrCodeGenerator.CorrectLevel.H,
            });
          } catch (error) {
            console.error("Error rendering QR code:", error);
          }
        };
      };

      if (_openModal) {
        _openModal(onReady(qrCodeGenerator), onDisconnect);
      } else {
        throw new Error("OpenModal function not provided");
      }
    } catch (error) {
      console.error("Error opening modal:", error);
    }
  };

  // CHECK IF ANY DATA IN LOCAL STORAGE
  // Auto-connect will be deferred until after page load for better reliability
  const initializeStoredSession = () => {
    try {
      const storedSessionId = storage.getItem("hc:sessionId");
      if (storedSessionId) {
        console.log("[HashConnect] Found stored session, preparing to auto-connect...");
        sessionId = storedSessionId;
        QRCodeString = `hc:${sessionId}`;
        SessionChannelName = `private-hc-${sessionId}`;
        
        // Defer connection until page is fully loaded
        const attemptAutoConnect = () => {
          console.log("[HashConnect] Attempting auto-connect...");
          connect().catch(error => {
            console.error("[HashConnect] Error auto-connecting:", error);
            console.log("[HashConnect] You may need to manually reconnect");
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
      }
    } catch (error) {
      console.error("[HashConnect] Error checking for stored session:", error);
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
        if (!isConnected) {
          console.warn("Not connected");
          return null;
        }

        if (!profile.accessToken) {
          console.warn("No access token available");
          return null;
        }

        const expired = isExpired(profile.accessToken);
        if (expired) {
          try {
            const { accessToken, refreshToken } = await getNewTokens();
            storage.setItem("hc:accessToken", accessToken);
            storage.setItem("hc:refreshToken", refreshToken);
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
          } catch (error) {
            console.error("Failed to refresh token:", error);
            // Token refresh failed, user needs to reconnect
            onDisconnect();
            return null;
          }
        }

        return profile.accessToken;
      } catch (error) {
        console.error("Error getting token:", error);
        return null;
      }
    },
    getUser: () => {
      if (!isConnected) {
        console.warn("Not connected");
        return;
      }

      const user: {
        address: string | null;
      } = {
        address: profile.address,
      };
      return user;
    },
    connect,
  });
};

export default makeUserAgent;
