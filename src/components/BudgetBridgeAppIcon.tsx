import React from 'react';

export interface BudgetBridgeAppIconProps {
  /** Size preset */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Extra container classes */
  className?: string;
  /** Optional click handler */
  onClick?: () => void;
  /** Accessible title */
  title?: string;
  /** Display mode */
  variant?: 'vector' | 'hybrid' | 'image';
}

const SIZE_STYLES: Record<string, string> = {
  xs: 'w-7 h-7 rounded-lg',
  sm: 'w-8 h-8 sm:w-9 sm:h-9 rounded-xl',
  md: 'w-10 h-10 sm:w-11 sm:h-11 rounded-2xl',
  lg: 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl',
  xl: 'w-20 h-20 sm:w-24 sm:h-24 rounded-3xl',
  '2xl': 'w-28 h-28 sm:w-32 sm:h-32 rounded-[32px]',
};

export const BudgetBridgeAppIcon: React.FC<BudgetBridgeAppIconProps> = ({
  size = 'md',
  className = '',
  onClick,
  title = 'Budget Bridge - Connect Today. A Brighter Tomorrow.',
}) => {
  const containerSize = SIZE_STYLES[size] || SIZE_STYLES.md;

  return (
    <div
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden bg-[#0F172A] shadow-md shadow-emerald-950/40 transition-all duration-300 hover:shadow-emerald-500/20 group ${containerSize} ${
        onClick ? 'cursor-pointer active:scale-95' : ''
      } ${className}`}
    >
      <svg
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          {/* Background Diagonal Gradient: Teal (#0F766E) to Emerald Green (#10B981) */}
          <linearGradient id="bbIconBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0F766E" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>

          {/* Gold Coin Gradient */}
          <linearGradient id="bbIconCoinGrad" x1="20%" y1="15%" x2="85%" y2="90%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="40%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          {/* Lighter Green Bridge Arch Gradient */}
          <linearGradient id="bbIconBridgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="50%" stopColor="#6EE7B7" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>

        {/* 1. Rounded-square background */}
        <rect width="512" height="512" rx="112" fill="url(#bbIconBgGrad)" />

        {/* Inner specular border */}
        <rect
          x="12"
          y="12"
          width="488"
          height="488"
          rx="100"
          fill="none"
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth="4"
        />

        {/* 2. Simplified bridge arch shape in lighter green, centered in lower half */}
        {/* Bridge deck line */}
        <path
          d="M 64 348 Q 256 322 448 348 L 448 368 Q 256 342 64 368 Z"
          fill="url(#bbIconBridgeGrad)"
        />

        {/* Main Arch Cutout Silhouette spanning down to base */}
        <path
          d="M 88 424 L 88 360 Q 256 280 424 360 L 424 424 L 380 424 Q 256 320 132 424 Z"
          fill="url(#bbIconBridgeGrad)"
        />

        {/* Vertical suspension / architectural pillars */}
        <line x1="172" y1="344" x2="172" y2="385" stroke="#A7F3D0" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
        <line x1="214" y1="334" x2="214" y2="338" stroke="#A7F3D0" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
        <line x1="298" y1="334" x2="298" y2="338" stroke="#A7F3D0" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
        <line x1="340" y1="344" x2="340" y2="385" stroke="#A7F3D0" strokeWidth="5" strokeLinecap="round" opacity="0.9" />

        {/* Keystone support right beneath the coin */}
        <path d="M 232 292 L 280 292 L 274 322 L 238 322 Z" fill="#6EE7B7" />

        {/* 3. Gold (#FBBF24) circular coin sitting on top of the arch */}
        <circle cx="256" cy="204" r="68" fill="url(#bbIconCoinGrad)" stroke="#F59E0B" strokeWidth="4" />
        <circle cx="256" cy="204" r="58" fill="none" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="2.5" strokeDasharray="6 4" />

        {/* 4. Rupee (₹) symbol in dark navy (#0F172A) centered on the coin */}
        <g fill="#0F172A" stroke="#0F172A">
          <rect x="228" y="166" width="56" height="7.5" rx="3.5" />
          <rect x="228" y="184" width="52" height="7.5" rx="3.5" />
          <path
            d="M 238 166 L 238 214 C 258 214 274 206 274 193 C 274 180 258 174 246 174"
            fill="none"
            strokeWidth="7.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M 246 210 L 278 244" strokeWidth="8" strokeLinecap="round" />
        </g>
      </svg>

      {/* Top glossy edge refraction line */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none z-20" />
      <div className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/20 pointer-events-none z-20" />
    </div>
  );
};

export default BudgetBridgeAppIcon;
