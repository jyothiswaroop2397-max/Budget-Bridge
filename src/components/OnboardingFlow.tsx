import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { BudgetBridgeAppIcon } from './BudgetBridgeAppIcon.js';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number>(3);

  // Screen 1 Auto-advance timer (auto advances to Screen 2 after ~3.5 seconds)
  useEffect(() => {
    if (currentStep !== 1) return;

    const interval = setInterval(() => {
      setAutoAdvanceCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCurrentStep(2);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div
      id="budget-bridge-onboarding-container"
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-between bg-[#0F172A] text-white select-none overflow-hidden"
    >
      {/* 1. TOP BAR: Skip Link (Screens 2, 3, 4) */}
      <div className="w-full max-w-md px-6 pt-6 sm:pt-8 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2">
          {currentStep > 1 && (
            <div className="flex items-center gap-1.5 opacity-80">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400 font-mono">
                {currentStep} of 4
              </span>
            </div>
          )}
        </div>

        {currentStep > 1 && (
          <button
            id="onboarding-skip-btn"
            onClick={handleSkip}
            className="text-xs font-semibold tracking-wide text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/10 active:scale-95 cursor-pointer"
          >
            Skip
          </button>
        )}
      </div>

      {/* 2. CENTRAL CARD: Illustrated Scene + Story Content */}
      <div className="w-full max-w-md px-5 sm:px-6 flex-1 flex flex-col items-center justify-center min-h-0 py-2">
        {/* SHARED ILLUSTRATED SCENE (SVG / CSS) */}
        <div
          id="onboarding-illustration-stage"
          onClick={() => currentStep === 1 && setCurrentStep(2)}
          className={`w-full aspect-[16/10] max-h-[260px] rounded-3xl overflow-hidden relative shadow-2xl shadow-[#0F766E]/20 border border-white/10 mb-6 sm:mb-8 transition-all duration-500 ${
            currentStep === 1 ? 'cursor-pointer hover:border-emerald-500/40' : ''
          }`}
          style={{
            background: 'linear-gradient(180deg, #070D18 0%, #0F172A 50%, #0F766E 100%)',
          }}
        >
          <svg
            viewBox="0 0 400 240"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Sky Ambient Gradient */}
              <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#070D18" />
                <stop offset="45%" stopColor="#0F172A" />
                <stop offset="78%" stopColor="#0F766E" />
                <stop offset="100%" stopColor="#134E4A" />
              </linearGradient>

              {/* Water Reflection Gradient */}
              <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0F766E" stopOpacity="0.85" />
                <stop offset="35%" stopColor="#0B3E3B" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#070D18" stopOpacity="0.95" />
              </linearGradient>

              {/* Green Bridge Gradient */}
              <linearGradient id="bridgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="30%" stopColor="#10B981" />
                <stop offset="70%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>

              {/* Sun Glow Filter */}
              <filter id="sunGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="14" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* SKY BACKGROUND */}
            <rect width="400" height="150" fill="url(#skyGrad)" />

            {/* TWINKLING STARS IN DEEP SKY */}
            <circle cx="45" cy="25" r="1" fill="#FFFFFF" opacity="0.6" />
            <circle cx="95" cy="40" r="1.5" fill="#FDE68A" opacity="0.7" />
            <circle cx="160" cy="20" r="1" fill="#FFFFFF" opacity="0.5" />
            <circle cx="285" cy="30" r="1.2" fill="#FDE68A" opacity="0.8" />
            <circle cx="340" cy="18" r="1" fill="#FFFFFF" opacity="0.5" />
            <circle cx="365" cy="48" r="1.5" fill="#FDE68A" opacity="0.6" />

            {/* GLOWING GOLD CIRCLE (SUN/MOON) LOW ON THE HORIZON */}
            <g id="horizon-sun">
              {/* Outer soft ambient aura */}
              <circle cx="200" cy="138" r="42" fill="#FBBF24" opacity="0.25" filter="url(#sunGlow)" />
              {/* Core Sun Disc */}
              <circle cx="200" cy="138" r="26" fill="#FBBF24" />
              <circle cx="200" cy="138" r="22" fill="#FDE68A" opacity="0.85" />
            </g>

            {/* REFLECTIVE WATER GRADIENT BELOW HORIZON (y=146 to 240) */}
            <rect y="146" width="400" height="94" fill="url(#waterGrad)" />

            {/* Shimmering Water Reflection Lines */}
            <line x1="170" y1="154" x2="230" y2="154" stroke="#FDE68A" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
            <line x1="155" y1="162" x2="245" y2="162" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            <line x1="140" y1="172" x2="260" y2="172" stroke="#FBBF24" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
            <line x1="165" y1="184" x2="235" y2="184" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            <line x1="180" y1="196" x2="220" y2="196" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />

            {/* GREEN GRADIENT BRIDGE ARCH SILHOUETTE CROSSING THE SCENE */}
            <g id="bridge-structure">
              {/* Main horizontal deck span */}
              <path
                d="M 0 152 Q 200 136 400 152 L 400 162 Q 200 146 0 162 Z"
                fill="url(#bridgeGrad)"
              />
              {/* Lower arch curve crossing above the water */}
              <path
                d="M 20 200 Q 200 138 380 200 L 365 200 Q 200 148 35 200 Z"
                fill="#34D399"
                opacity="0.85"
              />
              {/* Vertical bridge suspension piers */}
              <line x1="90" y1="150" x2="90" y2="186" stroke="#6EE7B7" strokeWidth="2" opacity="0.7" />
              <line x1="140" y1="144" x2="140" y2="164" stroke="#6EE7B7" strokeWidth="2" opacity="0.7" />
              <line x1="260" y1="144" x2="260" y2="164" stroke="#6EE7B7" strokeWidth="2" opacity="0.7" />
              <line x1="310" y1="150" x2="310" y2="186" stroke="#6EE7B7" strokeWidth="2" opacity="0.7" />
            </g>

            {/* ============================================================ */}
            {/* SCREEN-SPECIFIC SCENE VARIATIONS */}
            {/* ============================================================ */}

            {/* SCREEN 1: Bridge + Coin Logo Icon Centered */}
            {currentStep === 1 && (
              <g id="screen-1-details" className="animate-fade-in">
                {/* Large floating golden coin with rupee on bridge apex */}
                <circle cx="200" cy="116" r="24" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2" filter="url(#sunGlow)" />
                <circle cx="200" cy="116" r="20" fill="#FDE68A" opacity="0.3" />
                {/* Rupee Symbol */}
                <text
                  x="200"
                  y="122"
                  textAnchor="middle"
                  fill="#0F172A"
                  fontSize="22"
                  fontWeight="900"
                  fontFamily="'Plus Jakarta Sans', Outfit, sans-serif"
                >
                  ₹
                </text>
                {/* Connecting light beams */}
                <line x1="200" y1="140" x2="200" y2="146" stroke="#6EE7B7" strokeWidth="3" strokeLinecap="round" />
              </g>
            )}

            {/* SCREEN 2: Silhouette figure with backpack walking toward glowing horizon */}
            {currentStep === 2 && (
              <g id="screen-2-figure" className="animate-fade-in">
                {/* Walking figure on the bridge deck heading towards center/horizon */}
                <g transform="translate(192, 116)">
                  {/* Head */}
                  <circle cx="10" cy="5" r="4.5" fill="#0F172A" stroke="#34D399" strokeWidth="0.8" />
                  {/* Torso & Jacket */}
                  <path d="M 6 10 L 14 10 L 13 22 L 7 22 Z" fill="#0F172A" />
                  {/* Backpack */}
                  <rect x="2" y="11" width="5" height="9" rx="2.5" fill="#10B981" stroke="#34D399" strokeWidth="0.8" />
                  {/* Walking Legs */}
                  <line x1="8" y1="22" x2="5" y2="31" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" />
                  <line x1="12" y1="22" x2="16" y2="30" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" />
                  {/* Glowing footprint shimmer on bridge */}
                  <ellipse cx="10" cy="32" rx="7" ry="2" fill="#FBBF24" opacity="0.6" />
                </g>
              </g>
            )}

            {/* SCREEN 3: Two person silhouettes on either side of gold coin above bridge */}
            {currentStep === 3 && (
              <g id="screen-3-friends" className="animate-fade-in">
                {/* Left Person Silhouette */}
                <g transform="translate(132, 115)">
                  <circle cx="8" cy="6" r="5" fill="#0F172A" stroke="#34D399" strokeWidth="0.8" />
                  <path d="M 1 27 C 1 17 4 13 8 13 C 12 13 15 17 15 27 Z" fill="#0F172A" />
                </g>

                {/* Central Floating Gold Coin with Rupee */}
                <g transform="translate(200, 110)">
                  <circle cx="0" cy="0" r="15" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2" filter="url(#sunGlow)" />
                  <text
                    x="0"
                    y="5"
                    textAnchor="middle"
                    fill="#0F172A"
                    fontSize="15"
                    fontWeight="900"
                    fontFamily="'Plus Jakarta Sans', Outfit, sans-serif"
                  >
                    ₹
                  </text>
                  {/* Subtle exchange arrows */}
                  <path d="M -24 -2 L -20 -6 L -20 -3 L -12 -3 L -12 -1 L -20 -1 L -20 2 Z" fill="#6EE7B7" />
                  <path d="M 24 2 L 20 6 L 20 3 L 12 3 L 12 1 L 20 1 L 20 -2 Z" fill="#6EE7B7" />
                </g>

                {/* Right Person Silhouette */}
                <g transform="translate(252, 115)">
                  <circle cx="8" cy="6" r="5" fill="#0F172A" stroke="#34D399" strokeWidth="0.8" />
                  <path d="M 1 27 C 1 17 4 13 8 13 C 12 13 15 17 15 27 Z" fill="#0F172A" />
                </g>
              </g>
            )}

            {/* SCREEN 4: Small City Skyline Silhouette on Far Side (suggesting arrival) */}
            {currentStep === 4 && (
              <g id="screen-4-skyline" className="animate-fade-in">
                {/* Distant city silhouette on the right bank horizon */}
                <g fill="#0B2B28" opacity="0.95">
                  {/* Skyscraper 1 */}
                  <rect x="270" y="112" width="14" height="38" rx="1" />
                  {/* Skyscraper 2 with antenna */}
                  <rect x="288" y="98" width="18" height="52" rx="1" />
                  <line x1="297" y1="92" x2="297" y2="98" stroke="#34D399" strokeWidth="1.5" />
                  <circle cx="297" cy="91" r="1.5" fill="#FBBF24" />
                  {/* Building 3 */}
                  <rect x="310" y="118" width="16" height="32" rx="1" />
                  {/* Building 4 with spire */}
                  <rect x="330" y="104" width="20" height="46" rx="1" />
                  <polygon points="340,94 334,104 346,104" fill="#0B2B28" />
                  {/* Building 5 */}
                  <rect x="354" y="122" width="16" height="28" rx="1" />
                </g>

                {/* Glowing windows on distant buildings */}
                <circle cx="294" cy="106" r="1" fill="#FDE68A" opacity="0.9" />
                <circle cx="300" cy="106" r="1" fill="#FDE68A" opacity="0.9" />
                <circle cx="294" cy="116" r="1" fill="#FDE68A" opacity="0.9" />
                <circle cx="336" cy="112" r="1" fill="#FDE68A" opacity="0.9" />
                <circle cx="342" cy="112" r="1" fill="#FDE68A" opacity="0.9" />
                <circle cx="336" cy="120" r="1" fill="#FDE68A" opacity="0.9" />

                {/* Arrival Beacon Light */}
                <circle cx="297" cy="91" r="5" fill="#FBBF24" opacity="0.4" filter="url(#sunGlow)" />
              </g>
            )}
          </svg>
        </div>

        {/* ============================================================ */}
        {/* SCREEN 1: SPLASH / WELCOME */}
        {/* ============================================================ */}
        {currentStep === 1 && (
          <div
            id="onboarding-screen-1"
            className="w-full text-center space-y-4 animate-fade-in flex flex-col items-center"
            onClick={() => setCurrentStep(2)}
          >
            {/* Centered Bridge + Coin App Icon */}
            <div className="relative mb-1">
              <div className="absolute -inset-2 bg-emerald-500/20 rounded-2xl blur-lg pointer-events-none" />
              <BudgetBridgeAppIcon size="xl" className="ring-2 ring-emerald-400/40 shadow-xl" />
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-white">
              Budget <span className="text-[#10B981]">Bridge</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base font-medium text-slate-300">
              Connect Today. A Brighter Tomorrow.
            </p>

            {/* Tagline Row of 3 Items */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 pt-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 shadow-xs">
                <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
                <span className="text-xs font-semibold text-slate-200">Track</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 shadow-xs">
                <Users className="w-3.5 h-3.5 text-[#0F766E]" />
                <span className="text-xs font-semibold text-slate-200">Settle</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#FBBF24]" />
                <span className="text-xs font-semibold text-slate-200">Grow</span>
              </div>
            </div>

            {/* Auto-advance hint / tap to continue */}
            <div className="pt-4 text-slate-400 text-xs flex items-center gap-2 cursor-pointer">
              <span>Tap anywhere or wait {autoAdvanceCountdown}s to continue</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 2: TRACK YOUR MONEY */}
        {/* ============================================================ */}
        {currentStep === 2 && (
          <div id="onboarding-screen-2" className="w-full text-center space-y-3 animate-fade-in">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold tracking-wider uppercase mb-1">
              <TrendingUp className="w-3 h-3" />
              Smart Tracking
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              Track <span className="text-[#10B981]">Your Money</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xs mx-auto">
              Keep a clear view of your income, expenses, and savings — all in one place.
            </p>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 3: SETTLE WITH FRIENDS */}
        {/* ============================================================ */}
        {currentStep === 3 && (
          <div id="onboarding-screen-3" className="w-full text-center space-y-3 animate-fade-in">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F766E]/20 border border-[#0F766E]/50 text-teal-300 text-[11px] font-bold tracking-wider uppercase mb-1">
              <Users className="w-3 h-3" />
              Social Balances
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              Settle <span className="text-[#10B981]">With Friends</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xs mx-auto">
              Easily track who owes whom and settle up without the awkward conversations.
            </p>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 4: BUILD A BRIGHTER TOMORROW */}
        {/* ============================================================ */}
        {currentStep === 4 && (
          <div id="onboarding-screen-4" className="w-full text-center space-y-3 animate-fade-in">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold tracking-wider uppercase mb-1">
              <Sparkles className="w-3 h-3" />
              Financial Freedom
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              Build <span className="text-[#10B981]">A Brighter Tomorrow</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xs mx-auto">
              Make smarter choices today and cross the bridge to your financial goals.
            </p>
          </div>
        )}
      </div>

      {/* 3. BOTTOM BAR: Dot Pagination & Navigation Buttons */}
      <div className="w-full max-w-md px-6 pb-8 pt-4 flex flex-col items-center gap-5 z-20 shrink-0">
        {/* DOT PAGINATION (1 to 4) */}
        <div
          id="onboarding-pagination-dots"
          className="flex items-center justify-center gap-2.5"
          aria-label={`Step ${currentStep} of 4`}
        >
          {[1, 2, 3, 4].map((step) => {
            const isActive = currentStep === step;
            return (
              <button
                key={step}
                onClick={() => setCurrentStep(step)}
                aria-label={`Go to slide ${step}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  isActive
                    ? 'w-8 h-2.5 bg-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.7)]'
                    : 'w-2.5 h-2.5 bg-slate-700 hover:bg-slate-500'
                }`}
              />
            );
          })}
        </div>

        {/* ACTION BUTTONS (Screens 2, 3, 4) */}
        <div className="w-full min-h-[52px]">
          {currentStep === 1 ? (
            <button
              id="onboarding-step1-continue-btn"
              onClick={() => setCurrentStep(2)}
              className="w-full py-3.5 px-6 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-bold text-sm tracking-wide transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Explore Budget Bridge</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </button>
          ) : currentStep < 4 ? (
            <button
              id="onboarding-next-btn"
              onClick={handleNext}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#10B981] hover:bg-emerald-400 text-slate-950 font-extrabold text-base tracking-wide transition-all shadow-lg shadow-emerald-500/25 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          ) : (
            <button
              id="onboarding-get-started-btn"
              onClick={handleSkip}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#10B981] hover:bg-emerald-400 text-slate-950 font-extrabold text-base tracking-wide transition-all shadow-lg shadow-emerald-500/30 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Get Started</span>
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
