import { CONFIG, logError } from "../config";
import { storage } from "./storage";

export default async function getNewTokens(retries: number = 3): Promise<{ accessToken: string; refreshToken: string }> {
    const attemptRefresh = async (attemptsLeft: number): Promise<{ accessToken: string; refreshToken: string }> => {
        try {
            const apiURL = `${CONFIG.AUTH_ENDPOINT}/auth/refresh`;
            const refreshToken = storage.getItem("hc:refreshToken");
            const address = storage.getItem("hc:address");
            
            if (!address) {
                throw new Error("No address found in storage");
            }

            if (!refreshToken) {
                throw new Error("No refresh token found in storage");
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const refreshResponse = await fetch(apiURL, {
                method: "POST",
                headers: {
                    authorization: `Bearer ${refreshToken}`,
                    "x-hp-hash": address,
                    "x-hp-device": window.location.hostname,
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!refreshResponse.ok) {
                throw new Error(`Token refresh failed with status: ${refreshResponse.status}`);
            }

            const responseData = await refreshResponse.json();

            if (!responseData.accessToken || !responseData.refreshToken) {
                throw new Error("Invalid response: missing tokens");
            }

            return responseData;
        } catch (error) {
            logError(`Token refresh attempt failed (${attemptsLeft} retries left):`, error);
            
            // Don't retry on auth errors
            if (error instanceof Error) {
                if (error.message.includes("No address") || 
                    error.message.includes("No refresh token") ||
                    error.message.includes("status: 401") ||
                    error.message.includes("status: 403")) {
                    throw error;
                }
            }
            
            if (attemptsLeft > 0) {
                // Wait before retrying (exponential backoff)
                const delay = (retries - attemptsLeft) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                return attemptRefresh(attemptsLeft - 1);
            }
            
            throw error;
        }
    };

    return attemptRefresh(retries - 1);
}
