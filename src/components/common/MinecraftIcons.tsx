import React from 'react';

export const HeartIcon: React.FC<{
  type?: 'full' | 'half' | 'empty';
  className?: string;
}> = ({ type = 'full', className = 'w-4 h-4' }) => {
  if (type === 'empty') {
    return (
      <svg viewBox="0 0 16 16" className={`${className} text-zinc-700 fill-zinc-900 stroke-zinc-600`}>
        <path d="M8 14s-5.5-3.5-7-7a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 15 7c-1.5 3.5-7 7-7 7z" strokeWidth="1.2" />
      </svg>
    );
  }
  if (type === 'half') {
    return (
      <svg viewBox="0 0 16 16" className={`${className}`}>
        <defs>
          <linearGradient id="halfHeart" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#27272a" />
          </linearGradient>
        </defs>
        <path d="M8 14s-5.5-3.5-7-7a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 15 7c-1.5 3.5-7 7-7 7z" fill="url(#halfHeart)" stroke="#991b1b" strokeWidth="1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className={`${className} fill-red-500 stroke-red-800`}>
      <path d="M8 14s-5.5-3.5-7-7a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 15 7c-1.5 3.5-7 7-7 7z" strokeWidth="1.2" />
      <circle cx="5" cy="5" r="1" fill="#fca5a5" />
    </svg>
  );
};

export const FoodIcon: React.FC<{
  type?: 'full' | 'half' | 'empty';
  className?: string;
}> = ({ type = 'full', className = 'w-4 h-4' }) => {
  if (type === 'empty') {
    return (
      <svg viewBox="0 0 16 16" className={`${className} fill-zinc-900 stroke-zinc-700`}>
        <path d="M12 2c-2 0-3.5 1.5-4 3-.5-1.5-2-3-4-3-2 0-3 1.5-3 3 0 3.5 4.5 6 7 9 2.5-3 7-5.5 7-9 0-1.5-1-3-3-3z" strokeWidth="1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className={`${className} fill-amber-700 stroke-amber-950`}>
      <path d="M11 2c-1.8 0-3 1.2-3.5 2.5-.5-1.3-1.7-2.5-3.5-2.5-2 0-3 1.5-3 3.5 0 3 4 5.5 6.5 8.5 2.5-3 6.5-5.5 6.5-8.5 0-2-1-3.5-3-3.5z" strokeWidth="1" />
      <circle cx="5.5" cy="5" r="1" fill="#fde68a" opacity="0.6" />
    </svg>
  );
};

export const ArmorIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 16 16" className={`${className} fill-slate-300 stroke-slate-600`}>
    <path d="M8 1L2 3v5c0 4.5 4 7 6 7s6-2.5 6-7V3L8 1z" strokeWidth="1.2" />
    <path d="M8 2.5v11.5c1.5-.5 4.5-2.5 4.5-6V4.2L8 2.5z" fill="#94a3b8" />
  </svg>
);

export const CompassIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} stroke-current fill-none`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="#ef4444" />
  </svg>
);
