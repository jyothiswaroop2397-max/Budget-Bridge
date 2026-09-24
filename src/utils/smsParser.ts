import { Category, SilentSmsVerificationResult, TransactionType } from '../types.js';
import { classifyCategory } from './parser.js';

/**
 * Heuristic Bank SMS Verification Engine
 * Simulates and backs up the Gemini AI model for Indian banks (Canara Bank, SBI, HDFC, ICICI, etc.)
 */
export function parseBankSmsSilent(smsText: string, sender: string = ''): SilentSmsVerificationResult {
  const text = (smsText || '').trim();
  const cleanSender = (sender || '').toUpperCase();

  // 1. Detect non-payments: OTP, Login codes, Promotional, Marketing, spam
  const isOtp = /\b(?:otp|one time password|verification code|secret code|login with|security code)\b/i.test(text);
  const isSpamOrPromo = /\b(?:pre-approved|apply now|congratulations|reward points|limited period offer|loan offer|win|cash prize)\b/i.test(text);
  const hasDebitCredit = /\b(?:debited|credited|debit|credit|spent|paid|withdrawn|transferred|reversal|refund)\b/i.test(text);

  if (isOtp || (isSpamOrPromo && !hasDebitCredit) || !hasDebitCredit) {
    // If NOT a bank payment -> return { is_payment: false }
    return {
      is_payment: false,
      engine: 'heuristic',
      rawText: text,
    };
  }

  // 2. Identify Direction: DEBIT or CREDIT
  const isCredit = /\b(?:credited|credit|received|deposited|refund|reversal|cr\.?)\b/i.test(text);
  const type: TransactionType = isCredit ? 'CREDIT' : 'DEBIT';

  // 3. Extract Amount
  let amount = 0;
  const specificAmountMatch = text.match(
    /(?:debited\s+(?:by|with)?|credited\s+(?:by|with)?|rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i
  );
  if (specificAmountMatch && specificAmountMatch[1]) {
    amount = parseFloat(specificAmountMatch[1].replace(/,/g, ''));
  } else {
    const generalMatch = text.match(/(?:rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i);
    if (generalMatch && generalMatch[1]) {
      amount = parseFloat(generalMatch[1].replace(/,/g, ''));
    }
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return {
      is_payment: false,
      engine: 'heuristic',
      rawText: text,
    };
  }

  // 4. Detect Bank Name
  const bankName = detectBankName(text, cleanSender);

  // 5. Extract Account Last 4
  let accountLast4: string | null = null;
  const acctMatch = text.match(/(?:a\/c|acct|account|card)\s*(?:no\.?)?\s*[*xX]*([0-9]{3,4})/i);
  if (acctMatch) {
    accountLast4 = acctMatch[1];
  }

  // 6. Extract UPI Reference
  let upiRef: string | null = null;
  const refMatch = text.match(/(?:ref|rrn|upi\s*ref|txn|reference)(?:\s*no\.?)?[\s:]*([0-9A-Za-z]+)/i);
  if (refMatch) {
    upiRef = refMatch[1];
  }

  // 7. Extract Merchant
  let merchant = detectMerchant(text, bankName);
  const category: Category = classifyCategory(`${text} ${merchant}`);

  return {
    is_payment: true,
    amount: Math.round(amount * 100) / 100,
    type,
    merchant,
    category,
    bankName,
    accountLast4,
    upiRef,
    engine: 'heuristic',
    rawText: text,
  };
}

function detectBankName(text: string, sender: string): string {
  const combined = (text + ' ' + sender).toUpperCase();
  if (combined.includes('CANBNK') || combined.includes('CNRBNK') || combined.includes('CANARA')) {
    return 'Canara Bank';
  }
  if (combined.includes('HDFC') || combined.includes('HDFCBK')) {
    return 'HDFC Bank';
  }
  if (combined.includes('SBI') || combined.includes('SBINB') || combined.includes('STATE BANK')) {
    return 'State Bank of India';
  }
  if (combined.includes('ICICI')) {
    return 'ICICI Bank';
  }
  if (combined.includes('AXIS')) {
    return 'Axis Bank';
  }
  if (combined.includes('PAYTM') || combined.includes('PYTM')) {
    return 'Paytm Bank';
  }
  if (combined.includes('KOTAK')) {
    return 'Kotak Bank';
  }
  if (combined.includes('GPAY') || combined.includes('GOOGLEPAY')) {
    return 'Google Pay';
  }
  return 'Bank Account';
}

function detectMerchant(text: string, bankName: string): string {
  const lower = text.toLowerCase();

  // Known vendors
  if (lower.includes('swiggy')) return 'Swiggy';
  if (lower.includes('zomato')) return 'Zomato';
  if (lower.includes('uber')) return 'Uber';
  if (lower.includes('ola')) return 'Ola Cabs';
  if (lower.includes('amazon')) return 'Amazon';
  if (lower.includes('flipkart')) return 'Flipkart';
  if (lower.includes('blinkit')) return 'Blinkit';
  if (lower.includes('zepto')) return 'Zepto';
  if (lower.includes('instamart')) return 'Instamart';
  if (lower.includes('netflix')) return 'Netflix';
  if (lower.includes('spotify')) return 'Spotify';
  if (lower.includes('airtel')) return 'Airtel';
  if (lower.includes('jio')) return 'Jio';
  if (lower.includes('starbucks')) return 'Starbucks';
  if (lower.includes('metro')) return 'Metro Transit';

  // VPA patterns: "to vpa xyz@okhdfcbank"
  const vpaMatch = text.match(/(?:to|from|vpa|via)\s+(?:vpa\s+)?([A-Za-z0-9._-]+@[A-Za-z0-9]+)/i);
  if (vpaMatch && vpaMatch[1]) {
    const handle = vpaMatch[1].split('@')[0].replace(/[0-9._-]/g, '');
    if (handle.length >= 3) {
      return capitalize(handle);
    }
  }

  // "transfer to XYZ" or "paid to XYZ"
  const paidToMatch = text.match(/(?:paid to|transfer to|sent to|at)\s+([A-Za-z0-9\s]{3,25})(?:\s+(?:on|ref|via|val|\.|$))/i);
  if (paidToMatch && paidToMatch[1] && !/account|a\/c|card|bank|vpa/i.test(paidToMatch[1])) {
    return paidToMatch[1].trim();
  }

  return `${bankName} Payment`;
}

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
