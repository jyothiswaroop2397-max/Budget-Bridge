import { SilentSmsVerificationResult } from '../types.js';
import { filterSensitiveSmsLocally } from './smsPrivacyFilter.js';

declare global {
  interface Window {
    AndroidSmsBridge?: {
      isAndroidNative: () => boolean;
      isSmsPermissionGranted: () => boolean;
      requestSmsPermission: () => void;
      getDeviceInfo: () => string;
      triggerSimulatedSms: (sender: string, message: string) => void;
    };
    onNativeSmsReceived?: (event: { sender: string; message: string; timestamp: number }) => void;
  }
}

/**
 * Check if the application is running inside native Android WebView container
 */
export function isAndroidNativeApp(): boolean {
  try {
    return typeof window !== 'undefined' && Boolean(window.AndroidSmsBridge?.isAndroidNative?.());
  } catch {
    return false;
  }
}

/**
 * Check if Android SMS permissions (RECEIVE_SMS & READ_SMS) are granted
 */
export function checkSmsPermissions(): boolean {
  if (typeof window === 'undefined') return false;

  if (window.AndroidSmsBridge && typeof window.AndroidSmsBridge.isSmsPermissionGranted === 'function') {
    try {
      return window.AndroidSmsBridge.isSmsPermissionGranted();
    } catch {
      return false;
    }
  }

  // Check stored setting in web environment (defaults to granted)
  const stored = localStorage.getItem('moneytrace_sms_permission');
  return stored !== 'denied';
}

/**
 * Toggle or request SMS permission
 */
export function setSmsPermission(granted: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('moneytrace_sms_permission', granted ? 'granted' : 'denied');
  if (window.AndroidSmsBridge?.requestSmsPermission && granted) {
    window.AndroidSmsBridge.requestSmsPermission();
  }
}

/**
 * Pass incoming SMS silently to the Gemini AI processing engine.
 *
 * CRITICAL PRIVACY GUARANTEE:
 * Incoming SMS is first evaluated locally via `filterSensitiveSmsLocally`.
 * If sensitive (OTP, verification codes, login tokens, CVV, PIN, password),
 * it is discarded ON-DEVICE immediately and NO network call or API request is made.
 */
export async function verifySmsSilently(
  smsText: string,
  sender: string = 'CANBNK'
): Promise<SilentSmsVerificationResult> {
  // ── 1. ON-DEVICE LOCAL PRIVACY PRE-FILTER (ZERO NETWORK TRANSMISSION) ───────
  // Inspects message synchronously on-device. If OTP/password/PIN is detected,
  // it is discarded immediately and NEVER transmitted to any server or AI model.
  const localPrivacyFilterResult = filterSensitiveSmsLocally(smsText);
  if (localPrivacyFilterResult) {
    return localPrivacyFilterResult;
  }
  // ────────────────────────────────────────────────────────────────────────────

  const response = await fetch('/api/parse-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ smsText, sender }),
  });

  if (!response.ok) {
    throw new Error(`SMS verification API returned status ${response.status}`);
  }

  const result = await response.json();
  return result as SilentSmsVerificationResult;
}
