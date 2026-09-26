import { Dispatch, SetStateAction } from 'react';
import { AppState, UserProfile } from '../types.js';
import { setSmsPermission as storeSmsPermission } from '../utils/androidBridge.js';
import {
  DEFAULT_STATE,
  INITIAL_DEMO_PEER_BALANCES,
  INITIAL_DEMO_TRANSACTIONS,
} from './usePersistedAppState.js';
import { getTodayDateString } from '../utils/formatters.js';
import { useToast } from './useToast.js';

export function useBudgetSettings(setState: Dispatch<SetStateAction<AppState>>) {
  const { showToast } = useToast();

  // Update user profile helper
  const handleUpdateUserProfile = (newProfile: UserProfile) => {
    setState((prev) => ({
      ...prev,
      userProfile: newProfile,
    }));
    showToast('Profile updated successfully.', 'success');
  };

  // Update budget settings
  const handleUpdateBudget = (caps: { monthlyCap: number; dailyLimit: number }) => {
    setState((prev) => ({
      ...prev,
      monthlyCap: caps.monthlyCap,
      dailyLimit: caps.dailyLimit,
    }));
    showToast('Budget limits updated.', 'success');
  };

  // Update currency
  const handleUpdateCurrency = (newCurrency: string) => {
    setState((prev) => ({
      ...prev,
      currency: newCurrency,
    }));
    showToast(`Currency changed to ${newCurrency}.`, 'info');
  };

  // Toggle SMS permission
  const handleToggleSmsPermission = (granted: boolean) => {
    storeSmsPermission(granted);
    setState((prev) => ({
      ...prev,
      smsPermissionGranted: granted,
    }));
    showToast(
      granted
        ? 'Background SMS auto-verification activated.'
        : 'Background SMS verification disabled.',
      'info'
    );
  };

  // Reset demo data
  const handleResetData = () => {
    setState({
      monthlyCap: DEFAULT_STATE.monthlyCap,
      dailyLimit: DEFAULT_STATE.dailyLimit,
      spentToday: DEFAULT_STATE.spentToday,
      currency: DEFAULT_STATE.currency,
      transactions: INITIAL_DEMO_TRANSACTIONS,
      peerBalances: INITIAL_DEMO_PEER_BALANCES,
      savingsEntries: [],
      lastActiveDate: getTodayDateString(),
      smsPermissionGranted: true,
      silentVerificationActive: true,
      userProfile: DEFAULT_STATE.userProfile,
    });
    showToast('All transaction and debt data reset to defaults.', 'info');
  };

  return {
    handleUpdateUserProfile,
    handleUpdateBudget,
    handleUpdateCurrency,
    handleToggleSmsPermission,
    handleResetData,
  };
}

