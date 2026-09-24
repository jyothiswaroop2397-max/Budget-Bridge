import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    status: 'active',
    listenerModule: 'SmsBroadcastReceiver',
    supportedPermissions: ['RECEIVE_SMS', 'READ_SMS'],
    targetBanks: [
      'Canara Bank (CANBNK)',
      'HDFC Bank (HDFCBK)',
      'State Bank of India (SBINB)',
      'ICICI Bank (ICICIB)',
      'Axis Bank (AXISBK)',
      'Paytm Bank',
      'UPI Gateways',
    ],
    silentVerificationActive: true,
    geminiVerificationEnabled: Boolean(process.env.GEMINI_API_KEY),
  });
}
