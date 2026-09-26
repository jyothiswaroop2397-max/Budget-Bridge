import { Category, MessageIntentCategory, TransactionType } from '../types.js';

export type UserIntent = 'TRANSACTION' | 'GREETING' | 'APP_INFO' | 'OUT_OF_SCOPE';

export interface ParsedLocalTransaction {
  amount: number;
  type: TransactionType;
  merchant: string;
  category: Category;
  engine?: 'gemini' | 'heuristic';
  confidence?: 'high' | 'medium' | 'low';
}

/**
 * Keyword lists for Intent Classification
 */
export const GREETING_KEYWORDS: string[] = [
  'hi',
  'hello',
  'hey',
  'good morning',
  'good evening',
  'good afternoon',
  'good day',
  'good',
  'yo',
  'sup',
  'howdy',
  'hola',
  'namaste',
  'greetings',
  'hiya',
  'whatsup',
  "what's up",
  'thanks',
  'thank you',
  'ok',
  'okay',
  'cool',
  'great',
  'awesome',
  'bye',
];

export const APP_INFO_KEYWORDS: string[] = [
  'what can you do',
  'what is this app',
  'what is this',
  'what are you',
  'help',
  'how does this work',
  'how do i use this',
  'what do you do',
  'who are you',
  'what is budget bridge',
  'what is moneytrace',
  'features',
  'how to use',
  'guide',
  'commands',
  'what are you used for',
  'what is budget bridge ledger',
  'how to track',
];

export const SPENDING_LENDING_KEYWORDS: string[] = [
  'spent',
  'spend',
  'paid',
  'pay',
  'bought',
  'buy',
  'ordered',
  'order',
  'purchase',
  'bill',
  'expense',
  'cost',
  'fee',
  'debited',
  'credited',
  'received',
  'salary',
  'cashback',
  'refund',
  'owes me',
  'owe me',
  'i owe',
  'owe',
  'owed',
  'lent',
  'borrowed',
  'gave',
  'given',
  'split',
  'transfer',
  'recharge',
];

/**
 * Fixed reply banks with 2-3 randomized variations per conversational intent
 */
export const INTENT_REPLY_BANKS: Record<Exclude<UserIntent, 'TRANSACTION'>, string[]> = {
  GREETING: [
    'Hi! I am your Budget Bridge Copilot 👋 Try typing an expense like "Spent 200 on lunch" or ask "What is my total monthly expenditure?"',
    'Hello! I am your Budget Bridge Copilot 💳 You can log expenses like "Paid 450 for groceries", track debts like "Rahul owes me 500", or check your daily limit.',
    'Hi there! I am here to help you log expenses and manage your budget. Try typing "Spent 150 on coffee" or "Am I over budget today?"',
  ],
  APP_INFO: [
    "I'm your AI expense tracker — tell me things like 'Spent 200 on lunch' or 'Rahul owes me 500' and I'll summarize it for confirmation before logging.",
    "I help you track daily expenses, categorize spending, and manage peer balances (who owes you vs. who you owe). Try 'Spent 450 on groceries' or 'Rahul owes me 500'!",
    'You can quick-add expenses, split bills, and check monthly budgets. Just type what you spent or who owes you in natural language!',
  ],
  OUT_OF_SCOPE: [
    "I'm designed to help you track expenses, debts, and your budget. Try typing something like 'Spent 300 on groceries' or 'Rahul owes me 500'.",
    "I am your personal budget copilot 💰 Tell me an expense (e.g. 'Spent 150 on coffee') or ask a budget question like 'What is my total spend?'.",
    "I can only assist with personal finances, expenses, and peer balances. Try typing an expense like 'Spent 250 on lunch'!",
  ],
};

/**
 * Extracts a strictly positive numeric amount from text.
 * Handles ₹, $, €, £, rs., inr, commas, and decimals.
 * Returns null if no valid positive number is found.
 */
