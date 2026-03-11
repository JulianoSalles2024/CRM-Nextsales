const isDev = import.meta.env.DEV;

export const safeLog = (...args: unknown[]): void => {
  if (isDev) console.log(...args);
};

export const safeWarn = (...args: unknown[]): void => {
  if (isDev) console.warn(...args);
};

export const safeError = (...args: unknown[]): void => {
  if (isDev) console.error(...args);
};
