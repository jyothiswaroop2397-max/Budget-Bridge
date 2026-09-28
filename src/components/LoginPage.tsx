import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Send,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../lib/firebase.js';
import { BudgetBridgeAppIcon } from './BudgetBridgeAppIcon.js';
import { useTheme } from '../context/ThemeContext.js';
import { useToast } from '../hooks/useToast.js';
import { UserProfile } from '../types.js';
import { getDefaultAvatar } from '../utils/avatar.js';

interface LoginPageProps {
  isOpen?: boolean;
  onClose?: () => void;
  currentUser?: UserProfile;
  onLoginSuccess: (user: UserProfile, isNewUser?: boolean) => void;
  onContinueAsGuest?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  isOpen = true,
  onClose,
  currentUser,
  onLoginSuccess,
  onContinueAsGuest,
}) => {
  const { theme } = useTheme();
  const { showToast } = useToast();

  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState(currentUser?.name && currentUser.name !== 'Guest' ? currentUser.name : '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Email verification state screen
  const [verificationPendingEmail, setVerificationPendingEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Countdown timer for resend rate-limiting
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const getFriendlyErrorMessage = (error: any): string => {
    const code = error?.code || '';
    switch (code) {
      case 'auth/invalid-email':
        return 'Invalid email address format. Please enter a valid email.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password. Please verify your credentials or sign up.';
      case 'auth/email-already-in-use':
        return 'An account with this email address already exists. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters.';
      case 'auth/too-many-requests':
        return 'Access temporarily blocked due to many failed attempts. Please try again later or reset your password.';
      case 'auth/network-request-failed':
        return 'Network connection failed. Please check your internet connection.';
      default:
        return error?.message || 'Authentication error. Please try again.';
    }
  };

  const validateForm = () => {
    setErrorMsg(null);
    if (isSignUp && !name.trim()) {
      setErrorMsg('Please enter your full name or nickname.');
      return false;
    }
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address (e.g. name@domain.com).');
      return false;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return false;
    }
    return true;
  };

  const handleCreateAccount = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Update Firebase Auth user displayName
      const cleanName = name.trim() || 'Budget User';
      await updateProfile(user, {
        displayName: cleanName,
      });

      // Immediately send verification email
      await sendEmailVerification(user);

      // Sign the user out immediately so unverified accounts cannot browse
      await signOut(auth);

      setVerificationPendingEmail(user.email || email.trim());
      setResendCooldown(60); // 60 seconds rate limit
      showToast('Verification email sent! Please check your inbox.', 'success');
    } catch (err: any) {
      console.error('Sign up error:', err);
      setErrorMsg(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // 3. On Sign In, check that email is verified
      if (!user.emailVerified) {
        // Sign user out immediately
        await signOut(auth);
        setVerificationPendingEmail(user.email || email.trim());
        setErrorMsg('Please verify your email address before signing in.');
        showToast('Email not verified. Verification link needed.', 'error');
        return;
      }

      // Email is verified! Proceed to login success
      const displayName = user.displayName || name.trim() || email.split('@')[0];
      const avatar = user.photoURL || getDefaultAvatar(displayName);

      const profile: UserProfile = {
        uid: user.uid,
        name: displayName,
        email: user.email || email.trim(),
        avatarUrl: avatar,
        isLoggedIn: true,
        emailVerified: true,
      };

      showToast(`Welcome back, ${displayName}!`, 'success');
      onLoginSuccess(profile, false);
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Sign in error:', err);
      setErrorMsg(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (isSignUp) {
      handleCreateAccount();
    } else {
      handleSignIn();
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMsg(null);

    try {
      if (!password) {
        setErrorMsg('Please enter your password above to verify and re-send the confirmation link.');
        setIsResending(false);
        return;
      }

      // Temporarily authenticate to resend verification email then sign out
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (cred.user.emailVerified) {
        showToast('Your email is already verified! You can now sign in.', 'success');
        setVerificationPendingEmail(null);
        await signOut(auth);
        setIsResending(false);
        return;
      }

      await sendEmailVerification(cred.user);
      await signOut(auth);

      setResendCooldown(60);
      showToast('A fresh verification link has been sent to your email.', 'success');
    } catch (err: any) {
      console.error('Resend verification error:', err);
      setErrorMsg(getFriendlyErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address in the field above to reset your password.');
      return;
    }
    setErrorMsg(null);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      showToast(`Password reset link sent to ${cleanEmail}. Check your inbox!`, 'success');
    } catch (err: any) {
      setErrorMsg(getFriendlyErrorMessage(err));
    }
  };

  return (
    <div
      id="budget-bridge-login-overlay"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="login-card-container"
        style={{
          backgroundColor: theme.isDark ? '#0B1120' : '#FFFFFF',
          borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)',
        }}
        className="w-full max-w-md rounded-[28px] border shadow-2xl p-6 sm:p-7 relative my-auto space-y-5"
      >
        {/* Close Button if opened as modal */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close login dialog"
            className={`absolute top-4 right-4 p-2 rounded-full transition-colors cursor-pointer ${
              theme.isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center space-y-2 pt-1">
          <div className="relative inline-block mx-auto">
            <div
              style={{ backgroundColor: `${theme.accentColor}30` }}
              className="absolute -inset-2 rounded-2xl blur-lg pointer-events-none"
            />
            <BudgetBridgeAppIcon size="lg" className="ring-2 ring-emerald-500/40 shadow-xl relative" />
          </div>

          <div>
            <h1
              className={`text-xl sm:text-2xl font-black font-display tracking-tight ${
                theme.isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {verificationPendingEmail
                ? 'Verify Your Email'
                : isSignUp
                ? 'Create your Account'
                : 'Sign in to Budget Bridge'}
            </h1>
            <p className={`text-xs mt-1 ${theme.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {verificationPendingEmail
                ? `We sent a confirmation link to ${verificationPendingEmail}`
                : isSignUp
                ? 'Create an account to safeguard your budgets and personal ledgers'
                : 'Manage your personal finances, SMS tracking & peer ledgers'}
            </p>
          </div>
        </div>

        {/* VERIFICATION PENDING SCREEN */}
        {verificationPendingEmail ? (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
              <Mail className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className={`text-xs sm:text-sm font-semibold ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                Check your inbox
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                We sent a confirmation link to{' '}
                <span className="text-emerald-400 font-semibold">{verificationPendingEmail}</span>. Please click the link
                in that email to verify your address, then come back here to sign in.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2.5 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="leading-tight">{errorMsg}</span>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setVerificationPendingEmail(null);
                  setIsSignUp(false);
                }}
                style={{ backgroundColor: theme.accentColor }}
                className="w-full py-3 px-5 rounded-2xl font-black text-sm tracking-wide text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:brightness-105 active:scale-98 transition-all cursor-pointer"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              <button
                type="button"
                disabled={resendCooldown > 0 || isResending}
                onClick={handleResendVerification}
                className={`w-full py-2.5 px-4 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                  theme.isDark
                    ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                <span>
                  {resendCooldown > 0
                    ? `Resend available in ${resendCooldown}s`
                    : isResending
                    ? 'Sending...'
                    : 'Resend verification email'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Mode Switcher Tabs */}
            <div
              style={{
                backgroundColor: theme.isDark ? '#060B14' : 'rgba(241, 245, 249, 0.9)',
                borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(226, 232, 240, 0.8)',
              }}
              className="flex p-1 rounded-2xl border"
            >
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  !isSignUp
                    ? theme.isDark
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  isSignUp
                    ? theme.isDark
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Alert */}
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2.5 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="leading-tight">{errorMsg}</span>
              </div>
            )}

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Full Name Field (Sign Up Only) */}
              {isSignUp && (
                <div className="space-y-1">
                  <label
                    className={`text-[11px] font-bold uppercase tracking-wider block ${
                      theme.isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    Full Name or Nickname
                  </label>
                  <div className="relative">
                    <User
                      className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                        theme.isDark ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Swaroop Kumar"
                      maxLength={40}
                      className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium outline-none transition-colors ${
                        theme.isDark
                          ? 'bg-slate-900/90 border-slate-700/80 text-white focus:border-emerald-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div className="space-y-1">
                <label
                  className={`text-[11px] font-bold uppercase tracking-wider block ${
                    theme.isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                      theme.isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium outline-none transition-colors ${
                      theme.isDark
                        ? 'bg-slate-900/90 border-slate-700/80 text-white focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    className={`text-[11px] font-bold uppercase tracking-wider block ${
                      theme.isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    Password
                  </label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className={`text-[10px] font-semibold hover:underline ${theme.accentText} cursor-pointer`}
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock
                    className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                      theme.isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm font-medium outline-none transition-colors ${
                      theme.isDark
                        ? 'bg-slate-900/90 border-slate-700/80 text-white focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer p-1`}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                id="login-submit-btn"
                type="submit"
                disabled={isLoading}
                style={{
                  backgroundColor: theme.accentColor,
                }}
                className="w-full py-3 px-5 rounded-2xl font-black text-sm tracking-wide text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:brightness-105 active:scale-98 transition-all cursor-pointer disabled:opacity-60 mt-1"
              >
                <span>{isLoading ? 'Verifying with Firebase...' : isSignUp ? 'Create Free Account' : 'Sign In'}</span>
                {!isLoading && <ArrowRight className="w-4 h-4 stroke-[2.5]" />}
              </button>
            </form>
          </>
        )}

        {/* Continue as Guest option */}
        {onContinueAsGuest && (
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onContinueAsGuest}
              className={`text-xs font-semibold hover:underline cursor-pointer ${
                theme.isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Continue without signing in (Guest Mode) →
            </button>
          </div>
        )}

        {/* Security and privacy note */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 pt-1">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>Real Firebase Auth with Email Verification</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
