/**
 * Simple logging utility for development and debugging
 */
export class Logger {
  private static isDevelopment = process.env.NODE_ENV === 'development';

  static error(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.error(`[PrintPulse] ${message}`, ...args);
    }
    // In production, you could send to a logging service
  }

  static warn(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.warn(`[PrintPulse] ${message}`, ...args);
    }
  }

  static info(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.info(`[PrintPulse] ${message}`, ...args);
    }
  }

  static debug(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.debug(`[PrintPulse] ${message}`, ...args);
    }
  }
}
