import { useEffect } from 'react';
import { SilentSmsVerificationResult } from '../types.js';
import { filterSensitiveSmsLocally } from '../utils/smsPrivacyFilter.js';
import { verifySmsSilently } from '../utils/androidBridge.js';
import { AddTransactionInput } from './useTransactions.js';
import { useToast } from './useToast.js';

export function useSmsVerification(
  handleAddTransaction: (data: AddTransactionInput) => void
) {
  const { showToast } = useToast();

  // SILENT BACKGROUND SMS PROCESSING ENGINE
  // Whenever an SMS arrives from Canara Bank, HDFC, SBI, ICICI, Paytm, or GPay:
  // 1. Locally evaluates SMS against the on-device Sensitive SMS/OTP Pre-Filter.
  //    If OTP / sensitive code: Discarded immediately ON-DEVICE with ZERO network calls.
  // 2. Only valid non-sensitive bank payment alerts are passed to Gemini AI engine.
  // - If is_payment: true -> Silently update local database & counters on Page 1 (Monthly Spend & Spent Today)
  // - If is_payment: false -> Silently discard
  const handleSilentSmsVerification = async (
    smsText: string,
    sender: string = 'CANBNK'
  ): Promise<SilentSmsVerificationResult> => {
    try {
      // ON-DEVICE PRIVACY PRE-FILTER: Zero network transmission for OTPs/passwords/PINs
      const localFiltered = filterSensitiveSmsLocally(smsText);
      if (localFiltered) {
        return localFiltered;
      }

      const result = await verifySmsSilently(smsText, sender);

      if (result && result.is_payment && result.amount && result.amount > 0) {
        // Silently update local database and update counters on Page 1 (Monthly Spend & Spent Today)
        handleAddTransaction({
          amount: result.amount,
          type: result.type || 'DEBIT',
          merchant: result.merchant || 'Bank Transaction',
          category: result.category || 'Other',
          bankName: result.bankName || sender,
          isVerified: true,
          source: 'sms_auto',
          accountLast4: result.accountLast4,
          upiRef: result.upiRef,
          rawSms: smsText,
        });
      }

      return result;
    } catch (err: unknown) {
      console.error('Silent SMS verification failed:', err);
      showToast('Silent SMS verification check failed. Check network connection.', 'error');
      throw err;
    }
  };

  // Register Native Android SMS Bridge listener
  useEffect(() => {
    window.onNativeSmsReceived = (event) => {
      if (event && event.message) {
        handleSilentSmsVerification(event.message, event.sender).catch((e) => {
          console.warn('Native SMS processing error:', e);
        });
      }
    };

    return () => {
      delete window.onNativeSmsReceived;
    };
  }, [handleAddTransaction]);

  return {
    handleSilentSmsVerification,
  };
}

