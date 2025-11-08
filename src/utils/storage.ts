/**
 * Safe localStorage wrapper that handles errors gracefully
 * Useful for private browsing mode and other scenarios where localStorage might fail
 */

class SafeStorage {
    private fallbackStorage: Map<string, string> = new Map();
    private isLocalStorageAvailable: boolean = true;

    constructor() {
        this.checkAvailability();
    }

    private checkAvailability(): void {
        try {
            const testKey = '__hc_storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            this.isLocalStorageAvailable = true;
        } catch (e) {
            console.warn('localStorage is not available, using fallback storage', e);
            this.isLocalStorageAvailable = false;
        }
    }

    setItem(key: string, value: string): boolean {
        try {
            if (this.isLocalStorageAvailable) {
                localStorage.setItem(key, value);
                return true;
            } else {
                this.fallbackStorage.set(key, value);
                return true;
            }
        } catch (error) {
            console.error(`Failed to set item in storage: ${key}`, error);
            // Fallback to in-memory storage
            this.fallbackStorage.set(key, value);
            this.isLocalStorageAvailable = false;
            return false;
        }
    }

    getItem(key: string): string | null {
        try {
            if (this.isLocalStorageAvailable) {
                return localStorage.getItem(key);
            } else {
                return this.fallbackStorage.get(key) || null;
            }
        } catch (error) {
            console.error(`Failed to get item from storage: ${key}`, error);
            return this.fallbackStorage.get(key) || null;
        }
    }

    removeItem(key: string): boolean {
        try {
            if (this.isLocalStorageAvailable) {
                localStorage.removeItem(key);
            }
            this.fallbackStorage.delete(key);
            return true;
        } catch (error) {
            console.error(`Failed to remove item from storage: ${key}`, error);
            this.fallbackStorage.delete(key);
            return false;
        }
    }

    clear(): boolean {
        try {
            if (this.isLocalStorageAvailable) {
                // Only clear our own keys to avoid affecting other apps
                const keys = Object.keys(localStorage);
                keys.filter(key => key.startsWith('hc:')).forEach(key => {
                    localStorage.removeItem(key);
                });
            }
            this.fallbackStorage.clear();
            return true;
        } catch (error) {
            console.error('Failed to clear storage', error);
            this.fallbackStorage.clear();
            return false;
        }
    }
}

// Export a singleton instance
export const storage = new SafeStorage();

