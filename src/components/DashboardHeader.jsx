'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { Sparkles, LogOut, LayoutGrid } from 'lucide-react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';

export default function DashboardHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();

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
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer select-none" 
            onClick={() => router.push('/')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-pink-400">
              My Story
            </span>
            <span className="text-xxs px-2 py-0.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 font-semibold uppercase tracking-wider">
              Organiser
            </span>
          </div>

          {/* User Session Actions */}
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => router.push('/dashboard')}
              variant="ghost"
              className="hidden sm:flex text-neutral-400 hover:text-white items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/5 bg-white/5"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Button>

            {user ? (
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-2 border border-white/5 bg-white/5 rounded-xl px-3 py-1.5 max-w-[180px]">
                  {user.user_metadata?.avatar_url ? (
                    <div className="relative w-6 h-6 rounded-lg overflow-hidden border border-purple-500/30">
                      <img 
                        src={user.user_metadata.avatar_url} 
                        alt="User avatar" 
                        className="object-cover w-full h-full"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 text-xs font-bold font-mono">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:block text-xs font-semibold text-neutral-300 truncate max-w-[100px]">
                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </span>
                </div>

                {/* Logout Button */}
                <Button 
                  onClick={handleSignOut}
                  title="Sign Out"
                  variant="ghost"
                  size="icon"
                  className="p-2.5 rounded-xl border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button 
                onClick={() => router.push('/')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-neutral-200"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
