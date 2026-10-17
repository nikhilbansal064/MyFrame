'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardStats from '@/components/DashboardStats';
import { 
  ArrowLeft, 
  Calendar, 
  Sparkles, 
  Settings, 
  Lock, 
  Unlock, 
  Save, 
  Eye, 
  Download, 
  Copy,
  Info 
} from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';

export default function CampaignAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id;

  const [campaign, setCampaign] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  
  // Settings edit states
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Load campaign data and event metrics
  const fetchCampaignData = async () => {
    if (!user || !campaignId) return;
    setLoading(true);
    setUnauthorized(false);
    logger.info('CampaignAnalytics', 'Loading analytics details for ID:', campaignId);

    try {
      // 1. Fetch campaign
      const { data: currentCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .maybeSingle();

      if (campaignError) throw campaignError;

      if (!currentCampaign) {
        logger.error('CampaignAnalytics', 'Campaign not found for ID:', campaignId);
        setLoading(false);
        return;
      }

      // Check owner permission
      if (currentCampaign.creator_id !== user.id) {
        logger.warn('CampaignAnalytics', 'Access denied. Owner mismatch.', { creator: currentCampaign.creator_id, user: user.id });
        setUnauthorized(true);
        setLoading(false);
        return;
      }

      // Populate edit states
      setCampaign(currentCampaign);
      setTitle(currentCampaign.title);
      setDescription(currentCampaign.description || '');
      setIsPublic(currentCampaign.is_public);

      // 2. Fetch participation events
      const { data: logs, error: logsError } = await supabase
        .from('participants')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true });

      if (logsError) throw logsError;

      setEvents(logs);
      logger.debug('CampaignAnalytics', 'Loaded analytics data points count:', logs.length);
    } catch (err) {
      logger.warn('CampaignAnalytics', 'Supabase network offline, loading analytics from local storage sandbox fallback', err.message);
      
      try {
        const localCampaigns = JSON.parse(localStorage.getItem('mystory_campaigns') || '[]');
        const foundCampaign = localCampaigns.find(c => c.id === campaignId);
        
        if (foundCampaign) {
          setCampaign(foundCampaign);
          setTitle(foundCampaign.title);
          setDescription(foundCampaign.description || '');
          setIsPublic(foundCampaign.is_public);
          
          // Load events from localStorage
          const localEvents = JSON.parse(localStorage.getItem(`mystory_campaign_events_${campaignId}`) || '[]');
          setEvents(localEvents);
          logger.info('CampaignAnalytics', 'Loaded analytics from sandbox localStorage successfully', localEvents.length);
        }
      } catch (localErr) {
        logger.error('CampaignAnalytics', 'Local storage analytics load failed', localErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && campaignId) {
      fetchCampaignData();
    }
  }, [user, campaignId]);

  // Handle Settings Save
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!campaign) return;

    setSavingSettings(true);
    logger.info('CampaignAnalytics', 'Updating campaign settings', { title, isPublic });

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          title: title.trim(),
          description: description.trim(),
          is_public: isPublic
        })
        .eq('id', campaign.id);

      if (error) throw error;

      logger.info('CampaignAnalytics', 'Settings updated successfully.');
      setIsEditing(false);
      fetchCampaignData();
    } catch (err) {
      logger.error('CampaignAnalytics', 'Failed updating settings', err);
      alert('Failed to update campaign settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Copy campaign share link
  const handleCopyLink = () => {
    if (!campaign) return;
    const shareUrl = `${window.location.origin}/c/${campaign.slug}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Share link successfully copied to clipboard!');
    }).catch(err => {
      logger.error('CampaignAnalytics', 'Failed copying link', err);
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
        <p className="text-sm font-semibold tracking-wide text-indigo-300">Loading campaign analytics...</p>
      </div>
    );
  }

  // Access Block Lockscreen
  if (!user || unauthorized) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <DashboardHeader />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col items-center justify-center">
          <div className="max-w-md w-full glass-panel p-8 rounded-3xl flex flex-col items-center text-center gap-6 border border-white/5">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-xl">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Access Denied</h1>
            <p className="text-neutral-400 text-sm leading-relaxed">
              {unauthorized 
                ? 'You do not have permission to view this campaign. Analytics are private and only accessible by the verified organiser.'
                : 'Please sign in with Google to access the analytics center.'}
            </p>
            <button 
              onClick={() => router.push(user ? '/dashboard' : '/')}
              className="w-full btn-premium py-3.5 rounded-xl font-bold"
            >
              {user ? 'Return to Dashboard' : 'Return Home'}
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <DashboardHeader />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col items-center justify-center">
          <div className="max-w-md w-full glass-panel p-8 rounded-3xl flex flex-col items-center text-center gap-6 border border-white/5">
            <div className="w-16 h-16 rounded-2xl bg-neutral-800 border border-white/5 flex items-center justify-center text-neutral-400">
              <Info className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Campaign Not Found</h1>
            <p className="text-neutral-400 text-sm leading-relaxed">
              We couldn't locate any campaign matching this parameter ID. It might have been deleted or archived.
            </p>
            <button 
              onClick={() => router.push('/dashboard')}
              className="w-full btn-premium py-3.5 rounded-xl font-bold"
            >
              Return to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <DashboardHeader />

      <main className="flex-1 w-full py-10">
        <PageContainer className="flex flex-col gap-10">
        
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
          <button 
            onClick={() => router.push('/dashboard')}
            className="hover:text-white flex items-center gap-1.5 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <span>/</span>
          <span className="text-neutral-400 truncate max-w-[200px]">{campaign.title}</span>
          <span>/</span>
          <span className="text-indigo-400">Analytics Report</span>
        </div>

        {/* Campaign Header panel */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          <div className="flex items-start gap-4">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-white/5 bg-neutral-950 flex items-center justify-center shrink-0">
              <img 
                src={campaign.frame_url} 
                alt="PNG Frame Overlay Thumbnail" 
                className="max-h-full max-w-full object-contain pointer-events-none p-1.5"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold text-white tracking-tight">{campaign.title}</h1>
                <span className={`px-2 py-0.5 rounded-full text-xxs font-semibold border ${campaign.is_active ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-neutral-700 bg-neutral-800 text-neutral-500'}`}>
                  {campaign.is_active ? 'Active' : 'Paused'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xxs font-semibold border ${campaign.is_public ? 'border-indigo-500/20 bg-indigo-500/5 text-indigo-400' : 'border-neutral-700 bg-neutral-800 text-neutral-500'}`}>
                  {campaign.is_public ? 'Publicly Listed' : 'Private'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 max-w-md line-clamp-1 mt-0.5" title={campaign.description}>
                {campaign.description || 'No description provided.'}
              </p>
              <div className="flex items-center gap-1.5 text-xxs text-neutral-500 mt-1">
                <Calendar className="w-3 h-3 text-indigo-400" />
                <span>Running: {new Date(campaign.start_date).toLocaleDateString()} – {new Date(campaign.end_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={handleCopyLink}
              className="px-4 py-2 border border-white/5 hover:border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Slug
            </button>
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                isEditing 
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' 
                  : 'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Settings Toggles
            </button>
          </div>

        </div>

        {/* Settings Editing Drawer */}
        {isEditing && (
          <div className="glass-panel p-6 rounded-3xl border border-indigo-500/15 animate-in slide-in-from-top duration-300">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-indigo-400" />
              <span>Modify Campaign Configuration</span>
            </h2>
            
            <form onSubmit={handleSaveSettings} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-neutral-400">Campaign Title</label>
                  <input 
                    type="text" 
                    required
                    maxLength={80}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                    <span>Branding Visibility</span>
                  </label>
                  <div className="flex items-center justify-between border border-white/5 bg-white/5 rounded-xl px-4 py-2.5">
                    <span className="text-xs text-neutral-300">
                      {isPublic ? 'Publicly Listed on Profile' : 'Private (Hidden from Directory)'}
                    </span>
                    <button 
                      type="button"
                      onClick={() => setIsPublic(!isPublic)}
                      className={`w-10 h-5.5 rounded-full transition-all p-0.5 ${isPublic ? 'bg-indigo-500' : 'bg-neutral-800'}`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full bg-white shadow transition-all ${isPublic ? 'translate-x-4.5' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-neutral-400">Campaign Description</label>
                <textarea 
                  rows={2}
                  maxLength={300}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4 mt-1">
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-white/10 bg-white/5 rounded-xl text-xs font-bold text-neutral-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={savingSettings}
                  className="btn-premium px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Data Aggregations Visual Display */}
        <DashboardStats events={events} />

        </PageContainer>
      </main>
    </div>
  );
}
