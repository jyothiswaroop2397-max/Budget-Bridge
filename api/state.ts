import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadState, saveState } from '../server/store.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const state = await loadState();
      if (state !== null) {
        return res.status(200).json({ exists: true, state });
      } else {
        return res.status(200).json({ exists: false });
      }
    } catch (err) {
      console.error('Failed to load state in GET /api/state:', err);
      return res.status(500).json({ error: 'Failed to retrieve state' });
    }
  }

  if (req.method === 'PUT') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON body' });
      }
    }

    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }

    // Accepts either { state: <object> } or direct state object
    const state = body.state !== undefined ? body.state : body;
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      return res.status(400).json({ error: 'State must be a non-null JSON object' });
    }

    try {
      const result = await saveState(state);
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      console.error('Failed to save state in PUT /api/state:', err);
      return res.status(500).json({ error: 'Failed to persist state' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
