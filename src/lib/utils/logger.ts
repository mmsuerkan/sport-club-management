/**
 * Production-safe logging utility
 * Debug logs only show in development mode
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDevelopment = process.env.NODE_ENV === 'development';

class Logger {
  private prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix ? `[${prefix}] ` : '';
  }

  debug(message: string, ...args: any[]) {
    if (isDevelopment) {
      console.log(`${this.prefix}🔍 ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (isDevelopment) {
      console.log(`${this.prefix}ℹ️ ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    console.warn(`${this.prefix}⚠️ ${message}`, ...args);
  }

  error(message: string, ...args: any[]) {
    console.error(`${this.prefix}❌ ${message}`, ...args);
  }

  success(message: string, ...args: any[]) {
    if (isDevelopment) {
      console.log(`${this.prefix}✅ ${message}`, ...args);
    }
  }
}

// Pre-configured loggers for different modules
export const authLogger = new Logger('AUTH');
export const dashboardLogger = new Logger('DASHBOARD');
export const apiLogger = new Logger('API');
export const firestoreLogger = new Logger('FIRESTORE');

// Generic logger
export const logger = new Logger();

export default Logger;