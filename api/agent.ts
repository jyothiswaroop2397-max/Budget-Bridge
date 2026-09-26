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
import { analyzeFinancialQueryLocal } from '../src/utils/financialQueryHelper.js';
import { BudgetContext, ChatProposal, PeerBalance } from '../src/types.js';
import { calculateFinancialHealth } from '../src/utils/financialHealth.js';

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

  // Case (c): Budget or Financial Health Question (e.g. "What is my total monthly expenditure?", "Why is my financial health low?", "How do I improve my score?")
  // Returns calculated figures conversationally. Never touches transactions table.
  if (intentResult.category === 'BUDGET_QUERY' || intentResult.category === 'FINANCIAL_HEALTH_QUERY') {
    const localQueryResult = analyzeFinancialQueryLocal(promptText, safeContext);

    if (localQueryResult.isQuery && localQueryResult.reply) {
      return res.status(200).json({
        success: true,
        mode: 'TEXT_QUERY',
        intentCategory: intentResult.category,
        reply: formatReplyWithUser(localQueryResult.reply, displayName),
        queryDetails: {
          queryType: localQueryResult.queryType || (intentResult.category === 'FINANCIAL_HEALTH_QUERY' ? 'FINANCIAL_HEALTH_OVERVIEW' : 'GENERAL_FINANCE'),
          category: localQueryResult.category || undefined,
          calculatedAmount: localQueryResult.calculatedAmount ?? safeContext.financialHealth?.score ?? safeContext.monthlyExpenditure,
        },
        engine: 'deterministic',
        note: 'Financial query answered accurately from budget data',
      });
    }

    // If no specific rule triggered, try Gemini with budget, financial health, and peer ledger context
    const ai = getGeminiClient();
    if (ai) {
      try {
        const fh = safeContext.financialHealth;
        const fhFactorsText = (fh?.factors || [])
          .map((f) => `  • ${f.name}: ${f.score}/${f.maxScore} pts (${f.status}) — ${f.description}`)
          .join('\n');

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `You are the personal finance assistant for Budget Bridge. You track expenses, manage peer lending/borrowing ledgers, and provide real-time Financial Health insights.
Addressing user: "${displayName}".
Current peer balances and ledgers: ${JSON.stringify(currentPeers)}
User's budget data:
- Currency: ${safeContext.currency}
- Monthly Expenditure: ${safeContext.monthlyExpenditure}
- Monthly Cap: ${safeContext.monthlyCap}
- Spent Today: ${safeContext.spentToday}
- Daily Limit: ${safeContext.dailyLimit}
- Total Owed to User: ${safeContext.totalOwedToYou}
- Total User Owes: ${safeContext.totalIOwe}
- Category Breakdown: ${JSON.stringify(safeContext.categoryBreakdown)}
- Recent Transactions: ${JSON.stringify(safeContext.recentTransactions?.slice(0, 5) || [])}

User's Financial Health & Biometric Score Assessment:
- Overall Score: ${fh?.score !== null && fh?.score !== undefined ? `${fh.score}/100` : 'Unrated (no transaction data yet)'}
- Status Label: ${fh?.label || 'Unrated'}
- Has Activity Data: ${fh?.hasData ? 'Yes' : 'No'}
- Top Strength: ${fh?.strongestFactor?.name || 'N/A'} (${fh?.strongestFactor?.explanation || 'N/A'})
- Growth Opportunity / Weakest Factor: ${fh?.weakestFactor?.name || 'N/A'} (${fh?.weakestFactor?.explanation || 'N/A'})
- Actionable Recommendation: ${fh?.actionableSuggestion || 'N/A'}
- 5 Health Factors Breakdown:
${fhFactorsText || '  (No factor breakdown available)'}
- Key Health Metrics:
  • Emergency Buffer: ${fh?.metrics?.monthsBufferCovered ?? 0} months covered (${safeContext.currency} ${(fh?.metrics?.savingsBuffer ?? 0).toLocaleString()})
  • Savings Rate: ${Math.round((fh?.metrics?.savingsRate ?? 0) * 100)}%
  • Total Owed to User: ${safeContext.currency} ${(fh?.metrics?.totalOwedToYou ?? safeContext.totalOwedToYou).toLocaleString()}
  • Total User Owes: ${safeContext.currency} ${(fh?.metrics?.totalIOwe ?? safeContext.totalIOwe).toLocaleString()}

BEHAVIOR RULES FOR FINANCIAL HEALTH & SCORE QUESTIONS:
- If the user asks about their financial health, score, or rating (e.g. "how is my financial health", "why is my score low", "how to improve my score", "what is hurting my score"):
  • State their actual score (e.g. "${fh?.score !== null && fh?.score !== undefined ? `${fh.score}/100 (${fh.label})` : 'Unrated'}") and status label.
  • Explain why their score is at this level by citing specific factors from the breakdown above (e.g., daily limit overrun, high peer debt, or low emergency buffer).
  • If the user asks how to improve, provide concrete, personalized steps addressing their specific weakest factors.
  • If the score is Unrated, explain that they need to log transactions to activate their score.
  • Never invent placeholder figures; only use the real figures provided in context.

BEHAVIOR RULES FOR PEER LEDGERS:
- If asking to see a person's ledger (e.g. "show Rahul", "what does Rahul owe", "Rahul's history"), respond ONLY in this exact format:
[Name]
You gave: ₹[total given]
Received back: ₹[total received back]
Pending: ₹[pending amount]  (or "Pending: -₹[amount] (you owe [Name])" if negative)

Transaction History:
[date] — ₹[amount] — [Gave/Received] — [description if provided]
... (chronological order, oldest first)

- If no transactions exist for a person, say "No transactions found for [Name]. Would you like to log one?"
- If ambiguous, ask clarifying question (e.g. "Who was this with?").
- Otherwise answer the user's financial question clearly and concisely.

User query: "${promptText}"`,
                },
              ],
            },
          ],
          config: {
            temperature: 0.1,
          },
        });
        const geminiReply = response.text?.trim();
        if (geminiReply) {
          return res.status(200).json({
            success: true,
            mode: 'TEXT_QUERY',
            intentCategory: intentResult.category,
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
      intentCategory: intentResult.category,
      reply: formatReplyWithUser(
        localQueryResult.reply ||
          (safeContext.financialHealth?.hasData && safeContext.financialHealth.score !== null
            ? `Your Financial Health Score is ${safeContext.financialHealth.score}/100 (${safeContext.financialHealth.label}). Monthly spend: ${safeContext.currency} ${safeContext.monthlyExpenditure.toLocaleString()} (Cap: ${safeContext.currency} ${safeContext.monthlyCap.toLocaleString()}). Today's spend: ${safeContext.currency} ${safeContext.spentToday.toLocaleString()}.`
            : `Your current monthly expenditure is ${safeContext.currency} ${safeContext.monthlyExpenditure.toLocaleString()} (Cap: ${safeContext.currency} ${safeContext.monthlyCap.toLocaleString()}). Today's spend: ${safeContext.currency} ${safeContext.spentToday.toLocaleString()}.`),
        displayName
      ),
      queryDetails: {
        queryType: localQueryResult.queryType || (intentResult.category === 'FINANCIAL_HEALTH_QUERY' ? 'FINANCIAL_HEALTH_OVERVIEW' : 'GENERAL_FINANCE'),
        category: localQueryResult.category || undefined,
        calculatedAmount: localQueryResult.calculatedAmount ?? safeContext.financialHealth?.score ?? safeContext.monthlyExpenditure,
      },
      engine: 'fallback',
      note: 'Financial query answered without writing transactions',
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

