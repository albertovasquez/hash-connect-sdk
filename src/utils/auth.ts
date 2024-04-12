import { CONFIG } from "../config";

export default async function getNewTokens() {
    try {
        const apiURL = `${CONFIG.AUTH_ENDPOINT}/auth/refresh`;
        const refreshToken = localStorage.getItem("hc:refreshToken");
        const address = localStorage.getItem("hc:address");
        if (!address) {
            throw new Error("No Address");
        }

        const refreshResponse = await fetch(apiURL, {
            method: "POST",
            headers: {
                authorization: `Bearer ${refreshToken}`,
                "x-hp-hash": address,
                "x-hp-device": window.location.hostname,
            },
        });

        const responseData = await refreshResponse.json();

        return responseData;
    } catch (error) {
        throw error;
    }
}
