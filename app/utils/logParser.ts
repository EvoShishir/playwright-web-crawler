/**
 * Parse log message and split it into parts (text and URLs)
 * Returns an array of strings that can be processed by components
 */
export function parseLogMessage(log: string): string[] {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  return log.split(urlPattern);
}

/**
 * Extract URL from crawling log message
 */
export function extractCrawlingUrl(log: string): string | null {
  const match = log.match(/🔍 Crawling \(\d+\): (https?:\/\/[^\s]+)/);
  return match ? match[1] : null;
}

/**
 * Check if log matches crawling pattern
 */
export function isCrawlingLog(log: string): boolean {
  return /🔍 Crawling \(\d+\):/.test(log);
}
