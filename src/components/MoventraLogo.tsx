import React from 'react';

interface MoventraLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const MoventraLogo: React.FC<MoventraLogoProps> = ({
  size = 'md',
  showTagline = false,
}) => {
  const iconSize = size === 'lg' ? 44 : size === 'sm' ? 28 : 34;
  const textClass =
    size === 'lg'
      ? 'text-3xl sm:text-4xl'
      : size === 'sm'
      ? 'text-lg'
      : 'text-2xl';

  return (
    <div className="inline-flex items-center gap-3 select-none shrink-0">
      <div
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-slate-900 border border-blue-400/30 shadow-[0_0_24px_rgba(59,130,246,0.28)]"
        style={{ width: iconSize, height: iconSize }}
      >
        <svg
          viewBox="0 0 36 36"
          fill="none"
          className="w-2/3 h-2/3"
          aria-hidden="true"
        >
          <path
            d="M4 24V11.5C4 10.67 4.67 10 5.5 10H22.5C23.33 10 24 10.67 24 11.5V24"
            stroke="#60A5FA"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M24 14.5H28.8C29.4 14.5 29.95 14.84 30.22 15.38L32.3 19.5C32.43 19.76 32.5 20.04 32.5 20.33V24H24"
            stroke="#A5B4FC"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="10.5" cy="25.5" r="2.8" fill="#0F172A" stroke="#38BDF8" strokeWidth="2.2" />
          <circle cx="27.5" cy="25.5" r="2.8" fill="#0F172A" stroke="#38BDF8" strokeWidth="2.2" />
          <path d="M8.5 16H19.5M8.5 19.5H15.5" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className={`moventra-3d-brand tracking-widest whitespace-nowrap ${textClass}`}>
          MOVENTRA
        </span>
        {showTagline && (
          <span className="text-[11px] font-medium tracking-wider text-blue-300/80 mt-1 whitespace-nowrap">
            India Commercial Relocation &amp; Fleet Logistics
          </span>
        )}
      </div>
    </div>
  );
};
