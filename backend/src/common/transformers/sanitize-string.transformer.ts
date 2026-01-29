import { Transform } from 'class-transformer';

/**
 * Sanitizes string inputs by:
 * - Trimming whitespace
 * - Removing control characters
 * - Removing obvious script injection vectors
 *
 * Runs during transformation phase (before validation).
 */
export function SanitizeString() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    let sanitized = value;

    // Trim leading/trailing whitespace
    sanitized = sanitized.trim();

    // Remove ASCII control characters (0–31 and 127)
    sanitized = sanitized.replace(/[\u0000-\u001F\u007F]/g, '');

    // Remove obvious script tags (case-insensitive)
    sanitized = sanitized.replace(/<\s*\/?\s*script[^>]*>/gi, '');

    // Collapse multiple spaces into one
    sanitized = sanitized.replace(/\s{2,}/g, ' ');

    return sanitized;
  });
}
