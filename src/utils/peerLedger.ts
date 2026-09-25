import { PeerBalance, PeerBalanceType, PeerExpenseItem } from '../types.js';

export interface ParsedPeerTx {
  type: 'TRANSACTION';
  personName: string;
  direction: 'GAVE' | 'RECEIVED';
  amount: number;
  dateStr: string;
  description: string;
}

export interface AmbiguousPeerTx {
  type: 'AMBIGUOUS';
  clarificationQuestion: string;
}

export interface PeerLedgerQuery {
  type: 'QUERY';
  personName: string;
}

export type PeerParseResult = ParsedPeerTx | AmbiguousPeerTx | PeerLedgerQuery | null;

/**
 * Returns today's ISO date string (YYYY-MM-DD)
 */
export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Capitalizes person's name (e.g. "rahul" -> "Rahul")
 */
export function capitalizeName(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Non-name blacklist words that might follow verbs
 */
const NON_NAME_WORDS = new Set([
  'me',
  'him',
  'her',
  'them',
  'us',
  'you',
  'it',
  'money',
  'cash',
  'bucks',
  'rupees',
  'rs',
  'inr',
  'today',
  'yesterday',
  'tomorrow',
  'some',
  'my',
  'our',
  'this',
  'that',
  'lunch',
  'dinner',
  'food',
  'groceries',
  'coffee',
  'cab',
  'uber',
  'auto',
  'bill',
  'bills',
  'rent',
]);

/**
 * Extracts a numeric amount from text
 */
export function extractAmount(text: string): number | null {
  const match = text.match(/(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i);
  if (!match) return null;
  const num = parseFloat(match[1].replace(/,/g, ''));
  return isNaN(num) || num <= 0 ? null : Math.round(num * 100) / 100;
}

/**
 * Extracts a date from text, or defaults to today's date
 */
export function extractDate(text: string): string {
  const today = getTodayIsoDate();

  if (/\byesterday\b/i.test(text)) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Matches YYYY-MM-DD
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  // Matches DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (dmyMatch) {
    const day = String(dmyMatch[1]).padStart(2, '0');
    const month = String(dmyMatch[2]).padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  return today;
}

/**
 * Extracts short description/reason (e.g. "for lunch" -> "lunch")
 */
export function extractDescription(text: string): string {
  const reasonMatch = text.match(/(?:for|towards|on)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:yesterday|today|on\s+\d|\d{4}-\d{2}-\d{2}|$))/i);
  if (reasonMatch && reasonMatch[1]) {
    const raw = reasonMatch[1]
      .replace(/(?:[₹$€£]|rs\.?|inr)?\s*\d+/gi, '')
      .replace(/\b(?:yesterday|today)\b/gi, '')
      .trim();
    if (raw.length > 1 && !NON_NAME_WORDS.has(raw.toLowerCase())) {
      return raw;
    }
  }
  return '';
}

/**
 * Detects if the input is a profile / ledger query for a person.
 * Examples: "show Rahul", "what does Rahul owe", "Rahul's history", "Rahul ledger"
 */
