/**
 * Shared constants for Nestflo Market Intelligence frontend.
 * Single source of truth — imported by all forms and modals.
 */

export const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
  'live.com', 'icloud.com', 'me.com', 'protonmail.com',
  'aol.com', 'mail.com', 'gmx.com', 'ymail.com',
]);

export function isBusinessEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return !!domain && !FREE_EMAIL_DOMAINS.has(domain);
}
