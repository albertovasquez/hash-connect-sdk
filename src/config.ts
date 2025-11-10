export const CONFIG = {
  PUSHER_KEY: "18b9dd3c4dd15293792e",
  PUSHER_CLUSTER: "sa1",
  AUTH_ENDPOINT: "https://test-api.hashpass.net",
  QR_CODE_SCRIPT:
    "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
  PUSHER_SCRIPT: "https://js.pusher.com/8.0.1/pusher.min.js",
  DOMAIN: "localhost",
  APP_NAME: "Hash Pass Admin Panel",
  CUSTOM_DISCLAIMER: null as string | null, // Custom disclaimer text
  DEBUG: false, // Debug mode flag
};

// Logging utilities that respect DEBUG flag
export const log = (...args: any[]) => {
  if (CONFIG.DEBUG) {
    console.log(...args);
  }
};

export const logError = (...args: any[]) => {
  if (CONFIG.DEBUG) {
    console.error(...args);
  }
};

export const logWarn = (...args: any[]) => {
  if (CONFIG.DEBUG) {
    console.warn(...args);
  }
};
