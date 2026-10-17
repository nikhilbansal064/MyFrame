'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithDevMode: async () => {},
  signOut: async () => {},
});

// Seed mock campaigns into localStorage for offline dev mode (runs once)
function seedOfflineCampaigns() {
  if (typeof window === 'undefined' || localStorage.getItem('mystory_campaigns')) return;

  const uid = '00000000-0000-0000-0000-000000000000';
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const campaigns = [
    {
      id: 'sandbox-campaign-1',
      slug: 'green-planet-2026',
      creator_id: uid,
      title: 'Green Planet 2026 Campaign',
      description: 'I stand for sustainable futures. Add your photo to support our green targets.',
      frame_url: 'https://images.unsplash.com/photo-1588880331179-bc9b93a8c5d8?auto=format&fit=crop&w=600&q=80',
      start_date: new Date(now - 3 * day).toISOString(),
      end_date: new Date(now + 10 * day).toISOString(),
      is_public: true, is_active: true,
      stats: { views: 1240, downloads: 942 },
      settings: {}, metadata: { is_local: true }
    },
    {
      id: 'sandbox-campaign-2',
      slug: 'diwali-lights',
      creator_id: uid,
      title: 'Diwali Lights Festival 2026',
      description: 'Celebrate the festival of lights with our custom frame.',
      frame_url: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=600&q=80',
      start_date: new Date(now + 2 * day).toISOString(),
      end_date: new Date(now + 12 * day).toISOString(),
      is_public: true, is_active: true,
      stats: { views: 0, downloads: 0 },
      settings: {}, metadata: { is_local: true }
    },
    {
      id: 'sandbox-campaign-3',
      slug: 'summer-startup-summit',
      creator_id: uid,
      title: 'Summer Startup Summit 2026',
      description: 'Empowering founders. Add your photo to show you\'re attending!',
      frame_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=600&q=80',
      start_date: new Date(now - 5 * day).toISOString(),
      end_date: new Date(now - 1 * day).toISOString(),
      is_public: false, is_active: true,
      stats: { views: 340, downloads: 210 },
      settings: {}, metadata: { is_local: true }
    }
  ];

  localStorage.setItem('mystory_campaigns', JSON.stringify(campaigns));
}

const MOCK_USER = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'developer.organiser@mystory.com',
  user_metadata: {
    full_name: 'Developer Organiser',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80'
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) { alert('Supabase not configured. Use Developer Bypass for local testing.'); return; }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard' }
    });
  };

  const signInWithDevMode = async () => {
    setLoading(true);
    seedOfflineCampaigns();

    // Try real anonymous Supabase session first (works if local Supabase is running)
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInAnonymously({
          options: { data: MOCK_USER.user_metadata }
        });
        if (!error) {
          setUser(data.user);
          setLoading(false);
          return;
        }
      } catch { /* fall through to mock */ }
    }

    // Fully offline mock fallback
    setTimeout(() => {
      setUser(MOCK_USER);
      setLoading(false);
    }, 400);
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithDevMode, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
