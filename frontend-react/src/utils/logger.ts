/**
 * Simple logging utility for development and debugging
 */
export class Logger {
  private static isDevelopment = process.env.NODE_ENV === 'development';

  static error(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.error(`[PulsePrint] ${message}`, ...args);
    }
    // In production, you could send to a logging service
  }

  static warn(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.warn(`[PulsePrint] ${message}`, ...args);
    }
  }

  static info(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.info(`[PulsePrint] ${message}`, ...args);
    }
  }

  static debug(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.debug(`[PulsePrint] ${message}`, ...args);
    }
  }
}
