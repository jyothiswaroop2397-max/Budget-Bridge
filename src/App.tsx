import React, { useState, useMemo, useEffect } from 'react';
import { NavigationHeader } from './components/NavigationHeader.js';
import { BottomNavBar } from './components/BottomNavBar.js';
import { PageOverview } from './components/PageOverview.js';
import { PageAnalytics } from './components/PageAnalytics.js';
import { PageSettings } from './components/PageSettings.js';
import { ManualAddModal } from './components/ManualAddModal.js';
import { AddPeerBalanceModal } from './components/AddPeerBalanceModal.js';
import { SettleUpModal } from './components/SettleUpModal.js';
import { UserProfileModal } from './components/UserProfileModal.js';
import { AiChatModal } from './components/AiChatModal.js';
import { CalendarMonthModal } from './components/CalendarMonthModal.js';
import { SplashScreen } from './components/SplashScreen.js';
import { OnboardingFlow } from './components/OnboardingFlow.js';
import { useTheme } from './context/ThemeContext.js';
import { Category, PeerBalance, PeerBalanceType, TransactionType } from './types.js';
import { getDefaultAvatar } from './utils/avatar.js';

// Custom Hooks
import {
  usePersistedAppState,
  INITIAL_DEMO_TRANSACTIONS,
  INITIAL_DEMO_PEER_BALANCES,
  DEFAULT_STATE,
} from './hooks/usePersistedAppState.js';
import { useTransactions } from './hooks/useTransactions.js';
import { usePeerBalances } from './hooks/usePeerBalances.js';
import { useSmsVerification } from './hooks/useSmsVerification.js';
import { useBudgetSettings } from './hooks/useBudgetSettings.js';
import { useDerivedFinancials } from './hooks/useDerivedFinancials.js';

export {
  INITIAL_DEMO_TRANSACTIONS,
  INITIAL_DEMO_PEER_BALANCES,
  DEFAULT_STATE,
};

