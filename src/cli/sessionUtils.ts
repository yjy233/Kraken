/**
 * Generate a random session ID
 * Format: session-YYYYMMDD-HHMMSS-RANDOM
 * Example: session-20260215-143022-a7f3d2
 */
export function generateSessionId(): string {
  const now = new Date();

  // Format date as YYYYMMDD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;

  // Format time as HHMMSS
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timePart = `${hours}${minutes}${seconds}`;

  // Generate random 6-character suffix
  const randomPart = Math.random().toString(36).substring(2, 8);

  return `session-${datePart}-${timePart}-${randomPart}`;
}
