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
  ChevronRight,
  Check,
  Settings, 
  Lock, 
  Unlock, 
  Save, 
  Copy,
  Info 
} from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Field, VisibilityToggle } from '@/components/CampaignFormFields';

function StatusScreen({ icon: Icon, tone, title, body, action, onAction }) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <DashboardHeader />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center">
        <Card className="max-w-md w-full p-6 sm:p-8 flex flex-col items-center text-center gap-5 animate-slide-up">
          <div className={`w-12 h-12 rounded-2xl ring-1 ring-inset flex items-center justify-center ${tone}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-white tracking-tight">{title}</h1>
            <p className="text-neutral-400 text-sm leading-relaxed">{body}</p>
          </div>
          <Button onClick={onAction} className="w-full mt-1">{action}</Button>
        </Card>
      </main>
    </div>
  );
}

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
  const [copied, setCopied] = useState(false);

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
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(err => {
      logger.error('CampaignAnalytics', 'Failed copying link', err);
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground gap-4">
        <div className="w-10 h-10 rounded-full border-[3px] border-purple-500/25 border-t-purple-400 animate-spin"></div>
        <p className="text-sm text-neutral-400">Loading campaign analytics…</p>
      </div>
    );
  }

  // Access Block Lockscreen
  if (!user || unauthorized) {
    return (
      <StatusScreen
        icon={Lock}
        tone="bg-rose-500/10 ring-rose-500/25 text-rose-300"
        title="Access Denied"
        body={unauthorized
          ? 'You do not have permission to view this campaign. Analytics are private to the campaign organiser.'
          : 'Please sign in with Google to access the analytics center.'}
        action={user ? 'Return to Dashboard' : 'Return Home'}
        onAction={() => router.push(user ? '/dashboard' : '/')}
      />
    );
  }

  if (!campaign) {
    return (
      <StatusScreen
        icon={Info}
        tone="bg-white/[0.06] ring-white/10 text-neutral-300"
        title="Campaign Not Found"
        body="We couldn't find a campaign with this ID. It may have been deleted or archived."
        action="Return to Dashboard"
        onAction={() => router.push('/dashboard')}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <DashboardHeader />

      <main className="flex-1 w-full py-8 sm:py-12">
        <PageContainer className="flex flex-col gap-6 sm:gap-8">
        
        {/* Navigation Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-neutral-500 min-w-0">
          <button 
            onClick={() => router.push('/dashboard')}
            className="hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-neutral-700" />
          <span className="truncate">{campaign.title}</span>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-neutral-700" />
          <span className="text-neutral-200 shrink-0">Analytics</span>
        </nav>

        {/* Campaign Header panel */}
        <Card className="p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-16 h-16 rounded-xl overflow-hidden ring-1 ring-white/10 bg-neutral-950 flex items-center justify-center shrink-0">
              <img 
                src={campaign.frame_url} 
                alt="" 
                className="max-h-full max-w-full object-contain pointer-events-none p-1.5"
                onError={(e) => { e.target.src = '/favicon.ico'; }}
              />
            </div>
            
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-white tracking-tight">{campaign.title}</h1>
                <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xxs font-medium ring-1 ring-inset ${campaign.is_active ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/25' : 'bg-neutral-500/10 text-neutral-300 ring-neutral-500/25'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${campaign.is_active ? 'bg-emerald-400' : 'bg-neutral-400'}`}></span>
                  {campaign.is_active ? 'Active' : 'Paused'}
                </span>
                <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-xxs font-medium ring-1 ring-inset ring-white/10 bg-white/[0.04] text-neutral-300">
                  {campaign.is_public ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {campaign.is_public ? 'Public' : 'Private'}
                </span>
              </div>
              <p className="text-sm text-neutral-400 line-clamp-2 max-w-xl" title={campaign.description}>
                {campaign.description || 'No description provided.'}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(campaign.start_date).toLocaleDateString()} – {new Date(campaign.end_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button onClick={handleCopyLink} variant="secondary" size="sm">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Link'}
            </Button>
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant={isEditing ? 'accent' : 'secondary'}
              size="sm"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </Button>
          </div>

        </Card>

        {/* Settings Editing Drawer */}
        {isEditing && (
          <Card className="p-5 sm:p-6 animate-slide-up">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-300" />
              Campaign Settings
            </h2>
            
            <form onSubmit={handleSaveSettings} className="mt-5 flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Campaign Title" htmlFor="settings-title">
                  <Input 
                    id="settings-title"
                    type="text" 
                    required
                    maxLength={80}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </Field>
                
                <Field label="Visibility">
                  <VisibilityToggle
                    isPublic={isPublic}
                    onToggle={() => setIsPublic(!isPublic)}
                    publicHint="Listed on your organiser profile."
                    privateHint="Hidden from directories."
                  />
                </Field>
              </div>

              <Field label="Campaign Description" htmlFor="settings-description">
                <Textarea 
                  id="settings-description"
                  rows={3}
                  maxLength={300}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-white/[0.06] pt-5">
                <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingSettings}>
                  <Save className="w-4 h-4" />
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Data Aggregations Visual Display */}
        <DashboardStats events={events} />

        </PageContainer>
      </main>
    </div>
  );
}
