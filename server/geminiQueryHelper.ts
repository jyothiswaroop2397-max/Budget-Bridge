import { getGeminiClient, formatReplyWithUser } from './gemini.js';
import { BudgetContext, PeerBalance } from '../src/types.js';
import { analyzeFinancialQueryLocal } from '../src/utils/financialQueryHelper.js';

export interface AnswerFinancialQueryResult {
  reply: string;
  engine: 'gemini' | 'deterministic' | 'fallback';
  queryType: string;
  calculatedAmount?: number | null;
  category?: string;
  note?: string;
}

/**
 * Shared helper to answer ANY financial question or data request using Gemini,
 * falling back gracefully to local deterministic calculations from safeContext.
 */
export async function answerFinancialQueryWithGeminiOrFallback(
  promptText: string,
  safeContext: BudgetContext,
  displayName: string,
  intentCategory: string = 'BUDGET_QUERY'
): Promise<AnswerFinancialQueryResult> {
  const currentPeers: PeerBalance[] = Array.isArray(safeContext.peerBalances)
    ? (safeContext.peerBalances as PeerBalance[])
    : [];

  // 1. Fast deterministic check
  const localQueryResult = analyzeFinancialQueryLocal(promptText, safeContext);
  if (localQueryResult.isQuery && localQueryResult.reply) {
    return {
      reply: formatReplyWithUser(localQueryResult.reply, displayName),
      engine: 'deterministic',
      queryType: localQueryResult.queryType || (intentCategory === 'FINANCIAL_HEALTH_QUERY' ? 'FINANCIAL_HEALTH_OVERVIEW' : 'GENERAL_FINANCE'),
      calculatedAmount: localQueryResult.calculatedAmount ?? safeContext.financialHealth?.score ?? safeContext.monthlyExpenditure,
      category: localQueryResult.category,
      note: 'Financial query answered accurately from budget data',
    };
  }

  // 2. Prepare comprehensive Gemini context including safeContext fields
  const ai = getGeminiClient();
  if (ai) {
    try {
      const fh = safeContext.financialHealth;
      const fhFactorsText = (fh?.factors || [])
        .map((f) => `  • ${f.name}: ${f.score}/${f.maxScore} pts (${f.status}) — ${f.description}`)
        .join('\n');

      const recentTxText = (safeContext.recentTransactions || [])
        .slice(0, 10)
        .map((t) => `  • ${t.date || ''} - ${t.merchant}: ${safeContext.currency} ${t.amount} (${t.category}, ${t.type})`)
        .join('\n');

      const peerListText = currentPeers.length > 0
        ? currentPeers
            .map((p) => {
              const pendingDesc = p.type === 'OWED_TO_YOU' ? `owes you ${safeContext.currency} ${p.amount}` : `you owe ${p.name} ${safeContext.currency} ${p.amount}`;
              const noteDesc = p.note ? ` [Note: ${p.note}]` : '';
              return `  • ${p.name}: ${pendingDesc}${noteDesc}`;
            })
            .join('\n')
        : '  (No peer balances recorded)';

      const promptSystemAndContext = `You are the personal finance assistant for Budget Bridge.
Addressing user: "${displayName}".

STRICT SCOPE AND ACCURACY INSTRUCTION:
Only answer using the financial and app data provided below. If the user's question is unrelated to the app's financial/budget data (e.g. general knowledge, world events, programming, unrelated topics), politely say you can only help with questions about their Budget Bridge data.

FULL USER FINANCIAL AND BUDGET CONTEXT:
- Currency: ${safeContext.currency}
- Total Transactions Count: ${safeContext.transactionsCount}
- Monthly Expenditure (Current Spent): ${safeContext.currency} ${safeContext.monthlyExpenditure.toLocaleString()}
- Monthly Budget Cap: ${safeContext.currency} ${safeContext.monthlyCap.toLocaleString()}
- Spent Today: ${safeContext.currency} ${safeContext.spentToday.toLocaleString()}
- Daily Spending Limit: ${safeContext.currency} ${safeContext.dailyLimit.toLocaleString()}
- Total Owed to User (by friends/peers): ${safeContext.currency} ${(safeContext.totalOwedToYou || 0).toLocaleString()}
- Total User Owes (to friends/peers): ${safeContext.currency} ${(safeContext.totalIOwe || 0).toLocaleString()}
- Category Spending Breakdown:
${JSON.stringify(safeContext.categoryBreakdown, null, 2)}
- Peer Balances & Debt Ledgers:
${peerListText}
- Recent Transactions (up to 10):
${recentTxText || '  (No recent transactions logged)'}

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
  • Total Owed to User: ${safeContext.currency} ${(fh?.metrics?.totalOwedToYou ?? safeContext.totalOwedToYou ?? 0).toLocaleString()}
  • Total User Owes: ${safeContext.currency} ${(fh?.metrics?.totalIOwe ?? safeContext.totalIOwe ?? 0).toLocaleString()}

BEHAVIOR RULES FOR FINANCIAL QUESTIONS:
- Answer clearly, helpfully, and concisely using the exact figures from the data above.
- If asked about spending by category, budget status, daily limit discipline, who owes what, or recent expenses, quote the actual amounts and currency.
- If asked about financial health, cite their score (${fh?.score ?? 'Unrated'}) and the specific factor breakdown.
- Never invent placeholder figures; only use the real figures provided in context.

User question: "${promptText}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: promptSystemAndContext }],
          },
        ],
        config: {
          temperature: 0.1,
        },
      });

      const geminiReply = response.text?.trim();
      if (geminiReply) {
        return {
          reply: formatReplyWithUser(geminiReply, displayName),
          engine: 'gemini',
          queryType: intentCategory === 'FINANCIAL_HEALTH_QUERY' ? 'FINANCIAL_HEALTH_OVERVIEW' : 'GENERAL_FINANCE',
          calculatedAmount: safeContext.financialHealth?.score ?? safeContext.monthlyExpenditure,
          note: 'Financial query answered via Gemini with full safeContext',
        };
      }
    } catch (err: any) {
      console.error('Gemini query answering failed with error:', err);
    }
  }

  // 3. Graceful fallback using safeContext directly
  const fallbackReply =
    localQueryResult.reply ||
    (safeContext.financialHealth?.hasData && safeContext.financialHealth.score !== null
      ? `Your Financial Health Score is ${safeContext.financialHealth.score}/100 (${safeContext.financialHealth.label}). Monthly spend: ${safeContext.currency} ${safeContext.monthlyExpenditure.toLocaleString()} (Cap: ${safeContext.currency} ${safeContext.monthlyCap.toLocaleString()}). Today's spend: ${safeContext.currency} ${safeContext.spentToday.toLocaleString()}.`
      : `Your current monthly expenditure is ${safeContext.currency} ${safeContext.monthlyExpenditure.toLocaleString()} (Cap: ${safeContext.currency} ${safeContext.monthlyCap.toLocaleString()}). Today's spend: ${safeContext.currency} ${safeContext.spentToday.toLocaleString()}.`);

  return {
    reply: formatReplyWithUser(fallbackReply, displayName),
    engine: 'fallback',
    queryType: intentCategory === 'FINANCIAL_HEALTH_QUERY' ? 'FINANCIAL_HEALTH_OVERVIEW' : 'GENERAL_FINANCE',
    calculatedAmount: localQueryResult.calculatedAmount ?? safeContext.financialHealth?.score ?? safeContext.monthlyExpenditure,
    category: localQueryResult.category,
    note: 'Financial query answered without writing transactions',
  };
}
