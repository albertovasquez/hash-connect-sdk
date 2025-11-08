export const parseJwt = (token: string): { exp: number; [key: string]: any } | null => {
    try {
        if (!token || typeof token !== 'string') {
            console.error('Invalid token provided to parseJwt');
            return null;
        }

        const parts = token.split(".");
        if (parts.length !== 3) {
            console.error('Invalid JWT format: expected 3 parts');
            return null;
        }

        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        
        const jsonPayload = decodeURIComponent(
            window
                .atob(base64)
                .split("")
                .map(function (c) {
                    return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join("")
        );

        const parsed = JSON.parse(jsonPayload);
        
        if (!parsed.exp || typeof parsed.exp !== 'number') {
            console.error('JWT missing or invalid exp claim');
            return null;
        }

        return parsed;
    } catch (error) {
        console.error('Error parsing JWT:', error);
        return null;
    }
};

export const isExpired = (token: string): boolean => {
    try {
        if (!token) {
            console.warn('No token provided to isExpired');
            return true;
        }

        const parsed = parseJwt(token);
        if (!parsed || !parsed.exp) {
            console.warn('Unable to parse token or missing expiration');
            return true;
        }

        const expiresInMinutes = (parsed.exp * 1000 - Date.now()) / 1000 / 60;
        
        // console when expires
        // print in minutes when expires from now
        console.debug(
            "Token expires in",
            expiresInMinutes.toFixed(2),
            "minutes"
        );

        return Date.now() >= parsed.exp * 1000;
    } catch (error) {
        console.error('Error checking token expiration:', error);
        return true; // Treat as expired if we can't verify
    }
};
