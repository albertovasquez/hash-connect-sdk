import { CONFIG, log, logError, logWarn } from "../config";
import { storage } from "./storage";

// Error classification for better handling
export enum TokenErrorType {
    UNRECOVERABLE = "UNRECOVERABLE", // Requires disconnect and re-authentication
    TRANSIENT = "TRANSIENT",         // Network/temporary issues, can retry
    UNKNOWN = "UNKNOWN"              // Unknown errors, log extensively
}

export interface TokenError {
    type: TokenErrorType;
    message: string;
    originalError: Error;
    shouldDisconnect: boolean;
    canRetry: boolean;
}

/**
 * Classify token refresh errors to determine appropriate handling
 */
function classifyTokenError(error: Error): TokenError {
    const errorMessage = error.message.toLowerCase();
    
    // UNRECOVERABLE errors - require disconnect and re-authentication
    if (errorMessage.includes("no address") || errorMessage.includes("no refresh token")) {
        return {
            type: TokenErrorType.UNRECOVERABLE,
            message: "Missing credentials in storage",
            originalError: error,
            shouldDisconnect: true,
            canRetry: false
        };
    }
    
    // Match exact status codes (not 4010, 4013, etc.)
    if (/status: 401(?:\D|$)/.test(errorMessage) || /status: 403(?:\D|$)/.test(errorMessage)) {
        return {
            type: TokenErrorType.UNRECOVERABLE,
            message: "Invalid or expired refresh token",
            originalError: error,
            shouldDisconnect: true,
            canRetry: false
        };
    }
    
    if (errorMessage.includes("missing tokens")) {
        return {
            type: TokenErrorType.UNRECOVERABLE,
            message: "Server returned invalid response structure",
            originalError: error,
            shouldDisconnect: true,
            canRetry: false
        };
    }
    
    // TRANSIENT errors - network issues, can retry
    if (errorMessage.includes("aborted") || 
        errorMessage.includes("timeout") || 
        errorMessage.includes("network") ||
        errorMessage.includes("fetch")) {
        return {
            type: TokenErrorType.TRANSIENT,
            message: "Network or timeout error",
            originalError: error,
            shouldDisconnect: false,
            canRetry: true
        };
    }
    
    if (errorMessage.includes("status: 500") || 
        errorMessage.includes("status: 502") || 
        errorMessage.includes("status: 503") ||
        errorMessage.includes("status: 504")) {
        return {
            type: TokenErrorType.TRANSIENT,
            message: "Server error",
            originalError: error,
            shouldDisconnect: false,
            canRetry: true
        };
    }
    
    // UNKNOWN errors - log extensively
    return {
        type: TokenErrorType.UNKNOWN,
        message: "Unknown error during token refresh",
        originalError: error,
        shouldDisconnect: false,
        canRetry: true
    };
}