export function parsePeerLedgerQuery(input: string): PeerLedgerQuery | null {
  const raw = (input || '').trim();
  const text = raw.toLowerCase();

  // Pattern 1: "show <Name> [history|ledger|profile]"
  const showMatch = text.match(/^(?:show|view|check|open)\s+(?:me\s+)?(?:the\s+)?([a-zA-Z]+)(?:'s|\s+)?(?:\s+(?:ledger|history|profile|account|balance|details))?$/i);
  if (showMatch && showMatch[1]) {
    const name = showMatch[1].toLowerCase();
    if (!NON_NAME_WORDS.has(name) && name !== 'ledger' && name !== 'all' && name !== 'transactions') {
      return { type: 'QUERY', personName: capitalizeName(showMatch[1]) };
    }
  }

  // Pattern 2: "what does <Name> owe [me]" or "what do i owe <Name>"
  const oweQueryMatch = text.match(/^(?:what\s+does|how\s+much\s+does)\s+([a-zA-Z]+)\s+owe(?:\s+me)?(?:\s*\?)?$/i);
  if (oweQueryMatch && oweQueryMatch[1]) {
    return { type: 'QUERY', personName: capitalizeName(oweQueryMatch[1]) };
  }

  const iOweQueryMatch = text.match(/^(?:what\s+do\s+i\s+owe|how\s+much\s+do\s+i\s+owe)\s+([a-zA-Z]+)(?:\s*\?)?$/i);
  if (iOweQueryMatch && iOweQueryMatch[1]) {
    return { type: 'QUERY', personName: capitalizeName(iOweQueryMatch[1]) };
  }

  // Pattern 3: "<Name>'s history" or "<Name> history" or "<Name>'s ledger" or "<Name> ledger" or "<Name> balance"
  const historyMatch = text.match(/^([a-zA-Z]+)(?:'s|\s+)?\s+(?:history|ledger|profile|statement|balance)(?:\s*\?)?$/i);
  if (historyMatch && historyMatch[1]) {
    const candidate = historyMatch[1].toLowerCase();
    if (!NON_NAME_WORDS.has(candidate) && candidate !== 'my' && candidate !== 'transaction' && candidate !== 'spend') {
      return { type: 'QUERY', personName: capitalizeName(historyMatch[1]) };
    }
  }

  // Pattern 4: "ledger for <Name>" or "history for <Name>"
  const forMatch = text.match(/^(?:ledger|history|profile|status|statement)\s+(?:for|of)\s+([a-zA-Z]+)(?:\s*\?)?$/i);
  if (forMatch && forMatch[1]) {
    return { type: 'QUERY', personName: capitalizeName(forMatch[1]) };
  }

  return null;
}

/**
 * Parses a natural language peer transaction according to the required assistant behavior.
 */
export function parsePeerTransaction(input: string): PeerParseResult {
  const raw = (input || '').trim();
  const text = raw.toLowerCase();
  if (!text) return null;

  // First check if this is a ledger query
  const query = parsePeerLedgerQuery(raw);
  if (query) return query;

  const amount = extractAmount(text);
  const dateStr = extractDate(text);
  const description = extractDescription(text);

  // 1. Check for missing person:
  // "I lent 500", "Gave 1000", "Paid back 200", "Received 500" without any person
  const hasNoPersonPatterns = [
    /^(?:i\s+)?(?:lent|gave|sent)\s+(?:[₹$€£]|rs\.?|inr)?\s*\d+(?:\s+(?:for|on)\s+[a-zA-Z0-9\s]+)?$/i,
    /^(?:i\s+)?paid\s+(?:back\s+)?(?:[₹$€£]|rs\.?|inr)?\s*\d+$/i,
    /^(?:i\s+)?received\s+(?:back\s+)?(?:[₹$€£]|rs\.?|inr)?\s*\d+$/i,
    /^borrowed\s+(?:[₹$€£]|rs\.?|inr)?\s*\d+$/i,
  ];
  for (const pat of hasNoPersonPatterns) {
    if (pat.test(text)) {
      return {
        type: 'AMBIGUOUS',
        clarificationQuestion: 'Who was this with?',
      };
    }
  }

  // 2. DIRECTION: USER GIVES MONEY TO PERSON
  // Examples:
  // - "I gave Rahul 2000"
  // - "I lent Priya 500 for lunch"
  // - "Gave Rahul 2000"
  // - "Lent Amit 1500"
  // - "Paid 500 to Rahul" / "Paid Rahul 500"
  // - "Sent 1000 to Suresh"
  // - "Transferred 1000 to Suresh"
  // - "Rahul borrowed 500 from me"
  const gavePatterns = [
    // "I gave <Name> <amount>" / "Gave <Name> <amount>"
    /(?:i\s+)?(?:gave|lent)\s+([a-zA-Z]+)\s+(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i,
    // "I gave <amount> to <Name>" / "Gave <amount> to <Name>"
    /(?:i\s+)?(?:gave|lent|paid|sent|transferred)\s+(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)\s+to\s+([a-zA-Z]+)/i,
    // "Paid <Name> <amount>"
    /(?:i\s+)?paid\s+([a-zA-Z]+)\s+(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i,
    // "<Name> borrowed <amount> from me"
    /([a-zA-Z]+)\s+borrowed\s+(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)\s+from\s+me/i,
  ];

  for (const pat of gavePatterns) {
    const match = text.match(pat);
    if (match) {
      let nameCandidate = '';
      let amtCandidate = 0;

      // Check which group is name and which is amount
      if (isNaN(Number(match[1].replace(/,/g, '')))) {
        nameCandidate = match[1];
        amtCandidate = parseFloat(match[2].replace(/,/g, ''));
      } else {
        amtCandidate = parseFloat(match[1].replace(/,/g, ''));
        nameCandidate = match[2];
      }

      const lowerName = nameCandidate.toLowerCase();
      if (!NON_NAME_WORDS.has(lowerName) && amtCandidate > 0) {
        return {
          type: 'TRANSACTION',
          personName: capitalizeName(nameCandidate),
          direction: 'GAVE',
          amount: amtCandidate,
          dateStr,
          description,
        };
      }
    }
  }

  // 3. DIRECTION: USER RECEIVES MONEY BACK FROM PERSON
  // Examples:
  // - "Rahul paid me back 1000"
  // - "Rahul paid back 1000"
  // - "Rahul returned 1000"
  // - "Rahul gave me back 1000" / "Rahul gave me 1000"
  // - "Rahul sent me 1000"
  // - "Received 1000 from Rahul"
  // - "Got 1000 from Rahul"
  // - "I received 1000 from Priya"
  // - "I borrowed 500 from Amit" (User receives 500 from Amit)
  // - "Amit lent me 500" (Amit gives to user, user receives)
  const receivedPatterns = [
    // "<Name> paid me back <amount>" / "<Name> paid back <amount>" / "<Name> paid me <amount>"
    /([a-zA-Z]+)\s+paid\s+(?:me\s+)?(?:back\s+)?(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i,
    // "<Name> returned [my] <amount>"
    /([a-zA-Z]+)\s+returned\s+(?:my\s+)?(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i,
    // "<Name> gave me [back] <amount>" / "<Name> sent me <amount>"
    /([a-zA-Z]+)\s+(?:gave|sent)\s+me\s+(?:back\s+)?(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i,
    // "Received <amount> [back] from <Name>" / "Got <amount> [back] from <Name>"
    /(?:i\s+)?(?:received|got|collected)\s+(?:back\s+)?(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)\s+(?:back\s+)?from\s+([a-zA-Z]+)/i,
    // "I borrowed <amount> from <Name>"
    /(?:i\s+)?borrowed\s+(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)\s+from\s+([a-zA-Z]+)/i,
    // "<Name> lent me <amount>"
    /([a-zA-Z]+)\s+lent\s+me\s+(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i,
  ];

  for (const pat of receivedPatterns) {
    const match = text.match(pat);
    if (match) {
      let nameCandidate = '';
      let amtCandidate = 0;

      if (isNaN(Number(match[1].replace(/,/g, '')))) {
        nameCandidate = match[1];
        amtCandidate = parseFloat(match[2].replace(/,/g, ''));
      } else {
        amtCandidate = parseFloat(match[1].replace(/,/g, ''));
        nameCandidate = match[2];
      }

      const lowerName = nameCandidate.toLowerCase();
      if (!NON_NAME_WORDS.has(lowerName) && amtCandidate > 0) {
        return {
          type: 'TRANSACTION',
          personName: capitalizeName(nameCandidate),
          direction: 'RECEIVED',
          amount: amtCandidate,
          dateStr,
          description,
        };
      }
    }
  }

  // 4. CHECK FOR AMBIGUOUS DIRECTION:
  // e.g. "Rahul 500", "500 Rahul", "with Rahul 500"
  const ambiguousMatch = text.match(/^(?:with\s+)?([a-zA-Z]+)\s+(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)$/i) ||
                         text.match(/^(?:[₹$€£]|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)\s+(?:with\s+|for\s+)?([a-zA-Z]+)$/i);
  if (ambiguousMatch) {
    let nameCandidate = isNaN(Number(ambiguousMatch[1])) ? ambiguousMatch[1] : ambiguousMatch[2];
    let amtCandidate = extractAmount(text);
    if (nameCandidate && !NON_NAME_WORDS.has(nameCandidate.toLowerCase()) && amtCandidate) {
      const properName = capitalizeName(nameCandidate);
      return {
        type: 'AMBIGUOUS',
        clarificationQuestion: `Did you give ₹${amtCandidate} to ${properName}, or did you receive ₹${amtCandidate} back from ${properName}?`,
      };
    }
  }

  // 5. CHECK FOR MISSING AMOUNT:
  // e.g. "I gave Rahul money", "Rahul paid me back"
  const missingAmtGave = text.match(/(?:i\s+)?(?:gave|lent)\s+([a-zA-Z]+)(?:\s+(?:money|cash|bucks))?$/i);
  if (missingAmtGave && missingAmtGave[1] && !NON_NAME_WORDS.has(missingAmtGave[1].toLowerCase())) {
    const properName = capitalizeName(missingAmtGave[1]);
    return {
      type: 'AMBIGUOUS',
      clarificationQuestion: `How much money did you give to ${properName}?`,
    };
  }

  const missingAmtRecv = text.match(/([a-zA-Z]+)\s+paid\s+(?:me\s+)?back$/i);
  if (missingAmtRecv && missingAmtRecv[1] && !NON_NAME_WORDS.has(missingAmtRecv[1].toLowerCase())) {
    const properName = capitalizeName(missingAmtRecv[1]);
    return {
      type: 'AMBIGUOUS',
      clarificationQuestion: `How much did ${properName} pay back?`,
    };
  }

  return null;
}

/**
 * Calculates running totals for a peer ledger
 */
export function calculatePeerLedgerTotals(peer: PeerBalance | { items?: PeerExpenseItem[]; amount?: number; type?: PeerBalanceType }): {
  totalGiven: number;
  totalReceived: number;
  pending: number;
} {
  const items = peer.items || [];
  let given = 0;
  let received = 0;

  if (items.length > 0) {
    for (const it of items) {
      const amt = Math.abs(it.amount || 0);
      if (it.direction === 'RECEIVED') {
        received += amt;
      } else if (it.direction === 'GAVE') {
        given += amt;
      } else {
        // Fallback for legacy items without direction
        if (peer.type === 'I_OWE') {
          received += amt;
        } else {
          given += amt;
        }
      }
    }
  } else {
    // If no items, fallback to peer amount & type
    const amt = Math.abs(peer.amount || 0);
    if (peer.type === 'I_OWE') {
      received = amt;
    } else {
      given = amt;
    }
  }

  given = Math.round(given * 100) / 100;
  received = Math.round(received * 100) / 100;
  const pending = Math.round((given - received) * 100) / 100;

  return { totalGiven: given, totalReceived: received, pending };
}

/**
 * Formats a person's ledger / profile EXACTLY according to the specification:
 *
 * [Name]
 * You gave: ₹[total given]
 * Received back: ₹[total received back]
 * Pending: ₹[pending amount]  (or "Pending: -₹[amount] (you owe [Name])" if negative)
 *
 * Transaction History:
 * [date] — ₹[amount] — [Gave/Received] — [description if provided]
 * ... (chronological order, oldest first)
 */
export function formatPeerLedgerProfile(personName: string, peer: PeerBalance | null): string {
  const name = capitalizeName(personName);

  if (!peer || !peer.items || peer.items.length === 0) {
    return `No transactions found for ${name}. Would you like to log one?`;
  }

  const { totalGiven, totalReceived, pending } = calculatePeerLedgerTotals(peer);

  // Format pending string
  let pendingStr = `Pending: ₹${pending}`;
  if (pending < 0) {
    pendingStr = `Pending: -₹${Math.abs(pending)} (you owe ${name})`;
  }

  // Sort items in chronological order, oldest first
  const sortedItems = [...peer.items].sort((a, b) => {
    const timeA = a.date || (a.dateStr ? new Date(a.dateStr).getTime() : 0);
    const timeB = b.date || (b.dateStr ? new Date(b.dateStr).getTime() : 0);
    return timeA - timeB;
  });

  const historyLines = sortedItems.map((it) => {
    const dStr = it.dateStr || (it.date ? new Date(it.date).toISOString().split('T')[0] : getTodayIsoDate());
    const directionWord = it.direction === 'RECEIVED' ? 'Received' : 'Gave';
    const desc = it.description ? it.description.trim() : '';

    if (desc) {
      return `${dStr} — ₹${it.amount} — ${directionWord} — ${desc}`;
    }
    return `${dStr} — ₹${it.amount} — ${directionWord}`;
  });

  return `${name}
You gave: ₹${totalGiven}
Received back: ₹${totalReceived}
${pendingStr}

Transaction History:
${historyLines.join('\n')}`;
}

/**
 * Applies a new transaction to the peer ledger list (immutably).
 * Returns the updated peer and the updated array of all peers.
 */
export function applyPeerTransaction(
  currentPeers: PeerBalance[],
  tx: ParsedPeerTx
): { updatedPeer: PeerBalance; allPeers: PeerBalance[] } {
  const normName = tx.personName.trim().toLowerCase();
  const existingIndex = currentPeers.findIndex((p) => p.name.trim().toLowerCase() === normName);

  const newItem: PeerExpenseItem = {
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    description: tx.description,
    amount: tx.amount,
    date: Date.now(),
    dateStr: tx.dateStr,
    direction: tx.direction,
  };

  let updatedPeer: PeerBalance;

  if (existingIndex >= 0) {
    const target = currentPeers[existingIndex];
    const existingItems = target.items || [];
    const newItems = [...existingItems, newItem];
    const totals = calculatePeerLedgerTotals({ items: newItems });

    const newType: PeerBalanceType = totals.pending >= 0 ? 'OWED_TO_YOU' : 'I_OWE';
    updatedPeer = {
      ...target,
      name: tx.personName,
      type: newType,
      amount: Math.abs(totals.pending),
      totalGiven: totals.totalGiven,
      totalReceived: totals.totalReceived,
      updatedAt: Date.now(),
      items: newItems,
    };

    const nextPeers = [...currentPeers];
    nextPeers[existingIndex] = updatedPeer;
    return { updatedPeer, allPeers: nextPeers };
  } else {
    const isGave = tx.direction === 'GAVE';
    const totalGiven = isGave ? tx.amount : 0;
    const totalReceived = isGave ? 0 : tx.amount;
    const pending = totalGiven - totalReceived;

    updatedPeer = {
      id: `peer-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: tx.personName,
      type: pending >= 0 ? 'OWED_TO_YOU' : 'I_OWE',
      amount: Math.abs(pending),
      totalGiven,
      totalReceived,
      note: tx.description || (isGave ? 'Money given' : 'Money received'),
      updatedAt: Date.now(),
      items: [newItem],
    };

    return { updatedPeer, allPeers: [updatedPeer, ...currentPeers] };
  }
}
