export const logger = {
  info: (...args: unknown[]) => console.log('ℹ️', ...args),
  warn: (...args: unknown[]) => console.warn('⚠️', ...args),
  error: (...args: unknown[]) => console.error('❌', ...args),
};
