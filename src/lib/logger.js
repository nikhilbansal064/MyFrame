const isDev = process.env.NODE_ENV === 'development';

const isNetworkError = (err) => {
  const msg = String(err?.message || err || '');
  return msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNREFUSED');
};

export const logger = {
  debug: (ctx, msg, ...args) => isDev && console.log(`[${ctx}] ${msg}`, ...args),
  info:  (ctx, msg, ...args) => isDev && console.info(`[${ctx}] ${msg}`, ...args),
  warn:  (ctx, msg, ...args) => console.warn(`[${ctx}] ${msg}`, ...args),
  error: (ctx, msg, err) => {
    if (isNetworkError(err)) {
      console.warn(`[OFFLINE-WARN] [${ctx}] ${msg}`, err);
    } else {
      console.error(`[${ctx}] ${msg}`, err);
    }
  }
};
