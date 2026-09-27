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
  isPureSmallTalk,
  parseTransactionHeuristic,
} from '../src/utils/parser.js';
import {
  parsePeerTransaction,
  parsePeerLedgerQuery,
  formatPeerLedgerProfile,
  calculatePeerLedgerTotals,
  applyPeerTransaction,
  getTodayIsoDate,
} from '../src/utils/peerLedger.js';
import { BudgetContext, ChatProposal, PeerBalance } from '../src/types.js';
import { calculateFinancialHealth } from '../src/utils/financialHealth.js';
import { answerFinancialQueryWithGeminiOrFallback } from '../server/geminiQueryHelper.js';

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
    financialHealth: budgetContext?.financialHealth || calculateFinancialHealth({
      transactions: (budgetContext?.recentTransactions as any) || [],
      currency: budgetContext?.currency || 'INR',
      monthlyCap: Number(budgetContext?.monthlyCap) || 0,
      monthlyExpenditure: Number(budgetContext?.monthlyExpenditure) || 0,
      dailyLimit: Number(budgetContext?.dailyLimit) || 0,
      spentToday: Number(budgetContext?.spentToday) || 0,
      peerBalances: Array.isArray(budgetContext?.peerBalances) ? budgetContext.peerBalances : [],
      currentSavings: 0,
    }),
  };

  const currentPeers: PeerBalance[] = Array.isArray(safeContext.peerBalances)
    ? (safeContext.peerBalances as PeerBalance[])
    : [];

  // ═════════════════════════════════════════════════════════════════
  // LAYER 0: PEER LEDGER PROFILE / HISTORY QUERY
  // (e.g. "show Rahul", "what does Rahul owe", "Rahul's history", "Rahul ledger")
  // MUST respond ONLY in the exact specified profile format.
  // ═════════════════════════════════════════════════════════════════
  const ledgerQuery = parsePeerLedgerQuery(promptText);
  if (ledgerQuery) {
    const targetPeer = currentPeers.find(
      (p) => p.name.trim().toLowerCase() === ledgerQuery.personName.toLowerCase()
    ) || null;

    const profileReply = formatPeerLedgerProfile(ledgerQuery.personName, targetPeer);
    return res.status(200).json({
      success: true,
      mode: 'TEXT_QUERY',
      intentCategory: 'BUDGET_QUERY',
      reply: profileReply,
      engine: 'peer_ledger',
      note: 'Peer ledger profile query answered in exact format',
    });
  }

  // ═════════════════════════════════════════════════════════════════
  // LAYER 1: PEER TRANSACTION OR AMBIGUITY CHECK
  // (e.g. "I gave Rahul 2000", "Rahul paid me back 1000", "I lent Priya 500 for lunch")
  // ═════════════════════════════════════════════════════════════════
  const peerTxResult = parsePeerTransaction(promptText);
  if (peerTxResult) {
    if (peerTxResult.type === 'QUERY') {
      const targetPeer = currentPeers.find(
        (p) => p.name.trim().toLowerCase() === peerTxResult.personName.toLowerCase()
      ) || null;
      const profileReply = formatPeerLedgerProfile(peerTxResult.personName, targetPeer);
      return res.status(200).json({
        success: true,
        mode: 'TEXT_QUERY',
        intentCategory: 'BUDGET_QUERY',
        reply: profileReply,
        engine: 'peer_ledger',
      });
    }

    if (peerTxResult.type === 'AMBIGUOUS') {
      return res.status(200).json({
        success: true,
        mode: 'TEXT_QUERY',
        intentCategory: 'GENERAL_CHAT',
        reply: peerTxResult.clarificationQuestion,
        engine: 'peer_ledger',
        note: 'Ambiguous peer transaction, clarifying with user',
      });
    }

    if (peerTxResult.type === 'TRANSACTION') {
      // Apply transaction into running ledger
      const { updatedPeer } = applyPeerTransaction(currentPeers, peerTxResult);
      const { totalGiven, totalReceived, pending } = calculatePeerLedgerTotals(updatedPeer);

      const pendingStr =
        pending < 0
          ? `-₹${Math.abs(pending)} (you owe ${updatedPeer.name})`
          : `₹${pending}`;

      const replyMsg =
        peerTxResult.direction === 'GAVE'
          ? `Recorded: You gave ₹${peerTxResult.amount} to ${updatedPeer.name}${
              peerTxResult.description ? ` for ${peerTxResult.description}` : ''
            } on ${peerTxResult.dateStr}. (Pending: ${pendingStr})`
          : `Recorded: Received ₹${peerTxResult.amount} back from ${updatedPeer.name}${
              peerTxResult.description ? ` for ${peerTxResult.description}` : ''
            } on ${peerTxResult.dateStr}. (Pending: ${pendingStr})`;

      return res.status(200).json({
        success: true,
        mode: 'PEER_BALANCE',
        intentCategory: 'DEBT_STATEMENT',
        reply: replyMsg,
        peerLedger: {
          action: 'LOGGED',
          peer: updatedPeer,
        },
        peerBalance: {
          name: updatedPeer.name,
          type: updatedPeer.type,
          amount: updatedPeer.amount,
          note: peerTxResult.description,
        },
        engine: 'peer_ledger',
        note: 'Peer transaction logged to running ledger',
      });
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // LAYER 2: GENERAL INTENT CLASSIFICATION BEFORE REGULAR ACTION
  // ═════════════════════════════════════════════════════════════════
  const intentResult = classifyMessageIntent(promptText);

  // Case (d): General Conversation / Greeting / Casual / No Amount
  // Check if it's pure small talk (e.g. "hi", "thanks", "ok", "lol") without informational intent.
  // If it's pure small talk, return canned greeting/info.
  // BUT if it asks a question or data-related request, route to Gemini with safeContext!
  if (intentResult.category === 'GENERAL_CHAT') {
    if (isPureSmallTalk(promptText)) {
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

    // It's in GENERAL_CHAT but not pure small talk (e.g., questions or statements phrased differently)
    const answerResult = await answerFinancialQueryWithGeminiOrFallback(
      promptText,
      safeContext,
      displayName,
      'GENERAL_CHAT'
    );

    return res.status(200).json({
      success: true,
      mode: 'TEXT_QUERY',
      intentCategory: 'GENERAL_CHAT',
      reply: answerResult.reply,
      queryDetails: {
        queryType: answerResult.queryType,
        category: answerResult.category,
        calculatedAmount: answerResult.calculatedAmount,
      },
      engine: answerResult.engine,
      note: answerResult.note || 'Informational query answered via safeContext and Gemini',
    });
  }

  // Case (c): Budget or Financial Health Question (e.g. "What is my total monthly expenditure?", "Why is my financial health low?", "How do I improve my score?")
  // Returns calculated figures conversationally. Never touches transactions table.
  if (intentResult.category === 'BUDGET_QUERY' || intentResult.category === 'FINANCIAL_HEALTH_QUERY') {
    const answerResult = await answerFinancialQueryWithGeminiOrFallback(
      promptText,
      safeContext,
      displayName,
      intentResult.category
    );

    return res.status(200).json({
      success: true,
      mode: 'TEXT_QUERY',
      intentCategory: intentResult.category,
      reply: answerResult.reply,
      queryDetails: {
        queryType: answerResult.queryType,
        category: answerResult.category,
        calculatedAmount: answerResult.calculatedAmount,
      },
      engine: answerResult.engine,
      note: answerResult.note || 'Financial query answered accurately from budget data',
    });
  }

  // Case (b): Legacy Debt Statement ("Rahul owes me 500" / "I owe Priya 300")
  if (intentResult.category === 'DEBT_STATEMENT') {
    // If it reaches here, check if it's "X owes me Y" / "I owe X Y"
    const owesMe = promptText.match(/([a-zA-Z]+)\s+owes\s+me\s+(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)(?:\s+(?:for|on)\s+(.+))?/i);
    const iOwe = promptText.match(/i\s+owe\s+([a-zA-Z]+)\s+(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)(?:\s+(?:for|on)\s+(.+))?/i);

    if (owesMe) {
      const pName = owesMe[1];
      const pAmt = parseFloat(owesMe[2].replace(/,/g, ''));
      const pDesc = owesMe[3]?.trim() || '';
      const { updatedPeer } = applyPeerTransaction(currentPeers, {
        type: 'TRANSACTION',
        personName: pName,
        direction: 'GAVE',
        amount: pAmt,
        dateStr: getTodayIsoDate(),
        description: pDesc,
      });
      const { pending } = calculatePeerLedgerTotals(updatedPeer);
      const pendingStr = pending < 0 ? `-₹${Math.abs(pending)} (you owe ${updatedPeer.name})` : `₹${pending}`;
      return res.status(200).json({
        success: true,
        mode: 'PEER_BALANCE',
        intentCategory: 'DEBT_STATEMENT',
        reply: `Recorded: Logged that ${updatedPeer.name} owes you ₹${pAmt}${pDesc ? ` for ${pDesc}` : ''}. (Pending: ${pendingStr})`,
        peerLedger: { action: 'LOGGED', peer: updatedPeer },
        engine: 'peer_ledger',
      });
    }

    if (iOwe) {
      const pName = iOwe[1];
      const pAmt = parseFloat(iOwe[2].replace(/,/g, ''));
      const pDesc = iOwe[3]?.trim() || '';
      const { updatedPeer } = applyPeerTransaction(currentPeers, {
        type: 'TRANSACTION',
        personName: pName,
        direction: 'RECEIVED',
        amount: pAmt,
        dateStr: getTodayIsoDate(),
        description: pDesc,
      });
      const { pending } = calculatePeerLedgerTotals(updatedPeer);
      const pendingStr = pending < 0 ? `-₹${Math.abs(pending)} (you owe ${updatedPeer.name})` : `₹${pending}`;
      return res.status(200).json({
        success: true,
        mode: 'PEER_BALANCE',
        intentCategory: 'DEBT_STATEMENT',
        reply: `Recorded: Logged that you owe ${updatedPeer.name} ₹${pAmt}${pDesc ? ` for ${pDesc}` : ''}. (Pending: ${pendingStr})`,
        peerLedger: { action: 'LOGGED', peer: updatedPeer },
        engine: 'peer_ledger',
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
        model: 'gemini-3.8-flash',
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
        'I couldn\'t detect a positive spending amount. Try typing "Spent 200 on lunch" or "I gave Rahul 2000".',
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

