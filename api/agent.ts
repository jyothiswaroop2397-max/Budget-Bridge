import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getGeminiClient,
  parseAndLogTransactionTool,
  formatReplyWithUser,
} from '../server/gemini.js';
import {
  classifyMessageIntent,
  GREETING_KEYWORDS,
  getRandomIntentReply,
  parsePeerBalanceHeuristic,
  parseTransactionHeuristic,
} from '../src/utils/parser.js';
import { analyzeFinancialQueryLocal } from '../src/utils/financialQueryHelper.js';
import { BudgetContext, ChatProposal } from '../src/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const { message, budgetContext, userName } = body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  const promptText = message.trim();
  const displayName = String(
    userName ||
    budgetContext?.userName ||
    budgetContext?.userProfile?.name ||
    'Guest'
  ).trim();

  const safeContext: BudgetContext = {
    monthlyCap:
      typeof budgetContext?.monthlyCap === 'number'
        ? budgetContext.monthlyCap
        : Number(budgetContext?.monthlyCap) || 0,
    monthlyExpenditure: Number(budgetContext?.monthlyExpenditure) || 0,
    dailyLimit:
      typeof budgetContext?.dailyLimit === 'number'
        ? budgetContext.dailyLimit
        : Number(budgetContext?.dailyLimit) || 0,
    spentToday: Number(budgetContext?.spentToday) || 0,
    currency: budgetContext?.currency || 'INR',
    categoryBreakdown: budgetContext?.categoryBreakdown || {},
    transactionsCount: Number(budgetContext?.transactionsCount) || 0,
    totalOwedToYou: Number(budgetContext?.totalOwedToYou) || 0,
    totalIOwe: Number(budgetContext?.totalIOwe) || 0,
    peerBalances: Array.isArray(budgetContext?.peerBalances)
      ? budgetContext.peerBalances
      : [],
    recentTransactions: Array.isArray(budgetContext?.recentTransactions)
      ? budgetContext.recentTransactions
      : [],
  };

  // ═════════════════════════════════════════════════════════════════
  // LAYER 1: STRICT INTENT CLASSIFICATION BEFORE ANY ACTION
  // ═════════════════════════════════════════════════════════════════
  const intentResult = classifyMessageIntent(promptText);

  // Case (d): General Conversation / Greeting / Casual / No Amount
  // NEVER creates or proposes a transaction. Never touches database.
  if (intentResult.category === 'GENERAL_CHAT') {
    const isGreeting = GREETING_KEYWORDS.some((g) =>
      promptText.toLowerCase().includes(g.toLowerCase())
    );
    const replyText = getRandomIntentReply(isGreeting ? 'GREETING' : 'APP_INFO');
    return res.status(200).json({
      success: true,
      mode: 'TEXT_QUERY',
      intentCategory: 'GENERAL_CHAT',
      reply: formatReplyWithUser(replyText, displayName),
      engine: 'heuristic',
      note: 'Conversational small-talk reply without database action',
    });
  }

  // Case (c): Budget or Spending Question (e.g. "What is my total monthly expenditure?", "What's my avg weekly expenditure?")
  // Returns calculated figures conversationally. Never touches transactions table.
  if (intentResult.category === 'BUDGET_QUERY') {
    const localQueryResult = analyzeFinancialQueryLocal(promptText, safeContext);

    if (localQueryResult.isQuery && localQueryResult.reply) {
      return res.status(200).json({
        success: true,
        mode: 'TEXT_QUERY',
        intentCategory: 'BUDGET_QUERY',
        reply: formatReplyWithUser(localQueryResult.reply, displayName),
        queryDetails: {
          queryType: localQueryResult.queryType || 'GENERAL_FINANCE',
          category: localQueryResult.category || undefined,
          calculatedAmount: localQueryResult.calculatedAmount ?? safeContext.monthlyExpenditure,
        },
        engine: 'deterministic',
        note: 'Financial query answered accurately from budget data',
      });
    }

    // If no specific rule triggered, try Gemini with budget context
    const ai = getGeminiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `You are the Budget Bridge Assistant. You are addressing user "${displayName}".
Always start your reply with "Hi ${displayName}, " followed by the helpful answer.
User's financial data:
- Currency: ${safeContext.currency}
- Monthly Expenditure: ${safeContext.monthlyExpenditure}
- Monthly Cap: ${safeContext.monthlyCap}
- Spent Today: ${safeContext.spentToday}
- Daily Limit: ${safeContext.dailyLimit}
- Total Owed to User: ${safeContext.totalOwedToYou}
- Total User Owes: ${safeContext.totalIOwe}
- Category Breakdown: ${JSON.stringify(safeContext.categoryBreakdown)}
- Recent Transactions: ${JSON.stringify(safeContext.recentTransactions?.slice(0, 5) || [])}

Answer the user's financial question clearly, concisely, and accurately in 1-3 sentences: "${promptText}"`,
                },
              ],
            },
          ],
          config: {
            temperature: 0.2,
          },
        });
        const geminiReply = response.text?.trim();
        if (geminiReply) {
          return res.status(200).json({
            success: true,
            mode: 'TEXT_QUERY',
            intentCategory: 'BUDGET_QUERY',
            reply: formatReplyWithUser(geminiReply, displayName),
            engine: 'gemini',
          });
        }
      } catch (err: any) {
        console.warn('Gemini query answering failed, falling back to local:', err?.message || err);
      }
    }

    return res.status(200).json({
      success: true,
      mode: 'TEXT_QUERY',
      intentCategory: 'BUDGET_QUERY',
      reply: formatReplyWithUser(
        localQueryResult.reply ||
          `Your current monthly expenditure is ${safeContext.currency} ${safeContext.monthlyExpenditure.toLocaleString()} (Cap: ${safeContext.currency} ${safeContext.monthlyCap.toLocaleString()}). Today's spend: ${safeContext.currency} ${safeContext.spentToday.toLocaleString()}.`,
        displayName
      ),
      queryDetails: {
        queryType: localQueryResult.queryType || 'GENERAL_FINANCE',
        category: localQueryResult.category || undefined,
        calculatedAmount: localQueryResult.calculatedAmount ?? safeContext.monthlyExpenditure,
      },
      engine: 'fallback',
      note: 'Financial query answered without writing transactions',
    });
  }

  // Case (b): Debt Statement (e.g. "Rahul owes me 500", "I owe Priya 300")
  // LAYER 2: Do NOT log immediately! Create a proposal requiring user confirmation.
  if (intentResult.category === 'DEBT_STATEMENT') {
    const peerMatch = parsePeerBalanceHeuristic(promptText);
    if (peerMatch && peerMatch.amount > 0) {
      const isOwedToYou = peerMatch.type === 'OWED_TO_YOU';
      const proposalId = 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const proposal: ChatProposal = {
        id: proposalId,
        type: 'PEER_DEBT',
        status: 'PENDING',
        data: {
          name: peerMatch.name,
          type: peerMatch.type,
          amount: peerMatch.amount,
          note: peerMatch.note,
        },
        summaryText: isOwedToYou
          ? `${peerMatch.name} owes you ${safeContext.currency} ${peerMatch.amount.toLocaleString()}`
          : `You owe ${peerMatch.name} ${safeContext.currency} ${peerMatch.amount.toLocaleString()}`,
        isAmbiguous: false,
      };

      const confirmationPrompt = isOwedToYou
        ? `Log that ${peerMatch.name} owes you ${safeContext.currency} ${peerMatch.amount.toLocaleString()}${peerMatch.note ? ` (${peerMatch.note})` : ''}?`
        : `Log that you owe ${peerMatch.name} ${safeContext.currency} ${peerMatch.amount.toLocaleString()}${peerMatch.note ? ` (${peerMatch.note})` : ''}?`;

      return res.status(200).json({
        success: true,
        mode: 'PROPOSAL_CONFIRMATION',
        intentCategory: 'DEBT_STATEMENT',
        reply: formatReplyWithUser(confirmationPrompt, displayName),
        proposal,
        engine: 'heuristic',
        note: 'Requires user confirmation before logging peer debt',
      });
    }
  }

  // Case (a): Spend / Expense Statement (e.g. "Spent 200 on lunch", "Paid 450 for groceries")
  // LAYER 2: Propose transaction for user confirmation.
  const ai = getGeminiClient();
  let extractedTx = parseTransactionHeuristic(promptText);

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are the Budget Bridge Assistant, a personal budget copilot.
CRITICAL INSTRUCTION: Respond strictly using clear, text-based natural language.
Current currency: ${safeContext.currency}
Extract the numerical amount, type (DEBIT or CREDIT), merchant/item name, and category (Food, Travel, Bills, Shopping, Entertainment, Health, Social, Other) for: "${promptText}".
Call parse_and_log_transaction ONLY if amount > 0.`,
              },
            ],
          },
        ],
        config: {
          tools: [{ functionDeclarations: [parseAndLogTransactionTool] }],
          temperature: 0.1,
        },
      });

      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        if (call.name === 'parse_and_log_transaction') {
          const args = call.args as any;
          const amt = Math.abs(Number(args.amount) || 0);
          if (amt > 0) {
            extractedTx = {
              amount: amt,
              type: (args.type as 'DEBIT' | 'CREDIT') || 'DEBIT',
              merchant: String(args.merchant || 'Expense').trim(),
              category: String(args.category || 'Other').trim() as any,
              engine: 'gemini',
            };
          }
        }
      }
    } catch (err: any) {
      console.warn('Gemini parser error, using local heuristic:', err?.message || err);
    }
  }

  // Final check: amount must be strictly positive
  if (!extractedTx.amount || extractedTx.amount <= 0) {
    return res.status(200).json({
      success: true,
      mode: 'TEXT_QUERY',
      intentCategory: 'GENERAL_CHAT',
      reply: formatReplyWithUser(
        'I couldn\'t detect a positive spending amount. Try typing "Spent 200 on lunch" or "Rahul owes me 500".',
        displayName
      ),
      engine: 'heuristic',
    });
  }

  const isAmbiguous =
    extractedTx.category === 'Other' || extractedTx.merchant.toLowerCase() === 'expense';
  const confirmationPrompt = isAmbiguous
    ? `I think you meant ${safeContext.currency} ${extractedTx.amount.toLocaleString()} on ${extractedTx.category} (${extractedTx.merchant}) — is that right?`
    : `Log ${safeContext.currency} ${extractedTx.amount.toLocaleString()} on ${extractedTx.merchant} (${extractedTx.category})?`;

  const proposalId = 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  const proposal: ChatProposal = {
    id: proposalId,
    type: 'TRANSACTION',
    status: 'PENDING',
    data: {
      amount: extractedTx.amount,
      type: extractedTx.type,
      merchant: extractedTx.merchant,
      category: extractedTx.category,
    },
    summaryText: `${extractedTx.type === 'CREDIT' ? 'Income' : 'Spend'} ${safeContext.currency} ${extractedTx.amount.toLocaleString()} on ${extractedTx.merchant} (${extractedTx.category})`,
    isAmbiguous,
  };

  return res.status(200).json({
    success: true,
    mode: 'PROPOSAL_CONFIRMATION',
    intentCategory: 'SPEND_TRANSACTION',
    reply: formatReplyWithUser(confirmationPrompt, displayName),
    proposal,
    engine: extractedTx.engine || 'heuristic',
    note: 'Requires user confirmation before logging transaction',
  });
}