export function extractNumericAmount(text: string): number | null {
  if (!text) return null;
  const match = text.match(/(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i);
  if (!match) return null;
  const cleanStr = match[1].replace(/,/g, '');
  const amt = parseFloat(cleanStr);
  if (isNaN(amt) || amt <= 0) return null;
  return amt;
}

/**
 * LAYER 1 INTENT CLASSIFICATION:
 * Classifies an incoming message strictly into one of 4 mutually exclusive categories:
 *  (a) SPEND_TRANSACTION: Must contain BOTH numeric amount > 0 AND spend/income verb or merchant pattern.
 *  (b) DEBT_STATEMENT: Must contain BOTH numeric amount > 0 AND debt pattern ("X owes me Y" / "I owe X Y").
 *  (c) BUDGET_QUERY: Questions asking about spending data, limits, categories, or balances.
 *  (d) GENERAL_CHAT: Greetings, small talk, casual messages, unclear input, messages without numbers.
 */
export function classifyMessageIntent(input: string): {
  category: MessageIntentCategory;
  amount: number | null;
  rawText: string;
} {
  const rawText = (input || '').trim();
  const text = rawText.toLowerCase();

  if (!text) {
    return { category: 'GENERAL_CHAT', amount: null, rawText };
  }

  // 1. Check for Category (c): BUDGET_QUERY / FINANCIAL_HEALTH_QUERY
  const normalizedForIntent = text
    .replace(/\bexpediture\b/g, 'expenditure')
    .replace(/\baverge\b/g, 'average')
    .replace(/\bwhats\b/g, 'what is')
    .replace(/\bwhat's\b/g, 'what is');

  const isFinancialHealthQuery =
    FINANCIAL_HEALTH_KEYWORDS.some((kw) => normalizedForIntent.includes(kw)) ||
    ((normalizedForIntent.includes('score') || normalizedForIntent.includes('health') || normalizedForIntent.includes('rating')) &&
      (normalizedForIntent.includes('why') ||
        normalizedForIntent.includes('how') ||
        normalizedForIntent.includes('improve') ||
        normalizedForIntent.includes('what') ||
        normalizedForIntent.includes('low') ||
        normalizedForIntent.includes('affect') ||
        normalizedForIntent.includes('hurt') ||
        normalizedForIntent.includes('boost') ||
        normalizedForIntent.includes('breakdown')));

  if (isFinancialHealthQuery) {
    return { category: 'FINANCIAL_HEALTH_QUERY', amount: null, rawText };
  }

  const hasQuestionWord =
    normalizedForIntent.includes('?') ||
    normalizedForIntent.startsWith('what') ||
    normalizedForIntent.startsWith('how') ||
    normalizedForIntent.startsWith('who') ||
    normalizedForIntent.startsWith('am i') ||
    normalizedForIntent.startsWith('is my') ||
    normalizedForIntent.startsWith('show') ||
    normalizedForIntent.startsWith('tell') ||
    normalizedForIntent.startsWith('give me') ||
    normalizedForIntent.startsWith('calculate');

  const hasFinancialTopic =
    normalizedForIntent.includes('expenditure') ||
    normalizedForIntent.includes('weekly') ||
    normalizedForIntent.includes('daily') ||
    normalizedForIntent.includes('monthly') ||
    normalizedForIntent.includes('avg') ||
    normalizedForIntent.includes('average') ||
    normalizedForIntent.includes('spend') ||
    normalizedForIntent.includes('spent') ||
    normalizedForIntent.includes('budget') ||
    normalizedForIntent.includes('balance') ||
    normalizedForIntent.includes('limit') ||
    normalizedForIntent.includes('cap') ||
    normalizedForIntent.includes('owes') ||
    normalizedForIntent.includes('owe') ||
    normalizedForIntent.includes('history') ||
    normalizedForIntent.includes('recent') ||
    normalizedForIntent.includes('breakdown') ||
    normalizedForIntent.includes('health') ||
    normalizedForIntent.includes('score');

  const isBudgetQuestion = hasQuestionWord && hasFinancialTopic;

  // If clearly a budget question, do not treat as transaction
  if (isBudgetQuestion && !normalizedForIntent.startsWith('spent ') && !normalizedForIntent.startsWith('paid ') && !normalizedForIntent.startsWith('bought ')) {
    return { category: 'BUDGET_QUERY', amount: null, rawText };
  }

  // 2. Check for numeric amount > 0 (Mandatory for Categories a and b)
  const amount = extractNumericAmount(text);

  // If there is NO number (e.g. "hi", "good", "hello", "thanks"), it NEVER qualifies as a transaction or debt
  if (!amount || amount <= 0) {
    // Check if it's a budget question or query without an explicit question mark
    if (hasFinancialTopic) {
      return { category: 'BUDGET_QUERY', amount: null, rawText };
    }
    return { category: 'GENERAL_CHAT', amount: null, rawText };
  }

  // 3. Check for Category (b): DEBT_STATEMENT ("X owes me Y" / "I owe X Y" / "Lent X Y")
  const isPeerPattern =
    /([a-zA-Z]+)\s+owes\s+me\s+(?:[₹$€£]|rs\.?|inr)?\s*\d+/i.test(text) ||
    /i\s+owe\s+([a-zA-Z]+)\s+(?:[₹$€£]|rs\.?|inr)?\s*\d+/i.test(text) ||
    /(?:lent|gave|paid\s+for)\s+([a-zA-Z]+)\s+(?:[₹$€£]|rs\.?|inr)?\s*\d+/i.test(text) ||
    /borrowed\s+(?:[₹$€£]|rs\.?|inr)?\s*\d+\s+from\s+([a-zA-Z]+)/i.test(text);

  if (isPeerPattern) {
    return { category: 'DEBT_STATEMENT', amount, rawText };
  }

  // 4. Check for Category (a): SPEND_TRANSACTION
  // Must have spending/income keywords OR merchant/category nouns paired with the amount
  const hasSpendVerb = SPENDING_LENDING_KEYWORDS.some((kw) => text.includes(kw));
  const allCategoryKws = Object.values(CATEGORY_KEYWORDS).flat();
  const hasCategoryNoun = allCategoryKws.some((kw) => text.includes(kw.toLowerCase()));
  const hasCurrencySymbol = /(?:[₹$€£]|rs\.?|inr)/i.test(text);

  if (hasSpendVerb || hasCategoryNoun || hasCurrencySymbol) {
    return { category: 'SPEND_TRANSACTION', amount, rawText };
  }

  // If text is simply a number and unknown word (e.g. "lunch 200"), treat as spend
  if (text.split(/\s+/).length <= 4) {
    return { category: 'SPEND_TRANSACTION', amount, rawText };
  }

  return { category: 'GENERAL_CHAT', amount: null, rawText };
}

/**
 * Returns a randomized response from the corresponding intent reply bank.
 */
export function getRandomIntentReply(intent: Exclude<UserIntent, 'TRANSACTION'>): string {
  const replies = INTENT_REPLY_BANKS[intent];
  if (!replies || replies.length === 0) {
    return "I'm here to help track your expenses and balances!";
  }
  const randomIndex = Math.floor(Math.random() * replies.length);
  return replies[randomIndex];
}

/**
 * Top-level Intent Classifier (Backward compatible wrapper using Layer 1 logic).
 */
export function classifyIntent(input: string): UserIntent {
  const raw = input || '';
  const text = raw.trim().toLowerCase();
  if (!text) return 'OUT_OF_SCOPE';

  const classification = classifyMessageIntent(raw);

  if (classification.category === 'SPEND_TRANSACTION' || classification.category === 'DEBT_STATEMENT') {
    return 'TRANSACTION';
  }

  const isGreeting = GREETING_KEYWORDS.some((g) => {
    const cleanG = g.toLowerCase();
    return (
      text === cleanG ||
      text.startsWith(cleanG + ' ') ||
      text.startsWith(cleanG + ',') ||
      text.startsWith(cleanG + '!') ||
      text.startsWith(cleanG + '.')
    );
  });
  if (isGreeting) {
    return 'GREETING';
  }

  const isAppInfo = APP_INFO_KEYWORDS.some((info) => {
    const cleanInfo = info.toLowerCase();
    return text === cleanInfo || text.includes(cleanInfo);
  });
  if (isAppInfo) {
    return 'APP_INFO';
  }

  return 'OUT_OF_SCOPE';
}

/**
 * Single exported, easily extensible dictionary of trigger words per category.
 * Add new keywords to any array without modifying core parsing logic.
 */
export const CATEGORY_KEYWORDS: Record<Exclude<Category, 'Other'>, string[]> = {
  Food: [
    'food',
    'lunch',
    'dinner',
    'breakfast',
    'restaurant',
    'groceries',
    'grocery',
    'snack',
    'coffee',
    'cafe',
    'tea',
    'meal',
    'swiggy',
    'zomato',
    'burger',
    'pizza',
    'sushi',
    'dessert',
    'bakery',
    'supermarket',
    'blinkit',
    'zepto',
    'instamart',
    'kfc',
    'mcdonalds',
    'dominos',
    'starbucks',
    'subway',
    'biryani',
    'chai',
    'dining',
    'foodcourt',
    'eats',
    'sweets',
  ],
  Travel: [
    'uber',
    'cab',
    'taxi',
    'flight',
    'train',
    'fuel',
    'petrol',
    'bus',
    'diesel',
    'gas',
    'toll',
    'parking',
    'commute',
    'ride',
    'rapido',
    'metro',
    'auto',
    'air',
    'ticket',
    'ola',
    'railway',
    'irctc',
    'indigo',
    'fare',
  ],
  Bills: [
    'rent',
    'electricity',
    'wifi',
    'recharge',
    'bill',
    'subscription',
    'power',
    'internet',
    'broadband',
    'mobile',
    'utility',
    'water',
    'maintenance',
    'dth',
    'gas bill',
    'cylinder',
    'piped gas',
    'postpaid',
    'prepaid',
  ],
  Shopping: [
    'clothes',
    'shopping',
    'amazon',
    'mall',
    'flipkart',
    'myntra',
    'zara',
    'store',
    'buy',
    'purchase',
    'gadget',
    'electronics',
    'retail',
    'shoes',
    'dress',
    'hm',
    'uniqlo',
    'meesho',
    'ajio',
    'nykaa',
    'market',
  ],
  Health: [
    'medicine',
    'doctor',
    'pharmacy',
    'hospital',
    'clinic',
    'dental',
    'fitness',
    'gym',
    'health',
    'apollo',
    '1mg',
    'meds',
    'pharma',
    'dentist',
    'treatment',
    'lab test',
    'diagnostics',
  ],
  Entertainment: [
    'movie',
    'cinema',
    'film',
    'netflix',
    'prime',
    'spotify',
    'show',
    'game',
    'gaming',
    'steam',
    'arcade',
    'bowling',
    'theatre',
    'concert',
    'youtube',
    'hotstar',
    'disney',
    'playstation',
    'xbox',
    'pvr',
    'inox',
  ],
  Social: [
    'lent',
    'borrowed',
    'owed',
    'owe',
    'split',
    'friend',
    'party',
    'drinks',
    'beer',
    'hangout',
    'trip',
    'outing',
    'treat',
    'gift',
    'gathering',
    'birthday',
    'celebration',
    'pub',
    'club',
    'bar',
  ],
};

/**
 * Robust category classification matching function.
 * Lowercases input, trims whitespace, and checks keyword presence with substring includes.
 * Prioritizes specific categories before social or fallback to 'Other'.
 */
export function classifyCategory(text: string, isPeerOrSocial: boolean = false): Category {
  const normalized = (text || '').toLowerCase().trim();
  if (!normalized) return isPeerOrSocial ? 'Social' : 'Other';

  const categoryPriorityOrder: Array<Exclude<Category, 'Other'>> = [
    'Food',
    'Travel',
    'Bills',
    'Shopping',
    'Health',
    'Entertainment',
    'Social',
  ];

  for (const category of categoryPriorityOrder) {
    const keywords = CATEGORY_KEYWORDS[category] || [];
    for (const kw of keywords) {
      const cleanKw = kw.toLowerCase().trim();
      if (cleanKw && normalized.includes(cleanKw)) {
        return category;
      }
    }
  }

  // Social is default for LENT/BORROWED entries tied to a person, unless another category's keywords match first
  if (isPeerOrSocial) {
    return 'Social';
  }

  return 'Other';
}

export const FINANCIAL_HEALTH_KEYWORDS: string[] = [
  'financial health',
  'financial score',
  'health score',
  'financial rating',
  'financial vitals',
  'financial condition',
  'health breakdown',
  'score breakdown',
  'why is my financial health',
  'why is my score',
  'why is my financial score',
  'what is hurting my financial',
  "what's hurting my financial",
  'what is hurting my score',
  "what's hurting my score",
  'what is affecting my financial',
  "what's affecting my financial",
  'what is affecting my score',
  "what's affecting my score",
  'how do i improve my score',
  'how to improve my score',
  'how do i improve my financial',
  'how to improve my financial',
  'how can i improve my score',
  'how can i improve my financial',
  'how is my financial health',
  "how's my financial health",
  'how is my financial score',
  "how's my financial score",
  'how is my score',
  "how's my score",
  'what is my financial health',
  "what's my financial health",
  'what is my financial score',
  "what's my financial score",
  'what is my score',
  "what's my score",
  'boost my score',
  'increase my score',
  'raise my score',
  'emergency buffer',
];

/**
 * Natural language transaction parser with full extraction pipeline and console step logging.
 */
export function parseTransactionHeuristic(input: string): ParsedLocalTransaction {
  const rawInput = input || '';
  const text = rawInput.trim();

  // (a) Extract amount (handles ₹, $, €, £, rs, inr, commas and decimals)
  const amountMatch = text.match(/(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:[.,]\d{1,2})?)/i);
  let amount = 0;
  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }

  // (b) Determine transaction type: DEBIT (expense) vs CREDIT (income/refund)
  const isCredit = /\b(?:credited|credit|received|refund|cashback|deposited|salary|bonus|cr\.?)\b/i.test(text);
  const type: TransactionType = isCredit ? 'CREDIT' : 'DEBIT';

  // Extract merchant / vendor
  let merchant = '';
  const onForMatch = text.match(/(?:spent|paid|bought|ordered|purchase)\s+(?:(?:[₹$€£]|rs\.?)?\s*\d+\s+)?(?:on|for|at|to)?\s*(.+)/i);
  const atMatch = text.match(/(?:at|to)\s+([A-Za-z0-9\s]+?)(?:\s+(?:for|on|rs|inr|\d)|$)/i);

  if (onForMatch && onForMatch[1]) {
    merchant = cleanMerchant(onForMatch[1]);
  } else if (atMatch && atMatch[1]) {
    merchant = cleanMerchant(atMatch[1]);
  } else {
    // Clean out numbers and currency symbols
    const words = text
      .replace(/(?:[₹$€£]|rs\.?|inr)\s*\d+(?:[.,]\d{1,2})?/gi, '')
      .replace(/\b\d+(?:[.,]\d{1,2})?\b/g, '')
      .replace(/\b(?:spent|paid|bought|purchase|ordered)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    merchant = cleanMerchant(words);
  }

  if (!merchant || merchant.length < 2) {
    merchant = isCredit ? 'Income / Refund' : 'Expense';
  }

  // (c) Determine category using both full raw text and extracted merchant
  const category = classifyCategory(`${text} ${merchant}`);

  const finalEntry: ParsedLocalTransaction = {
    amount: Math.round(amount * 100) / 100,
    type,
    merchant,
    category,
    engine: 'heuristic',
  };

  // Step-by-step console logging for pipeline verification
  console.log('--- [Budget Bridge Natural Language Parser Pipeline] ---');
  console.log('1. Raw Input:', rawInput);
  console.log('2. Detected Amount:', finalEntry.amount);
  console.log('3. Detected Type:', finalEntry.type);
  console.log('4. Detected Category:', finalEntry.category, `(from merchant: "${merchant}")`);
  console.log('5. Final Entry Object:', finalEntry);

  return finalEntry;
}

export interface ParsedLocalPeerBalance {
  name: string;
  type: 'OWED_TO_YOU' | 'I_OWE';
  amount: number;
  note?: string;
  category: Category;
}

export function parsePeerBalanceHeuristic(input: string): ParsedLocalPeerBalance | null {
  const rawInput = input || '';
  const text = rawInput.trim();

  // 1. "<Name> owes me <amount> [for <note>]"
  const owesMeMatch = text.match(/([a-zA-Z]+)\s+owes\s+me\s+(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:[.,]\d{1,2})?)(?:\s+(?:for|on)\s+(.+))?/i);
  if (owesMeMatch) {
    const note = owesMeMatch[3]?.trim() || 'Pending IOU';
    const cat = classifyCategory(`${text} ${note}`, true);
    const result: ParsedLocalPeerBalance = {
      name: owesMeMatch[1],
      type: 'OWED_TO_YOU',
      amount: parseFloat(owesMeMatch[2].replace(/,/g, '')),
      note,
      category: cat,
    };
    console.log('--- [Budget Bridge Peer Balance Parser Pipeline] ---');
    console.log('1. Raw Input:', rawInput);
    console.log('2. Detected Amount:', result.amount);
    console.log('3. Detected Type:', result.type, '(Peer: ' + result.name + ')');
    console.log('4. Detected Category:', result.category);
    console.log('5. Final Entry Object:', result);
    return result;
  }

  // 2. "I owe <Name> <amount> [for <note>]"
  const iOweMatch = text.match(/i\s+owe\s+([a-zA-Z]+)\s+(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:[.,]\d{1,2})?)(?:\s+(?:for|on)\s+(.+))?/i);
  if (iOweMatch) {
    const note = iOweMatch[3]?.trim() || 'Pending payment';
    const cat = classifyCategory(`${text} ${note}`, true);
    const result: ParsedLocalPeerBalance = {
      name: iOweMatch[1],
      type: 'I_OWE',
      amount: parseFloat(iOweMatch[2].replace(/,/g, '')),
      note,
      category: cat,
    };
    console.log('--- [Budget Bridge Peer Balance Parser Pipeline] ---');
    console.log('1. Raw Input:', rawInput);
    console.log('2. Detected Amount:', result.amount);
    console.log('3. Detected Type:', result.type, '(Peer: ' + result.name + ')');
    console.log('4. Detected Category:', result.category);
    console.log('5. Final Entry Object:', result);
    return result;
  }

  // 3. "Lent <Name> <amount>" or "Gave <Name> <amount>"
  const lentMatch = text.match(/(?:lent|gave|paid\s+for)\s+([a-zA-Z]+)\s+(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:[.,]\d{1,2})?)(?:\s+(?:for|on)\s+(.+))?/i);
  if (lentMatch) {
    const note = lentMatch[3]?.trim() || 'Lent money';
    const cat = classifyCategory(`${text} ${note}`, true);
    const result: ParsedLocalPeerBalance = {
      name: lentMatch[1],
      type: 'OWED_TO_YOU',
      amount: parseFloat(lentMatch[2].replace(/,/g, '')),
      note,
      category: cat,
    };
    console.log('--- [Budget Bridge Peer Balance Parser Pipeline] ---');
    console.log('1. Raw Input:', rawInput);
    console.log('2. Detected Amount:', result.amount);
    console.log('3. Detected Type:', result.type, '(Peer: ' + result.name + ')');
    console.log('4. Detected Category:', result.category);
    console.log('5. Final Entry Object:', result);
    return result;
  }

  // 4. "Borrowed <amount> from <Name>"
  const borrowedMatch = text.match(/borrowed\s+(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:[.,]\d{1,2})?)\s+from\s+([a-zA-Z]+)(?:\s+(?:for|on)\s+(.+))?/i);
  if (borrowedMatch) {
    const note = borrowedMatch[3]?.trim() || 'Borrowed money';
    const cat = classifyCategory(`${text} ${note}`, true);
    const result: ParsedLocalPeerBalance = {
      name: borrowedMatch[2],
      type: 'I_OWE',
      amount: parseFloat(borrowedMatch[1].replace(/,/g, '')),
      note,
      category: cat,
    };
    console.log('--- [Budget Bridge Peer Balance Parser Pipeline] ---');
    console.log('1. Raw Input:', rawInput);
    console.log('2. Detected Amount:', result.amount);
    console.log('3. Detected Type:', result.type, '(Peer: ' + result.name + ')');
    console.log('4. Detected Category:', result.category);
    console.log('5. Final Entry Object:', result);
    return result;
  }

  return null;
}

function cleanMerchant(r?: string): string {
  if (!r) return '';
  return r
    .replace(/^(?:for|on|at|to|towards)\s+/i, '')
    .replace(/(?:[₹$€£]|rs\.?)\s*\d+/gi, '')
    .replace(/\b\d+\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}
