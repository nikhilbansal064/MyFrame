'use client';

import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

// Shared brand mark used in every header and footer
export default function BrandLogo({ size = 'md', badge = null }) {
  const router = useRouter();
  const sizes = {
    sm: { box: 'w-7 h-7 rounded-lg', icon: 'w-3.5 h-3.5', text: 'text-sm' },
    md: { box: 'w-8 h-8 rounded-[10px]', icon: 'w-4 h-4', text: 'text-base' },
  };
  const s = sizes[size] || sizes.md;

  return (
    <button
      type="button"
      onClick={() => router.push('/')}
      className="flex items-center gap-2.5 cursor-pointer select-none shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
    >
      <span className={`${s.box} bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/25 ring-1 ring-inset ring-white/20`}>
        <Sparkles className={`${s.icon} text-white`} />
      </span>
      <span className={`${s.text} font-semibold tracking-tight text-white`}>
        My Story
      </span>
      {badge && (
        <span className="hidden sm:inline-flex text-xxs px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.04] text-neutral-300 font-medium">
          {badge}
        </span>
      )}
    </button>
  );
}
