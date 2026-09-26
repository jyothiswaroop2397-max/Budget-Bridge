export type TransactionType = 'DEBIT' | 'CREDIT';

export type Category =
  | 'Food'
  | 'Travel'
  | 'Bills'
  | 'Shopping'
  | 'Entertainment'
  | 'Health'
  | 'Social'
  | 'Other';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  merchant: string;
  category: Category;
  timestamp: number;
  source: 'sms_auto' | 'ai_chat' | 'manual' | 'quick_nl';
  bankName?: string;
  isVerified?: boolean;
  accountLast4?: string | null;
  upiRef?: string | null;
  rawSms?: string;
}

export interface SilentSmsVerificationResult {
  is_payment: boolean;
  is_sensitive?: boolean;
  amount?: number;
  type?: 'DEBIT' | 'CREDIT';
  merchant?: string;
  category?: Category;
  bankName?: string;
  accountLast4?: string | null;
  upiRef?: string | null;
  engine?: 'gemini' | 'heuristic' | 'local_privacy_filter';
  rawText?: string;
}

export type PeerBalanceType = 'OWED_TO_YOU' | 'I_OWE';

export interface PeerExpenseItem {
  id: string;
  description: string;
  amount: number;
  date?: number;
  dateStr?: string;
  direction?: 'GAVE' | 'RECEIVED';
}

export interface PeerBalance {
  id: string;
  name: string;
  type: PeerBalanceType;
  amount: number;
  note?: string;
  updatedAt: number;
  items?: PeerExpenseItem[];
  totalGiven?: number;
  totalReceived?: number;
}

export interface BudgetHealthFactorContext {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  status: string;
  description: string;
  visible?: boolean;
}

export interface BudgetFinancialHealthContext {
  score: number | null;
  label: string;
  hasData: boolean;
  factors: BudgetHealthFactorContext[];
  strongestFactor?: {
    name: string;
    explanation: string;
  };
  weakestFactor?: {
    name: string;
    explanation: string;
  };
  actionableSuggestion?: string;
  emptyStateMessage?: string;
  metrics?: {
    totalIncome?: number;
    totalExpenses?: number;
    monthlyExpenses?: number;
    monthlyCap?: number;
    dailyLimit?: number;
    spentToday?: number;
    savingsBuffer?: number;
    monthsBufferCovered?: number;
    savingsRate?: number;
    totalOwedToYou?: number;
    totalIOwe?: number;
    netPeerBalance?: number;
  };
}

export interface BudgetContext {
  monthlyCap: number;
  monthlyExpenditure: number;
  dailyLimit: number;
  spentToday: number;
  currency: string;
  userName?: string;
  userProfile?: UserProfile;
  categoryBreakdown: Record<string, number>;
  transactionsCount: number;
  totalOwedToYou?: number;
  totalIOwe?: number;
  peerBalances?: Array<PeerBalance>;
  recentTransactions?: Array<{
    merchant: string;
    amount: number;
    category: string;
    type: string;
    date: string;
  }>;
  financialHealth?: BudgetFinancialHealthContext;
}

export type MessageIntentCategory =
  | 'SPEND_TRANSACTION'     // (a) spend / expense / income statement (must have amount > 0 AND spend verb/noun)
  | 'DEBT_STATEMENT'        // (b) debt statement ("X owes me Y", "I owe X Y" with amount > 0)
  | 'BUDGET_QUERY'          // (c) question about budget/spending/balances data
  | 'FINANCIAL_HEALTH_QUERY'// (d) questions about financial health score, breakdown, factors, improvements
  | 'GENERAL_CHAT';         // (e) greetings, small talk, casual messages, unclear input

export type ProposalStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface ChatTransactionProposal {
  id: string;
  type: 'TRANSACTION';
  status: ProposalStatus;
  data: {
    amount: number;
    type: TransactionType;
    merchant: string;
    category: Category;
  };
  summaryText: string;
  isAmbiguous?: boolean;
}

export interface ChatPeerDebtProposal {
  id: string;
  type: 'PEER_DEBT';
  status: ProposalStatus;
  data: {
    name: string;
    type: PeerBalanceType;
    amount: number;
    note?: string;
  };
  summaryText: string;
  isAmbiguous?: boolean;
}

export type ChatProposal = ChatTransactionProposal | ChatPeerDebtProposal;

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  mode?: 'TRANSACTION_PARSING' | 'PEER_BALANCE' | 'TEXT_QUERY' | 'PROPOSAL_CONFIRMATION';
  intentCategory?: MessageIntentCategory;
  proposal?: ChatProposal;
  transaction?: {
    amount: number;
    type: 'DEBIT' | 'CREDIT';
    merchant: string;
    category: Category;
  };
  peerBalance?: {
    name: string;
    type: PeerBalanceType;
    amount: number;
    note?: string;
  };
  queryDetails?: {
    queryType: string;
    calculatedAmount?: number | null;
    category?: string;
  };
  peerLedger?: {
    action: 'LOGGED' | 'QUERY';
    peer: PeerBalance;
  };
  engine?: 'gemini' | 'heuristic';
}

export interface AgentApiResponse {
  success: boolean;
  mode: 'TRANSACTION_PARSING' | 'PEER_BALANCE' | 'TEXT_QUERY' | 'PROPOSAL_CONFIRMATION';
  intentCategory?: MessageIntentCategory;
  reply: string;
  proposal?: ChatProposal;
  transaction?: {
    amount: number;
    type: 'DEBIT' | 'CREDIT';
    merchant: string;
    category: Category;
  };
  peerBalance?: {
    name: string;
    type: PeerBalanceType;
    amount: number;
    note?: string;
  };
  peerLedger?: {
    action: 'LOGGED' | 'QUERY';
    peer: PeerBalance;
  };
  queryDetails?: {
    queryType: string;
    calculatedAmount?: number | null;
    category?: string;
  };
  engine?: 'gemini' | 'heuristic';
  note?: string;
}

export interface UserProfile {
  name: string;
  avatarUrl: string;
}

export interface AppState {
  monthlyCap: number;
  dailyLimit: number;
  spentToday: number;
  currency: string;
  transactions: Transaction[];
  peerBalances: PeerBalance[];
  lastActiveDate: string;
  smsPermissionGranted: boolean;
  silentVerificationActive: boolean;
  userProfile?: UserProfile;
  savingsEntries?: import('./types/savings.js').SavingsEntry[];
}
