const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (context, message, ...args) => {
    if (isDev) {
      console.log(`[DEBUG] [${context}] ${message}`, ...args);
    }
  },
  info: (context, message, ...args) => {
    if (isDev) {
      console.info(`%c[INFO] [${context}] ${message}`, 'color: #3b82f6; font-weight: bold;', ...args);
    }
  },
  warn: (context, message, ...args) => {
    console.warn(`[WARN] [${context}] ${message}`, ...args);
  },
  error: (context, message, error) => {
    const errorStr = String(error?.message || error || '');
    if (errorStr.includes('Failed to fetch') || errorStr.includes('fetch') || errorStr.includes('network') || errorStr.includes('Failed fetching')) {
      console.warn(`%c[OFFLINE-WARN] [${context}] ${message} (Expected when Supabase Docker is not running)`, 'color: #f59e0b; font-weight: bold;', error);
      return;
    }
    console.error(`%c[ERROR] [${context}] ${message}`, 'color: #ef4444; font-weight: bold;', error);
  }
};
