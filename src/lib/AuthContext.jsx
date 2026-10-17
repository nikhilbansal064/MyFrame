'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { logger } from './logger';

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithDevMode: async () => {}, // Expose Developer Mode Sign In bypass
  signOut: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
      logger.debug('AuthContext', 'Initial session loaded', currentSession?.user?.email);
    }).catch(err => {
      logger.error('AuthContext', 'Error getting initial session', err);
      setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
      logger.debug('AuthContext', 'Auth state changed', _event, currentSession?.user?.email);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Standard Google OAuth Sign-In
  const signInWithGoogle = async () => {
    if (!supabase) {
      logger.warn('AuthContext', 'Supabase not initialized');
      alert('Supabase connection details are missing. Please configure your local environment.');
      return;
    }
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard',
        },
      });
      if (error) {
        logger.error('AuthContext', 'Error initiating Google Sign-In', error);
        setLoading(false);
        throw error;
      }
    } catch (e) {
      logger.error('AuthContext', 'OAuth exception caught', e);
      setLoading(false);
      throw e;
    }
  };

  // Developer Bypass Sign-In (Supports Offline and Local-first testing)
  const signInWithDevMode = async () => {
    logger.info('AuthContext', 'Initiating Developer Bypass Sign-In...');
    setLoading(true);

    const mockUser = {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'developer.organiser@mystory.com',
      user_metadata: {
        full_name: 'Developer Organiser',
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80' // Beautiful high-quality mock avatar
      }
    };

    // Pre-populate mock campaign data for offline sandbox mode so the user sees a beautiful dashboard immediately!
    try {
      if (typeof window !== 'undefined' && !localStorage.getItem('mystory_campaigns')) {
        logger.info('AuthContext', 'Pre-populating sandbox campaigns and telemetry logs...');
        
        const mockCampaigns = [
          {
            id: 'sandbox-campaign-1',
            slug: 'green-planet-2026',
            creator_id: '00000000-0000-0000-0000-000000000000',
            title: 'Green Planet 2026 Campaign',
            description: 'I stand for sustainable futures and zero carbon emissions! Add your photo to support our green targets.',
            frame_url: 'https://images.unsplash.com/photo-1588880331179-bc9b93a8c5d8?auto=format&fit=crop&w=600&q=80', // Beautiful forest background mock PNG
            start_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
            end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
            is_public: true,
            is_active: true,
            stats: { views: 1240, downloads: 942 },
            settings: {},
            metadata: { is_local: true, is_sandbox_sample: true }
          },
          {
            id: 'sandbox-campaign-2',
            slug: 'diwali-lights',
            creator_id: '00000000-0000-0000-0000-000000000000',
            title: 'Diwali Lights Festival 2026',
            description: 'Celebrate the festival of lights with our custom glowing card frame. Spread light and joy!',
            frame_url: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=600&q=80', // Glowing mock frame
            start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Starts in 2 days (Scheduled)
            end_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
            is_public: true,
            is_active: true,
            stats: { views: 0, downloads: 0 },
            settings: {},
            metadata: { is_local: true, is_sandbox_sample: true }
          },
          {
            id: 'sandbox-campaign-3',
            slug: 'summer-startup-summit',
            creator_id: '00000000-0000-0000-0000-000000000000',
            title: 'Summer Startup Summit 2026',
            description: 'Empowering future disruptors and founders. Add your profile picture to show you are attending!',
            frame_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=600&q=80',
            start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            end_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Expired 1 day ago
            is_public: false,
            is_active: true,
            stats: { views: 340, downloads: 210 },
            settings: {},
            metadata: { is_local: true, is_sandbox_sample: true }
          }
        ];
        localStorage.setItem('mystory_campaigns', JSON.stringify(mockCampaigns));

        // Generate analytics logs for Green Planet campaign
        const mockEvents = [];
        const now = new Date();
        const locales = ['en-US', 'en-GB', 'en-IN', 'fr-FR', 'de-DE'];
        const userAgents = [
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', // Mobile iOS
          'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UD1A.230803.041) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36', // Mobile Android
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', // Desktop Mac Chrome
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' // Desktop Windows Chrome
        ];

        // Generate views and downloads for last 7 days
        for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
          const eventDate = new Date();
          eventDate.setDate(now.getDate() - dayOffset);
          
          const viewsCount = Math.floor(Math.random() * 20) + 15;
          const downloadsCount = Math.floor(viewsCount * (0.6 + Math.random() * 0.25));

          for (let i = 0; i < viewsCount; i++) {
            mockEvents.push({
              id: `event-${dayOffset}-v-${i}`,
              campaign_id: 'sandbox-campaign-1',
              event_type: 'view',
              user_agent: userAgents[Math.floor(Math.random() * userAgents.length)],
              locale: locales[Math.floor(Math.random() * locales.length)],
              created_at: new Date(eventDate.getTime() - Math.random() * 12 * 60 * 60 * 1000).toISOString()
            });
          }

          for (let i = 0; i < downloadsCount; i++) {
            mockEvents.push({
              id: `event-${dayOffset}-d-${i}`,
              campaign_id: 'sandbox-campaign-1',
              event_type: 'download',
              user_agent: userAgents[Math.floor(Math.random() * userAgents.length)],
              locale: locales[Math.floor(Math.random() * locales.length)],
              created_at: new Date(eventDate.getTime() - Math.random() * 12 * 60 * 60 * 1000).toISOString()
            });
          }
        }
        
        localStorage.setItem('mystory_campaign_events_sandbox-campaign-1', JSON.stringify(mockEvents));
        logger.info('AuthContext', 'Offline campaigns and events loaded successfully.');
      }
    } catch (e) {
      logger.error('AuthContext', 'Failed generating mock campaigns data', e);
    }

    // If Supabase client is connected locally, try to sign in anonymously to generate a real DB session JWT
    if (supabase) {
      try {
        logger.info('AuthContext', 'Attempting Supabase anonymous sign-in...');
        const { data, error } = await supabase.auth.signInAnonymously({
          options: {
            data: {
              full_name: mockUser.user_metadata.full_name,
              avatar_url: mockUser.user_metadata.avatar_url
            }
          }
        });

        if (error) throw error;

        // If anonymous sign in succeeded, sync user session
        setSession(data.session);
        setUser(data.user);
        logger.info('AuthContext', 'Logged in locally with real Supabase anonymous session', data.user.id);
        setLoading(false);
        return;
      } catch (err) {
        logger.warn('AuthContext', 'Supabase anonymous sign-in failed or disabled. Falling back to local state mock.', err.message);
      }
    }

    // Client-side local state mock fallback (keeps app fully interactive even if Supabase Docker is offline!)
    setTimeout(() => {
      setUser(mockUser);
      setSession({ user: mockUser });
      setLoading(false);
      logger.info('AuthContext', 'Logged in offline with client-only mock user profile');
    }, 500);
  };

  const signOut = async () => {
    if (!supabase) {
      // Offline logout
      setUser(null);
      setSession(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('AuthContext', 'Error signing out', error);
    }
    setUser(null);
    setSession(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signInWithDevMode, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
