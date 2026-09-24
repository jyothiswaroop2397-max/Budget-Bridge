import React, { useState, useEffect } from 'react';
import { BudgetBridgeAppIcon } from './BudgetBridgeAppIcon.js';

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [stage, setStage] = useState<'entering' | 'pulsing' | 'exiting' | 'hidden'>('entering');

  useEffect(() => {
    // 1. Stage: Entrance animation starts on mount (0 to 850ms)
    // 2. Stage: Switch to breathing pulse micro-interaction after entrance completes (~850ms)
    const pulseTimer = setTimeout(() => {
      setStage('pulsing');
    }, 850);

    // 3. Stage: Start exit transition at ~1.9 seconds total
    const exitTimer = setTimeout(() => {
      setStage('exiting');
    }, 1900);

    // 4. Stage: Completely hide/unmount overlay after exit transition completes (+500ms -> 2400ms)
    const finishTimer = setTimeout(() => {
      setStage('hidden');
      if (onFinish) onFinish();
    }, 2400);

    return () => {
      clearTimeout(pulseTimer);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  if (stage === 'hidden') return null;

  const isExiting = stage === 'exiting';

  return (
    <div
      id="app-splash-screen-overlay"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none bg-[#070B14] transition-all duration-500 ease-out ${
        isExiting
          ? 'opacity-0 scale-105 pointer-events-none'
          : 'opacity-100 scale-100 pointer-events-auto'
      }`}
      style={{
        willChange: 'opacity, transform',
      }}
      onClick={() => {
        // Optional quick dismiss on tap
        setStage('exiting');
        setTimeout(() => {
          setStage('hidden');
          if (onFinish) onFinish();
        }, 500);
      }}
    >
      {/* 1. Ambient Radial Neon-Green Background Glow Layer */}
      <div
        className={`absolute w-[380px] h-[380px] sm:w-[500px] sm:h-[500px] rounded-full pointer-events-none ${
          stage === 'pulsing' ? 'animate-splash-glow' : ''
        }`}
        style={{
          background:
            'radial-gradient(circle, rgba(16, 185, 129, 0.28) 0%, rgba(6, 182, 212, 0.14) 40%, rgba(7, 11, 20, 0) 70%)',
          filter: 'blur(30px)',
          transform: 'translateZ(0)',
          willChange: 'transform, opacity',
        }}
      />

      {/* 2. Secondary subtle top specular glass arc */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent pointer-events-none" />

      {/* 3. Central Brand Hero Container (Animated on Entrance + Breathing) */}
      <div
        className={`relative z-10 flex flex-col items-center text-center px-6 transition-transform ${
          stage === 'entering'
            ? 'animate-splash-entrance'
            : stage === 'pulsing'
            ? 'animate-splash-breathe'
            : ''
        }`}
        style={{
          willChange: 'transform, opacity',
        }}
      >
        {/* Animated App Icon Wrapper with Soft Neon Glow */}
        <div className="relative mb-5 group">
          {/* Neon Green Glow Halo behind the icon */}
          <div className="absolute -inset-3 rounded-[36px] bg-emerald-500/30 blur-xl opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none" />

          {/* Premium Budget Bridge App Icon */}
          <div className="relative transform transition-transform duration-300">
            <BudgetBridgeAppIcon
              size="2xl"
              variant="hybrid"
              className="shadow-2xl shadow-emerald-950/80 ring-2 ring-emerald-400/50"
            />
          </div>
        </div>

        {/* App Title with Neon Green Specular Glow Shadow */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display text-white drop-shadow-[0_0_24px_rgba(16,185,129,0.55)]">
            Budget{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Bridge
            </span>
          </h1>

          {/* Tagline Subtitle */}
          <div className="flex items-center justify-center gap-2">
            <span className="h-[1px] w-6 bg-gradient-to-r from-transparent to-emerald-500/60" />
            <p className="text-xs sm:text-sm font-semibold tracking-wider text-emerald-400/90 drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]">
              Connect Today. A Brighter Tomorrow.
            </p>
            <span className="h-[1px] w-6 bg-gradient-to-l from-transparent to-emerald-500/60" />
          </div>
        </div>

        {/* Minimalist Loading Pulse Bar */}
        <div className="mt-8 w-32 sm:w-40 h-1 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
          <div className="w-full h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 animate-splash-progress rounded-full" />
        </div>
      </div>

      {/* 4. Bottom Footer Meta */}
      <div className="absolute bottom-6 inset-x-0 text-center pointer-events-none">
        <p className="text-[11px] font-medium tracking-widest uppercase text-slate-500">
          Smart Peer Balances • SMS Auto-Sync
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
