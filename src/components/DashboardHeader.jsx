'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, LayoutGrid } from 'lucide-react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/BrandLogo';

export default function DashboardHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    try {
      await signOut();
      logger.info('DashboardHeader', 'Sign out successful, redirecting to home.');
      router.push('/');
    } catch (err) {
      logger.error('DashboardHeader', 'Sign out exception caught', err);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <BrandLogo badge="Organiser" />

        {/* User Session Actions */}
        <div className="flex items-center gap-2">
          {pathname !== '/dashboard' && (
            <Button
              onClick={() => router.push('/dashboard')}
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <LayoutGrid className="w-4 h-4" />
              Dashboard
            </Button>
          )}

          {user ? (
            <>
              <div className="flex items-center gap-2 h-9 rounded-full border border-white/[0.08] bg-white/[0.03] pl-1 pr-1 sm:pr-3">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="User avatar"
                    className="w-7 h-7 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-200 text-xs font-semibold">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="hidden sm:block text-sm font-medium text-neutral-200 truncate max-w-[140px]">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </span>
              </div>

              <Button
                onClick={handleSignOut}
                title="Sign Out"
                aria-label="Sign out"
                variant="ghost-danger"
                size="icon-sm"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button onClick={() => router.push('/')} variant="light" size="sm">
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