export default async function getNewTokens(retries: number = 3): Promise<{ accessToken: string; refreshToken: string }> {
    log(`[Token] Starting token refresh (max ${retries} attempts)...`);
    
    const attemptRefresh = async (attemptsLeft: number): Promise<{ accessToken: string; refreshToken: string }> => {
        const attemptNumber = retries - attemptsLeft;
        log(`[Token] 🔄 Refresh attempt ${attemptNumber}/${retries}`);
        
        try {
            const apiURL = `${CONFIG.AUTH_ENDPOINT}/auth/refresh`;
            const refreshToken = storage.getItem("hc:refreshToken");
            const address = storage.getItem("hc:address");
            
            log(`[Token] Checking credentials...`);
            log(`[Token]   - API URL: ${apiURL}`);
            log(`[Token]   - Has address: ${!!address}`);
            log(`[Token]   - Has refresh token: ${!!refreshToken}`);
            log(`[Token]   - Device: ${window.location.hostname}`);
            
            if (!address) {
                logError("[Token] ❌ UNRECOVERABLE: No address found in storage");
                throw new Error("No address found in storage");
            }

            if (!refreshToken) {
                logError("[Token] ❌ UNRECOVERABLE: No refresh token found in storage");
                throw new Error("No refresh token found in storage");
            }

            log(`[Token] ✅ Credentials validated`);
            log(`[Token] 📡 Making refresh request to: ${apiURL}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                logWarn(`[Token] ⚠️ Request timeout after 10 seconds`);
                controller.abort();
            }, 10000); // 10 second timeout

            const startTime = Date.now();
            
            const refreshResponse = await fetch(apiURL, {
                method: "POST",
                headers: {
                    authorization: `Bearer ${refreshToken}`,
                    "x-hp-hash": address,
                    "x-hp-device": window.location.hostname,
                },
                signal: controller.signal,
            });

            const requestDuration = Date.now() - startTime;
            clearTimeout(timeoutId);
            
            log(`[Token] 📥 Response received in ${requestDuration}ms`);
            log(`[Token]   - Status: ${refreshResponse.status} ${refreshResponse.statusText}`);

            if (!refreshResponse.ok) {
                // Try to get error details from response
                let errorDetails = "";
                try {
                    const errorBody = await refreshResponse.json();
                    errorDetails = JSON.stringify(errorBody);
                    log(`[Token]   - Error body: ${errorDetails}`);
                } catch (e) {
                    log(`[Token]   - Could not parse error body`);
                }
                
                if (refreshResponse.status === 401) {
                    logError(`[Token] ❌ UNRECOVERABLE: 401 Unauthorized - refresh token is invalid or expired`);
                } else if (refreshResponse.status === 403) {
                    logError(`[Token] ❌ UNRECOVERABLE: 403 Forbidden - access denied`);
                } else if (refreshResponse.status >= 500) {
                    logWarn(`[Token] ⚠️ TRANSIENT: ${refreshResponse.status} Server Error - can retry`);
                } else {
                    logError(`[Token] ❌ Token refresh failed with status: ${refreshResponse.status}`);
                }
                
                throw new Error(`Token refresh failed with status: ${refreshResponse.status}`);
            }

            log(`[Token] ✅ Success response, parsing JSON...`);
            const responseData = await refreshResponse.json();

            if (!responseData.accessToken || !responseData.refreshToken) {
                logError(`[Token] ❌ Invalid response structure:`, {
                    hasAccessToken: !!responseData.accessToken,
                    hasRefreshToken: !!responseData.refreshToken,
                    keys: Object.keys(responseData)
                });
                throw new Error("Invalid response: missing tokens");
            }

            log(`[Token] ✅ Tokens received successfully`);
            log(`[Token]   - Access token length: ${responseData.accessToken.length}`);
            log(`[Token]   - Refresh token length: ${responseData.refreshToken.length}`);
            
            return responseData;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            const classified = classifyTokenError(err);
            
            logError(`[Token] ❌ Refresh attempt ${attemptNumber} failed:`, {
                errorType: classified.type,
                message: classified.message,
                shouldDisconnect: classified.shouldDisconnect,
                canRetry: classified.canRetry,
                attemptsLeft,
                originalError: err.message
            });
            
            // Don't retry on UNRECOVERABLE errors
            if (classified.type === TokenErrorType.UNRECOVERABLE) {
                logError(`[Token] 🚫 UNRECOVERABLE error - stopping all retries`);
                logError(`[Token] 💡 Action required: User must reconnect and re-authenticate`);
                throw err;
            }
            
            if (attemptsLeft > 0) {
                // Wait before retrying (exponential backoff: 1s, 2s, 4s...)
                const delay = Math.pow(2, attemptNumber - 1) * 1000;
                logWarn(`[Token] ⏳ Waiting ${delay}ms before retry (${attemptsLeft} attempts remaining)...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return attemptRefresh(attemptsLeft - 1);
            }
            
            logError(`[Token] ❌ All retry attempts exhausted`);
            logError(`[Token] 💡 Final error classification: ${classified.type}`);
            
            throw err;
        }
    };

    return attemptRefresh(retries - 1);
}
