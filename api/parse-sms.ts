import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Type } from '@google/genai';
import { getGeminiClient } from '../server/gemini.js';
import { isSensitiveSms } from '../src/utils/smsPrivacyFilter.js';
import { parseBankSmsSilent } from '../src/utils/smsParser.js';

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

  const { smsText, sender } = body || {};
  if (!smsText || typeof smsText !== 'string' || !smsText.trim()) {
    return res.status(400).json({ error: 'SMS text is required' });
  }

  const rawText = smsText.trim();
  const rawSender = sender ? String(sender).trim() : 'CANBNK';

  // SENSITIVE PRE-FILTER SAFEGUARD: If sensitive (OTP, verification codes, PIN, password), discard immediately
  if (isSensitiveSms(rawText)) {
    return res.status(200).json({
      is_payment: false,
      engine: 'local_privacy_filter',
    });
  }

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
                text: `Sender: "${rawSender}"\nSMS Content: "${rawText}"`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: `Analyze the SMS text. Verify if it is a valid bank payment debit or credit notification.
- If valid payment: Extract { 'is_payment': true, 'amount': number, 'type': 'DEBIT'|'CREDIT', 'merchant': string, 'category': string }.
- If NOT a bank payment (e.g., OTP, spam, marketing): Return { 'is_payment': false }.
Respond ONLY with raw JSON.`,
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              is_payment: {
                type: Type.BOOLEAN,
                description: 'True if valid bank payment debit or credit notification, false otherwise.',
              },
              amount: {
                type: Type.NUMBER,
                nullable: true,
                description: 'Positive monetary amount.',
              },
              type: {
                type: Type.STRING,
                enum: ['DEBIT', 'CREDIT'],
                nullable: true,
              },
              merchant: {
                type: Type.STRING,
                nullable: true,
                description: 'Merchant or vendor or receiver name.',
              },
              category: {
                type: Type.STRING,
                enum: ['Food', 'Travel', 'Bills', 'Shopping', 'Entertainment', 'Health', 'Other'],
                nullable: true,
              },
            },
            required: ['is_payment'],
          },
        },
      });

      const text = response.text?.trim();
      if (text) {
        const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        if (parsed && typeof parsed.is_payment === 'boolean') {
          if (parsed.is_payment) {
            return res.status(200).json({
              success: true,
              is_payment: true,
              amount: Math.abs(Number(parsed.amount) || 0),
              type: parsed.type || 'DEBIT',
              merchant: parsed.merchant || 'Bank Transaction',
              category: parsed.category || 'Other',
              bankName: rawSender,
              engine: 'gemini',
              rawText,
            });
          } else {
            // NOT a bank payment (OTP, spam, marketing) -> Silently discard
            return res.status(200).json({
              success: true,
              is_payment: false,
              engine: 'gemini',
              rawText,
            });
          }
        }
      }
    } catch (err: any) {
      console.warn('Gemini /api/parse-sms failed, falling back to silent heuristic parser:', err?.message || err);
    }
  }

  // Heuristic silent verification fallback
  const fallback = parseBankSmsSilent(rawText, rawSender);
  return res.status(200).json({
    success: true,
    ...fallback,
  });
}
