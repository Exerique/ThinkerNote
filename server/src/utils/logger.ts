import { promises as fs } from 'fs';
import path from 'path';

class Logger {
  private logDir: string;
  private errorLogFile: string;

  constructor(logDir: string = './logs') {
    this.logDir = logDir;
    this.errorLogFile = path.join(logDir, 'errors.log');
  }

  /**
   * Initialize log directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  /**
   * Log an error with timestamp
   */
  async logError(error: Error | string, context?: string): Promise<void> {
    try {
      await this.initialize();

      const timestamp = new Date().toISOString();
      const errorMessage = error instanceof Error ? error.message : error;
      const errorStack = error instanceof Error ? error.stack : '';
      
      const logEntry = [
        `[${timestamp}]`,
        context ? `[${context}]` : '',
        errorMessage,
        errorStack ? `\nStack: ${errorStack}` : '',
        '\n---\n',
      ].filter(Boolean).join(' ');

      await fs.appendFile(this.errorLogFile, logEntry, 'utf-8');
    } catch (logError) {
      // If logging fails, just log to console
      console.error('Failed to write to error log:', logError);
    }
  }

  /**
   * Log info message to console with timestamp
   */
  info(message: string, context?: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}]${context ? ` [${context}]` : ''} ${message}`);
  }

  /**
   * Log warning message to console with timestamp
   */
  warn(message: string, context?: string): void {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}]${context ? ` [${context}]` : ''} ${message}`);
  }

  /**
   * Log error message to console and file with timestamp
   */
  error(error: Error | string, context?: string): void {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : error;
    console.error(`[${timestamp}]${context ? ` [${context}]` : ''} ${errorMessage}`);
    
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }

    // Async log to file (don't await)
    this.logError(error, context).catch(err => {
      console.error('Failed to log error to file:', err);
    });
  }
}

// Export singleton instance
export const logger = new Logger();
