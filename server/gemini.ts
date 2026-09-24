import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Lazy-initialized Gemini client instance
let genAiClient: GoogleGenAI | null = null;

/**
 * Returns a configured GoogleGenAI instance using process.env.GEMINI_API_KEY.
 * Works uniformly in AI Studio, local development, and Vercel serverless.
 */
export function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !key.trim()) {
    return null;
  }
  if (!genAiClient) {
    genAiClient = new GoogleGenAI({
      apiKey: key.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAiClient;
}

// Function Calling Tool Declarations for Budget Bridge Assistant
export const parseAndLogTransactionTool: FunctionDeclaration = {
  name: 'parse_and_log_transaction',
  description:
    'Parse a clear expense or income statement with a positive numeric amount (e.g. "Spent 250 on lunch", "Paid 400 for groceries", "Uber 150"). NEVER call this if there is no positive numerical amount or if the user is just saying hi/chatting.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      amount: {
        type: Type.NUMBER,
        description: 'The positive numerical amount of the transaction. Must be strictly greater than 0.',
      },
      type: {
        type: Type.STRING,
        enum: ['DEBIT', 'CREDIT'],
        description: 'DEBIT for expenses/spending, CREDIT for income/refunds.',
      },
      merchant: {
        type: Type.STRING,
        description: 'The vendor, merchant, or item (e.g., Swiggy, Lunch, Uber, Groceries).',
      },
      category: {
        type: Type.STRING,
        enum: ['Food', 'Travel', 'Bills', 'Shopping', 'Entertainment', 'Health', 'Social', 'Other'],
        description: 'The best matching spending category.',
      },
    },
    required: ['amount', 'type', 'merchant', 'category'],
  },
};

export const answerFinancialQueryTool: FunctionDeclaration = {
  name: 'answer_financial_query',
  description:
    'When the user asks financial questions (e.g., "What is my total monthly expenditure?", "How much did I spend on food?", "Am I over budget today?", "What is my daily limit?"), analyze the user budget and transaction database context and answer in clear, text-based natural language.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      answer: {
        type: Type.STRING,
        description:
          'Clear, concise, and accurate natural language answer answering the user financial question based strictly on the provided budget context.',
      },
      queryType: {
        type: Type.STRING,
        enum: [
          'MONTHLY_EXPENDITURE',
          'DAILY_BUDGET',
          'CATEGORY_SPEND',
          'MONTHLY_CAP',
          'GENERAL_FINANCE',
        ],
        description: 'The classified type of financial query.',
      },
      category: {
        type: Type.STRING,
        nullable: true,
        description: 'The specific category if queried (e.g. Food, Travel), or null.',
      },
      calculatedAmount: {
        type: Type.NUMBER,
        nullable: true,
        description: 'Any relevant calculated monetary amount, or null.',
      },
    },
    required: ['answer', 'queryType'],
  },
};

/**
 * Formats assistant responses with "Hi <displayName>, <remaining message>"
 */
export function formatReplyWithUser(rawReply: string, displayName: string): string {
  const name = (displayName || 'Guest').trim();
  const trimmed = (rawReply || '').trim();
  if (!trimmed) return `Hi ${name}, how can I help you today?`;

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existingWithTargetName = new RegExp(
    `^(?:hi\\s+there|hello\\s+there|hey\\s+there|hi|hello|hey)\\s+${escapedName}\\b[,!.:]?\\s*`,
    'i'
  );

  if (existingWithTargetName.test(trimmed)) {
    const rest = trimmed.replace(existingWithTargetName, '').trim();
    if (!rest) return `Hi ${name}!`;
    const cleanRest = rest.charAt(0).toUpperCase() + rest.slice(1);
    return `Hi ${name}, ${cleanRest}`;
  }

  // Strip generic greeting like "Hello there!", "Hi there!", "Hello!", "Hi!"
  const genericPattern = /^(?:hi\\s+there|hello\\s+there|hey\\s+there|hi|hello|hey|greetings)(?:\s+[a-zA-Z0-9_]+)?\s*[,!.:]?\s*/i;
  let remaining = trimmed;
  if (genericPattern.test(trimmed)) {
    remaining = trimmed.replace(genericPattern, '').trim();
  }

  if (!remaining) {
    return `Hi ${name}!`;
  }

  const cleanRemaining = remaining.charAt(0).toUpperCase() + remaining.slice(1);
  return `Hi ${name}, ${cleanRemaining}`;
}
