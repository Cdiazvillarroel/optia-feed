// lib/disposable-emails.ts

/**
 * Known disposable/temporary email domains.
 * Block these to prevent free trial abuse.
 *
 * Sources:
 * - https://github.com/disposable-email-domains/disposable-email-domains
 * - https://github.com/wesbos/burner-email-providers
 *
 * Last updated: April 2026. Review and expand periodically.
 */
const DISPOSABLE_DOMAINS = new Set([
  // Most common
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  '10minutemail.com',
  '10minutemail.net',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la',

  // Yopmail and variants
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',

  // Throwaway
  'throwawaymail.com',
  'throwaway.email',
  'trashmail.com',
  'trashmail.net',
  'trash-mail.com',
  'trashmail.de',
  'fakeinbox.com',
  'fakemail.net',
  'fakemailgenerator.com',

  // Disposable
  'dispostable.com',
  'discard.email',
  'discardmail.com',
  'spamgourmet.com',
  'maildrop.cc',
  'mailnesia.com',
  'mailcatch.com',
  'mohmal.com',

  // Others
  'getnada.com',
  'getairmail.com',
  'tempail.com',
  'mytemp.email',
  'emailondeck.com',
  'tempinbox.com',
  'inboxkitten.com',
  'emailfake.com',
  'tempmailaddress.com',
  'mintemail.com',
  'moakt.com',
  'tmail.ws',
  'tmpmail.org',
  'tmpmail.net',
  'anonaddy.me',
  'burnermail.io',
  '33mail.com',
  'mail-temp.com',
  'tempr.email',
  'spam4.me',
  'mvrht.net',
  'spambox.us',
  'mail7.io',
  'mailpoof.com',
  'mail-temporaire.fr',
  'temporary-email.net',
  'deadaddress.com',
  'chacuo.net',
  'linshiyouxiang.net',
  'safetymail.info',
  'smashmail.de',
  'spamdecoy.net',
  'superrito.com',
  'tagyourself.com',

  // Recent disposable services
  'edny.net',
  'rcpt.at',
  'emlhub.com',
  'emlpro.com',
  'emltmp.com',
  'inboxalias.com',
  'boximail.com',
])

/**
 * Returns true if the email domain is in the disposable blocklist.
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1]?.trim()
  if (!domain) return false
  return DISPOSABLE_DOMAINS.has(domain)
}
