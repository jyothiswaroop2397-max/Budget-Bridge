import { useState, useEffect } from 'react';
import { AppState, PeerBalance, Transaction } from '../types.js';
import { SavingsEntry, INITIAL_DEMO_SAVINGS_ENTRIES } from '../types/savings.js';
import { getTodayDateString } from '../utils/formatters.js';
import { getDefaultAvatar, sanitizeAvatarUrl } from '../utils/avatar.js';
import { useToast } from './useToast.js';

export const STORAGE_KEY = 'moneytrace_app_state_v3';

export const INITIAL_DEMO_PEER_BALANCES: PeerBalance[] = [];

export const INITIAL_DEMO_TRANSACTIONS: Transaction[] = [];

export const DEFAULT_STATE: AppState = {
  monthlyCap: 0,
  dailyLimit: 0,
  spentToday: 0,
  currency: 'INR',
  transactions: INITIAL_DEMO_TRANSACTIONS,
  peerBalances: INITIAL_DEMO_PEER_BALANCES,
  savingsEntries: [],
  lastActiveDate: getTodayDateString(),
  smsPermissionGranted: true,
  silentVerificationActive: true,
  userProfile: {
    name: 'Guest',
    avatarUrl: getDefaultAvatar('Guest'),
  },
};

export const ensurePeerItems = (peer: PeerBalance): PeerBalance => {
  if (peer.items && peer.items.length > 0) return peer;
  return {
    ...peer,
    items: [
      {
        id: `item-${peer.id}-1`,
        description: peer.note || (peer.type === 'OWED_TO_YOU' ? 'Bill share' : 'Expense share'),
        amount: peer.amount,
        date: peer.updatedAt || Date.now(),
      },
    ],
  };
};

export const normalizeLoadedState = (savedJson: string | null): AppState => {
  if (!savedJson) return DEFAULT_STATE;
  try {
    const parsed = JSON.parse(savedJson);
    const rawPeers: PeerBalance[] = Array.isArray(parsed.peerBalances)
      ? parsed.peerBalances
      : INITIAL_DEMO_PEER_BALANCES;
    const normalizedPeers = rawPeers.map(ensurePeerItems).filter((p) => p && p.amount > 0);

    const rawTransactions: Transaction[] = Array.isArray(parsed.transactions)
      ? parsed.transactions
      : INITIAL_DEMO_TRANSACTIONS;
    // Purge any ₹0 or non-merchant/casual chat junk transactions created by past intent bugs
    const cleanTransactions = rawTransactions.filter((tx) => {
      if (!tx || typeof tx.amount !== 'number' || tx.amount <= 0) return false;
      const merchantLower = (tx.merchant || '').trim().toLowerCase();
      const junkWords = ['hi', 'hello', 'hey', 'good', 'test', 'ok', 'okay', 'yes', 'no', 'thanks', 'thank you', 'how are you'];
      if (junkWords.includes(merchantLower)) return false;
      return true;
    });

    return {
      monthlyCap: typeof parsed.monthlyCap === 'number' ? parsed.monthlyCap : DEFAULT_STATE.monthlyCap,
      dailyLimit: typeof parsed.dailyLimit === 'number' ? parsed.dailyLimit : DEFAULT_STATE.dailyLimit,
      spentToday: typeof parsed.spentToday === 'number' ? parsed.spentToday : DEFAULT_STATE.spentToday,
      currency: parsed.currency || DEFAULT_STATE.currency,
      transactions: cleanTransactions,
      peerBalances: normalizedPeers,
      lastActiveDate: parsed.lastActiveDate || getTodayDateString(),
      smsPermissionGranted: parsed.smsPermissionGranted ?? true,
      silentVerificationActive: true,
      userProfile: {
        name: (!parsed.userProfile?.name || parsed.userProfile.name === 'Guest Account')
          ? 'Guest'
          : parsed.userProfile.name,
        avatarUrl: sanitizeAvatarUrl(
          parsed.userProfile?.avatarUrl,
          (!parsed.userProfile?.name || parsed.userProfile.name === 'Guest Account')
            ? 'Guest'
            : parsed.userProfile.name
        ),
      },
      savingsEntries: Array.isArray(parsed.savingsEntries)
        ? parsed.savingsEntries
        : [],
    };
  } catch {
    return DEFAULT_STATE;
  }
};

export function usePersistedAppState() {
  const { showToast } = useToast();

  // Load persisted state or initial defaults
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return normalizeLoadedState(saved);
    } catch {
      return DEFAULT_STATE;
    }
  });

  // Server hydration effect (GET /api/state on mount)
  useEffect(() => {
    let isMounted = true;
    const hydrateFromServer = async () => {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const data = await res.json();
          if (data && isMounted) {
            const serverState = data.exists ? data.state : (!('exists' in data) ? data : null);
            if (serverState) {
              const normalized = normalizeLoadedState(JSON.stringify(serverState));
              setState(normalized);
            }
          }
        } else if (res.status !== 404) {
          console.warn('Failed to fetch state from server. Status:', res.status);
          showToast('Could not load remote state. Using local device data.', 'info');
        }
      } catch (err) {
        console.warn('Failed to fetch state from server:', err);
        showToast('Could not load remote state. Using local device data.', 'info');
      }
    };

    hydrateFromServer();
    return () => {
      isMounted = false;
    };
  }, [showToast]);

  // Debounced save effect (localStorage + PUT /api/state)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
      showToast('Failed to save local state to device storage.', 'error');
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state }),
        });
        if (!res.ok) {
          console.warn('Server state sync returned status:', res.status);
          showToast('Server sync failed. Saved to local storage.', 'info');
        }
      } catch (err) {
        console.warn('Failed to sync state to server:', err);
        showToast('Server sync unavailable. Working in offline mode.', 'info');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [state, showToast]);

  return { state, setState };
}
