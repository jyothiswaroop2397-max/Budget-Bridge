import { SilentSmsVerificationResult } from '../types.js';

/**
 * ==============================================================================
 * PRIVACY & SECURITY ARCHITECTURE NOTE:
 * LOCAL ON-DEVICE SENSITIVE SMS / OTP PRE-FILTER
 * ==============================================================================
 *
 * Incoming SMS notifications are strictly evaluated ON-DEVICE using this zero-network
 * pre-filter BEFORE any HTTP request, external API, or cloud Gemini AI parser is called.
 *
 * Security Guarantee:
 * - Sensitive codes (OTPs, login authentication codes, CVVs, ATM/UPI PINs, passwords,
 *   verification tokens, security warnings like "do not share" / "valid for") NEVER
 *   leave the user's device.
 * - If any sensitive pattern is detected, execution terminates immediately on-device.
 * - Under NO code path is a matching sensitive SMS forwarded to a remote endpoint.
 *
 * Reference: Section 4 - Local SMS/OTP Pre-Filter Specification.
 * ==============================================================================
 */

// Regex patterns strictly matching sensitive OTPs, login verification codes, and security secrets
export const SENSITIVE_SMS_PATTERNS: RegExp[] = [
  /\bOTP\b/i,
  /\bone[\s-_]*time[\s-_]*password\b/i,
  /\bverification[\s-_]*code\b/i,
  /\bdo[\s-_]*not[\s-_]*share\b/i,
  /\bnever[\s-_]*share\b/i,
  /\bvalid[\s-_]*for\b/i,
  /\blogin[\s-_]*code\b/i,
  /\bCVV\b/i,
  /\bPIN\b/i,
  /\bpassword\b/i,
  /\bsecret[\s-_]*code\b/i,
  /\bauth[\s-_]*code\b/i,
  /\bpasscode\b/i,
];

/**
 * Determines whether an SMS text contains sensitive personal authentication data.
 * Executes synchronously on-device with zero network latency or transmission.
 */
export function isSensitiveSms(smsText: string): boolean {
  if (!smsText || typeof smsText !== 'string') return false;

  const normalized = smsText.trim();
  if (!normalized) return false;

  for (const pattern of SENSITIVE_SMS_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  return false;
}

/**
 * Local on-device pre-filter interceptor.
 * Returns a discarded non-payment result if sensitive, or null if safe to proceed.
 */
export function filterSensitiveSmsLocally(
  smsText: string
): SilentSmsVerificationResult | null {
  if (isSensitiveSms(smsText)) {
    return {
      is_payment: false,
      engine: 'local_privacy_filter',
      rawText: undefined, // Zero transmission / stripped
    };
  }
  return null;
}
