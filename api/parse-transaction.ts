import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Type } from '@google/genai';
import { getGeminiClient } from '../server/gemini.js';
import { parseTransactionHeuristic } from '../src/utils/parser.js';

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

  const { input } = body || {};
  if (!input || typeof input !== 'string' || !input.trim()) {
    return res.status(400).json({ error: 'Input text is required' });
  }

  const promptText = input.trim();
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
                text: `Parse this natural language financial transaction into structured data: "${promptText}"`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: `You are a financial parsing engine for Budget Bridge.
Read the user's short natural-language message describing a money event and respond ONLY with a single JSON object.

Fields:
- "amount": Positive number only. Extract numeric value without currency symbols.
- "type": "DEBIT" for personal spending/bills/purchases, "CREDIT" for income/refunds.
- "merchant": Short 1-4 word name of the merchant, store, or expense item.
- "category": One of "Food", "Travel", "Bills", "Shopping", "Entertainment", "Health", "Other".
Respond ONLY with raw JSON.`,
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER, description: 'Positive monetary amount.' },
              type: { type: Type.STRING, enum: ['DEBIT', 'CREDIT'] },
              merchant: { type: Type.STRING, description: 'Merchant or item name.' },
              category: {
                type: Type.STRING,
                enum: ['Food', 'Travel', 'Bills', 'Shopping', 'Entertainment', 'Health', 'Other'],
              },
            },
            required: ['amount', 'type', 'merchant', 'category'],
          },
        },
      });

      const text = response.text?.trim();
      if (text) {
        const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        if (parsed && typeof parsed.amount === 'number' && parsed.amount > 0) {
          return res.status(200).json({
            success: true,
            data: {
              amount: Math.abs(parsed.amount),
              type: parsed.type || 'DEBIT',
              merchant: parsed.merchant || 'Expense',
              category: parsed.category || 'Other',
              engine: 'gemini',
            },
          });
        }
      }
    } catch (err: any) {
      console.warn('Gemini /api/parse-transaction failed, falling back:', err?.message || err);
    }
  }

  const fallback = parseTransactionHeuristic(promptText);
  return res.status(200).json({
    success: true,
    data: fallback,
  });
}
