import { Logger } from './logger';

/**
 * Standardized error handling utility
 */
export class ErrorHandler {
  /**
   * Extract error message from various error types
   */
  static getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object') {
      // Handle error objects with message property
      const errorObj = error as Record<string, unknown>;
      if (typeof errorObj.message === 'string') {
        return errorObj.message;
      }

      // Try to stringify the error object
      try {
        return JSON.stringify(error);
      } catch {
        return fallback;
      }
    }

    return fallback;
  }

  /**
   * Log and return error message
   */
  static logAndGetMessage(
    error: unknown,
    context: string,
    fallback = 'Unknown error'
  ): string {
    const message = this.getErrorMessage(error, fallback);
    Logger.error(`${context}:`, error);
    return message;
  }

  /**
   * Handle async operation with error logging
   */
  static async handleAsync<T>(
    operation: () => Promise<T>,
    context: string,
    fallback?: T
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      Logger.error(`${context}:`, error);
      return fallback;
    }
  }

  /**
   * Handle sync operation with error logging
   */
  static handleSync<T>(
    operation: () => T,
    context: string,
    fallback?: T
  ): T | undefined {
    try {
      return operation();
    } catch (error) {
      Logger.error(`${context}:`, error);
      return fallback;
    }
  }

  /**
   * Create a standardized error response
   */
  static createErrorResponse<T extends Record<string, unknown>>(
    error: unknown,
    context: string,
    additionalData?: Partial<T>
  ): T & { success: false; error: string } {
    const message = this.logAndGetMessage(error, context);
    return {
      success: false,
      error: message,
      ...additionalData,
    } as T & { success: false; error: string };
  }
}