export const App: React.FC = () => {
  const { theme } = useTheme();

  // 1. Core Persisted App State
  const { state, setState } = usePersistedAppState();

  // 2. Transactions & Operations Hook
  const { handleAddTransaction, handleUpdateTransaction, handleDeleteTransaction } =
    useTransactions(setState);

  // 3. Peer Debt Balances Hook
  const {
    handleAddPeerBalance,
    handleAddItemToPeer,
    handleRemoveItemFromPeer,
    handleConfirmSettle,
    handleSettlePeerBalance,
  } = usePeerBalances(setState);

  // 4. Silent Background SMS Processing & Android Native Bridge Hook
  const { handleSilentSmsVerification } = useSmsVerification(handleAddTransaction);

  // 5. Budget, Currency, SMS Permissions & Profile Settings Hook
  const {
    handleUpdateUserProfile,
    handleUpdateBudget,
    handleUpdateCurrency,
    handleToggleSmsPermission,
    handleResetData,
  } = useBudgetSettings(setState);

  // Selected month and year for calendar navigation & history browsing
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  // 6. Derived Financial Calculations, Budgets & Rollover Hook
  const {
    monthlyExpenditure,
    spentTodayCalculated,
    categoryBreakdown,
    totalOwedToYou,
    totalIOwe,
    budgetContext,
    isCurrentMonth,
  } = useDerivedFinancials(state, setState, selectedDate);

  // Handlers for month navigation
  const handlePreviousMonth = () => {
    setSelectedDate((prev) => {
      const y = prev.getFullYear();
      const m = prev.getMonth();
      return m === 0 ? new Date(y - 1, 11, 1) : new Date(y, m - 1, 1);
    });
  };

  const handleNextMonth = () => {
    setSelectedDate((prev) => {
      const y = prev.getFullYear();
      const m = prev.getMonth();
      return m === 11 ? new Date(y + 1, 0, 1) : new Date(y, m + 1, 1);
    });
  };

  const handleResetToCurrentMonth = () => {
    setSelectedDate(new Date());
  };

  // ----------------------------------------------------
  // Presentation & UI Modal State (Local to App Component)
  // ----------------------------------------------------
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageHistory, setPageHistory] = useState<number[]>([0]);

  // Navigate to page while tracking history stack
  const handleNavigatePage = (nextPage: number) => {
    if (nextPage === currentPage) return;
    setPageHistory((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === currentPage) {
        return prev;
      }
      return [...prev, currentPage];
    });
    setCurrentPage(nextPage);
  };

  // Back navigation: returns to the previous page visited
  const handleGoBack = () => {
    setPageHistory((prev) => {
      const historyCopy = [...prev];
      const previousPage = historyCopy.pop();
      if (previousPage !== undefined) {
        setCurrentPage(previousPage);
        return historyCopy.length > 0 ? historyCopy : [0];
      }
      setCurrentPage(0);
      return [0];
    });
  };

  const [selectedAnalyticsCategory, setSelectedAnalyticsCategory] = useState<string>('All');
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [manualAddDefaults, setManualAddDefaults] = useState<{
    type?: TransactionType | PeerBalanceType;
    category?: Category;
  }>({});
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isAddPeerModalOpen, setIsAddPeerModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [defaultPeerType, setDefaultPeerType] = useState<PeerBalanceType>('OWED_TO_YOU');
  const [settleTargetPeerId, setSettleTargetPeerId] = useState<string | null>(null);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Onboarding persistence flag: shown once on very first visit
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem('hasSeenOnboarding') === 'true' ||
        localStorage.getItem('budget_bridge_has_seen_onboarding') === 'true'
      );
    } catch {
      return false;
    }
  });

  const handleFinishOnboarding = () => {
    try {
      localStorage.setItem('hasSeenOnboarding', 'true');
      localStorage.setItem('budget_bridge_has_seen_onboarding', 'true');
    } catch {
      // Ignore
    }
    setHasSeenOnboarding(true);
    setShowSplash(false);
  };

  // ----------------------------------------------------
  // Navigation History & Android Back Button Integration
  // ----------------------------------------------------
  useEffect(() => {
    // Whenever currentPage changes to a non-zero page (Analytics or Settings),
    // push a browser history entry so there's an entry to go "back" through.
    if (currentPage !== 0) {
      if (!window.history.state || window.history.state.page !== currentPage) {
        window.history.pushState({ page: currentPage }, '', '');
      }
    }
  }, [currentPage]);

  useEffect(() => {
    // Popstate listener: when it fires and currentPage isn't 0, return to previous page.
    const handlePopState = () => {
      if (currentPage !== 0) {
        handleGoBack();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentPage]);

  // UI Helpers
  const handleOpenManualAdd = (options?: { type?: TransactionType | PeerBalanceType; category?: Category }) => {
    setManualAddDefaults(options || {});
    setIsManualAddOpen(true);
  };

  const handleOpenCategoryInAnalytics = (category: string) => {
    setSelectedAnalyticsCategory(category);
    handleNavigatePage(1);
  };

  const handleOpenAddPeerModal = (type: PeerBalanceType = 'OWED_TO_YOU') => {
    setDefaultPeerType(type);
    setIsAddPeerModalOpen(true);
  };

  const handleOpenSettleModal = (peer: PeerBalance) => {
    setSettleTargetPeerId(peer.id);
    setIsSettleModalOpen(true);
  };

  const settleTargetPeer = useMemo(() => {
    if (!settleTargetPeerId) return null;
    return state.peerBalances.find((p) => p.id === settleTargetPeerId) || null;
  }, [settleTargetPeerId, state.peerBalances]);

  // 7. First-visit Onboarding Flow: shown once on very first visit
  if (!hasSeenOnboarding) {
    return <OnboardingFlow onComplete={handleFinishOnboarding} />;
  }

  return (
    <div
      id="budget-bridge-app-viewport"
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: theme.bgRoot,
        color: theme.textPrimary,
      }}
      className={`flex flex-col font-sans select-none transition-colors duration-300 ${theme.bgGradient || ''}`}
    >
      {/* PINNED TOP NAVIGATION BAR */}
      <NavigationHeader
        currentPage={currentPage}
        onNavigateToPage={handleNavigatePage}
        onGoBack={handleGoBack}
        silentVerificationActive={state.silentVerificationActive}
        currency={state.currency}
        userProfile={state.userProfile}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        selectedDate={selectedDate}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
        onOpenCalendar={() => setIsCalendarModalOpen(true)}
      />

      {/* FLUID SCROLLABLE TAB ROUTER CONTAINER */}
      <main
        id="main-tab-view-container"
        className="flex-1 w-full pt-16 sm:pt-20 pb-32 sm:pb-36 px-3 sm:px-6 relative flex flex-col min-h-0"
      >
        {/* PAGE 1: OVERVIEW DASHBOARD */}
        {currentPage === 0 && (
          <PageOverview
            monthlyCap={state.monthlyCap}
            monthlyExpenditure={monthlyExpenditure}
            dailyLimit={state.dailyLimit}
            spentToday={spentTodayCalculated}
            currency={state.currency}
            categoryBreakdown={categoryBreakdown}
            transactions={state.transactions}
            peerBalances={state.peerBalances}
            totalOwedToYou={totalOwedToYou}
            totalIOwe={totalIOwe}
            onOpenAddPeerModal={handleOpenAddPeerModal}
            onSettlePeerBalance={handleSettlePeerBalance}
            onOpenSettleModal={handleOpenSettleModal}
            onAddItemToPeer={handleAddItemToPeer}
            onRemoveItemFromPeer={handleRemoveItemFromPeer}
            onNavigateToPage={handleNavigatePage}
            onSelectCategory={handleOpenCategoryInAnalytics}
            onUpdateTransaction={handleUpdateTransaction}
            onAddTransaction={(tx) =>
              handleAddTransaction({
                ...tx,
                source: 'quick_nl',
              })
            }
            onAddPeerBalance={handleAddPeerBalance}
            selectedDate={selectedDate}
            onResetToCurrentMonth={handleResetToCurrentMonth}
            onOpenCalendar={() => setIsCalendarModalOpen(true)}
          />
        )}

        {/* PAGE 2: ANALYTICS & TRANSACTION HISTORY */}
        {currentPage === 1 && (
          <PageAnalytics
            transactions={state.transactions}
            currency={state.currency}
            selectedCategory={selectedAnalyticsCategory}
            onSelectCategory={setSelectedAnalyticsCategory}
            onDeleteTransaction={handleDeleteTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onNavigateToPage={handleNavigatePage}
            onGoBack={handleGoBack}
          />
        )}

        {/* PAGE 3: BUDGET SETTINGS & BACKGROUND SMS VERIFIER */}
        {currentPage === 2 && (
          <PageSettings
            monthlyCap={state.monthlyCap}
            dailyLimit={state.dailyLimit}
            currency={state.currency}
            smsPermissionGranted={state.smsPermissionGranted}
            userProfile={state.userProfile}
            onUpdateUserProfile={handleUpdateUserProfile}
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
            onUpdateBudget={handleUpdateBudget}
            onUpdateCurrency={handleUpdateCurrency}
            onToggleSmsPermission={handleToggleSmsPermission}
            onSimulateIncomingSms={handleSilentSmsVerification}
            onResetData={handleResetData}
            onNavigateToPage={handleNavigatePage}
            onGoBack={handleGoBack}
          />
        )}
      </main>

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <BottomNavBar
        currentPage={currentPage}
        onNavigateToPage={handleNavigatePage}
        onOpenAdd={() => handleOpenManualAdd({ type: 'DEBIT' })}
        isAiChatOpen={isAiChatOpen}
        onToggleAiChat={() => setIsAiChatOpen((prev) => !prev)}
      />

      {/* BUDGET BRIDGE AI CHAT COPILOT MODAL */}
      <AiChatModal
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        userName={state.userProfile?.name || 'Guest'}
        userProfile={state.userProfile}
        budgetContext={budgetContext}
        onAddTransaction={(tx) =>
          handleAddTransaction({
            ...tx,
            source: 'ai_chat',
          })
        }
        onAddPeerBalance={handleAddPeerBalance}
      />

      {/* MANUAL TRANSACTION & PEER BALANCE MODAL */}
      <ManualAddModal
        isOpen={isManualAddOpen}
        onClose={() => setIsManualAddOpen(false)}
        currency={state.currency}
        initialType={manualAddDefaults.type}
        initialCategory={manualAddDefaults.category}
        existingPeers={state.peerBalances}
        onAddTransaction={(data) =>
          handleAddTransaction({
            ...data,
            source: 'manual',
          })
        }
        onAddPeerBalance={handleAddPeerBalance}
      />

      {/* ADD PEER BALANCE MODAL */}
      <AddPeerBalanceModal
        isOpen={isAddPeerModalOpen}
        onClose={() => setIsAddPeerModalOpen(false)}
        currency={state.currency}
        initialType={defaultPeerType}
        onAddPeerBalance={handleAddPeerBalance}
      />

      {/* SETTLE UP MODAL */}
      <SettleUpModal
        isOpen={isSettleModalOpen}
        onClose={() => {
          setIsSettleModalOpen(false);
          setSettleTargetPeerId(null);
        }}
        peer={settleTargetPeer}
        currency={state.currency}
        onConfirmSettle={handleConfirmSettle}
      />

      {/* USER PROFILE MODAL */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={
          state.userProfile || {
            name: 'Guest',
            avatarUrl: getDefaultAvatar('Guest'),
          }
        }
        onSaveProfile={handleUpdateUserProfile}
      />

      {/* CALENDAR & MONTH ARCHIVE MODAL */}
      <CalendarMonthModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={(newDate) => setSelectedDate(newDate)}
        transactions={state.transactions}
        currency={state.currency}
        monthlyCap={state.monthlyCap}
      />

      {/* FULL-SCREEN INTRO SPLASH SCREEN */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
    </div>
  );
};

export default App;
