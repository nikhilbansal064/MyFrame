'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import DashboardHeader from '@/components/DashboardHeader';
import CampaignCreator from '@/components/CampaignCreator';
import CampaignEditor from '@/components/CampaignEditor';
import { 
  Plus, 
  Copy, 
  ExternalLink, 
  BarChart3, 
  Trash2, 
  Eye, 
  Download, 
  Lock, 
  Unlock, 
  Sparkles,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Terminal,
  Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PageContainer } from '@/components/ui/PageContainer';

export default function Dashboard() {
  const { user, loading: authLoading, signInWithGoogle, signInWithDevMode } = useAuth();
  const router = useRouter();
  
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [stats, setStats] = useState({
    activeCount: 0,
    totalViews: 0,
    totalDownloads: 0,
    overallConversion: 0
  });

  // Redirect if logged out
  useEffect(() => {
    if (!authLoading && !user) {
      logger.info('Dashboard', 'No session found. Redirecting user to page home.');
    }
  }, [user, authLoading]);

  // Fetch organiser campaigns and aggregated stats
  const fetchCampaigns = async () => {
    if (!user) return;
    setLoadingCampaigns(true);
    logger.info('Dashboard', 'Fetching campaigns for user', user.id);
    
    try {
      // 1. Fetch campaigns
      const { data: campaignList, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 2. Fetch participation statistics
      const campaignIds = campaignList.map(c => c.id);
      
      let views = 0;
      let downloads = 0;

      if (campaignIds.length > 0) {
        const { data: events, error: eventsError } = await supabase
          .from('participants')
          .select('event_type')
          .in('campaign_id', campaignIds);

        if (eventsError) throw eventsError;

        events.forEach(event => {
          if (event.event_type === 'view') views++;
          if (event.event_type === 'download') downloads++;
        });
      }

      // Calculate active ones based on date
      const now = new Date();
      const activeList = campaignList.filter(c => {
        const start = new Date(c.start_date);
        const end = new Date(c.end_date);
        return c.is_active && now >= start && now <= end;
      });

      setCampaigns(campaignList);
      setStats({
        activeCount: activeList.length,
        totalViews: views,
        totalDownloads: downloads,
        overallConversion: views > 0 ? Math.round((downloads / views) * 100) : 0
      });
      
      logger.debug('Dashboard', 'Campaigns and stats populated', {
        campaignsCount: campaignList.length,
        views,
        downloads
      });
    } catch (err) {
      logger.warn('Dashboard', 'Supabase network offline, loading campaigns from local storage sandbox fallback', err.message);
      
      try {
        const localCampaigns = JSON.parse(localStorage.getItem('mystory_campaigns') || '[]');
        // Filter by user/creator ID
        const filtered = localCampaigns.filter(c => c.creator_id === user.id);
        
        let views = 0;
        let downloads = 0;
        
        filtered.forEach(c => {
          views += (c.stats?.views || 0);
          downloads += (c.stats?.downloads || 0);
        });

        // Calculate active ones based on date
        const now = new Date();
        const activeList = filtered.filter(c => {
          const start = new Date(c.start_date);
          const end = new Date(c.end_date);
          return c.is_active && now >= start && now <= end;
        });

        setCampaigns(filtered);
        setStats({
          activeCount: activeList.length,
          totalViews: views,
          totalDownloads: downloads,
          overallConversion: views > 0 ? Math.round((downloads / views) * 100) : 0
        });
        
        logger.debug('Dashboard', 'Local campaigns and stats populated successfully', filtered.length);
      } catch (localErr) {
        logger.error('Dashboard', 'Local storage campaigns load failed', localErr);
      }
    } finally {
      setLoadingCampaigns(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCampaigns();
    }
  }, [user]);

  // Toggle active/inactive campaign
  const handleToggleActive = async (campaign) => {
    try {
      logger.info('Dashboard', 'Toggling active state', campaign.id, !campaign.is_active);
      const { error } = await supabase
        .from('campaigns')
        .update({ is_active: !campaign.is_active })
        .eq('id', campaign.id);

      if (error) throw error;
      fetchCampaigns();
    } catch (err) {
      logger.warn('Dashboard', 'Supabase toggle failed, falling back to local storage toggle', err.message);
      
      try {
        const localCampaigns = JSON.parse(localStorage.getItem('mystory_campaigns') || '[]');
        const updated = localCampaigns.map(c => {
          if (c.id === campaign.id) {
            return { ...c, is_active: !c.is_active };
          }
          return c;
        });
        localStorage.setItem('mystory_campaigns', JSON.stringify(updated));
        fetchCampaigns();
      } catch (localErr) {
        logger.error('Dashboard', 'Local storage toggle failed', localErr);
        alert('Failed to update campaign state.');
      }
    }
  };

  // Delete Campaign (Optimistic Update)
  const handleDeleteCampaign = async (campaignId) => {
    if (!confirm('Are you absolutely sure you want to delete this campaign? This will permanently delete all associated analytics and frame storage assets. This action is irreversible.')) {
      return;
    }

    // 1. Capture previous state for rollback
    const previousCampaigns = [...campaigns];
    const previousStats = { ...stats };

    // 2. Identify the target campaign
    const targetCampaign = campaigns.find(c => c.id === campaignId);
    if (!targetCampaign) return;

    // 3. Optimistically compute new campaigns list
    const updatedCampaigns = campaigns.filter(c => c.id !== campaignId);

    // 4. Optimistically recalculate activeCount based on dates
    const now = new Date();
    const activeList = updatedCampaigns.filter(c => {
      const start = new Date(c.start_date);
      const end = new Date(c.end_date);
      return c.is_active && now >= start && now <= end;
    });

    // 5. Update local states immediately
    setCampaigns(updatedCampaigns);
    setStats(prev => {
      const viewsToSubtract = targetCampaign.stats?.views || 0;
      const downloadsToSubtract = targetCampaign.stats?.downloads || 0;
      const newViews = Math.max(0, prev.totalViews - viewsToSubtract);
      const newDownloads = Math.max(0, prev.totalDownloads - downloadsToSubtract);
      return {
        activeCount: activeList.length,
        totalViews: newViews,
        totalDownloads: newDownloads,
        overallConversion: newViews > 0 ? Math.round((newDownloads / newViews) * 100) : 0
      };
    });

    // 6. Execute actual deletion in the background
    try {
      logger.info('Dashboard', 'Deleting campaign (optimistically backgrounded)', campaignId);
      
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
      
      logger.info('Dashboard', 'Campaign deleted successfully from Supabase', campaignId);
    } catch (err) {
      logger.warn('Dashboard', 'Supabase delete failed, falling back to local storage delete', err.message);
      
      try {
        const localCampaigns = JSON.parse(localStorage.getItem('mystory_campaigns') || '[]');
        const isLocalCampaign = localCampaigns.some(c => c.id === campaignId);
        
        if (isLocalCampaign) {
          const filtered = localCampaigns.filter(c => c.id !== campaignId);
          localStorage.setItem('mystory_campaigns', JSON.stringify(filtered));
          logger.info('Dashboard', 'Campaign deleted from local storage fallback');
        } else {
          // If it was supposed to delete online but failed, rollback standard state
          throw err;
        }
      } catch (localErr) {
        logger.error('Dashboard', 'Deletion rollback triggered', localErr);
        
        // Rollback to previous state
        setCampaigns(previousCampaigns);
        setStats(previousStats);
        alert(`Failed to delete campaign: ${localErr.message || 'Unknown error'}`);
      }
    }
  };

  // Copy campaign share link to clipboard
  const handleCopyLink = (slug) => {
    const shareUrl = `${window.location.origin}/c/${slug}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Share link successfully copied to clipboard!');
    }).catch(err => {
      logger.error('Dashboard', 'Failed copying link', err);
    });
  };

  // Determine campaign status badge
  const getCampaignStatus = (campaign) => {
    const now = new Date();
    const start = new Date(campaign.start_date);
    const end = new Date(campaign.end_date);

    if (!campaign.is_active) {
      return { label: 'Paused', style: 'border-neutral-500/20 bg-neutral-500/10 text-neutral-400' };
    }
    if (now < start) {
      return { label: 'Scheduled', style: 'border-amber-500/20 bg-amber-500/10 text-amber-400' };
    }
    if (now > end) {
      return { label: 'Expired', style: 'border-rose-500/20 bg-rose-500/10 text-rose-400' };
    }
    return { label: 'Active', style: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' };
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin"></div>
        <p className="text-sm font-semibold tracking-wide text-purple-300">Loading your profile session...</p>
      </div>
    );
  }

  // Lockscreen for unauthenticated users (Upgraded with Dev Mode bypass for offline testing)
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-purple-500/30 selection:text-white">
        <DashboardHeader />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center">
          <Card className="max-w-md w-full p-6 sm:p-8 rounded-3xl flex flex-col items-center text-center gap-6 border border-white/5 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-xl shadow-purple-500/5">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Access Locked</h1>
              <CardDescription className="text-neutral-400 text-xs leading-relaxed max-w-xs mx-auto">
                The organiser dashboard is protected. Please sign in to manage campaigns and view active metrics.
              </CardDescription>
            </div>
            
            {/* Info Box explaining offline behavior */}
            <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 text-purple-300 text-xxs flex gap-2.5 items-start">
              <Terminal className="w-4 h-4 shrink-0 mt-0.5 text-purple-400" />
              <div className="flex flex-col gap-0.5 leading-relaxed text-left">
                <span className="font-bold text-white">Local Testing Info</span>
                <span>Standard Google Sign-In requires an active local Supabase stack emulator running via Docker. For offline testing, use the bypass option below.</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full">
              {/* Option 1: Developer Bypass (Sandbox) */}
              <Button 
                onClick={signInWithDevMode}
                variant="outline"
                className="w-full py-6 rounded-xl font-bold border border-purple-500/30 hover:border-purple-500 bg-purple-500/10 hover:bg-purple-500/15 text-purple-300 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] group shadow-lg shadow-purple-500/5"
              >
                <Terminal className="w-4.5 h-4.5 group-hover:animate-pulse text-purple-400" />
                <span>Developer Bypass (Offline Sandbox)</span>
              </Button>

              {/* Option 2: Google OAuth */}
              <Button 
                onClick={signInWithGoogle}
                variant="secondary"
                className="w-full py-6 rounded-xl font-bold bg-white text-black hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-white/5"
              >
                {/* Simulated Google Logo (Colored circles) */}
                <span className="flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                </span>
                <span>Sign In with Google</span>
              </Button>
            </div>
            
            <p className="text-[9px] text-neutral-500 leading-relaxed max-w-xs">
              Organizer accounts are isolated securely. Standard OAuth registers profile records into local Supabase users schemas automatically.
            </p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <DashboardHeader />

      <main className="flex-1 w-full py-10">
        <PageContainer className="flex flex-col gap-10">
        
        {/* Banner Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-white/5 pb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Organiser Dashboard</h1>
            <p className="text-neutral-400 text-sm mt-1">Manage frames, schedule windows, and view dynamic participant analytics.</p>
          </div>
          <Button 
            onClick={() => setIsCreatorOpen(true)}
            className="px-5 py-3 rounded-xl font-bold flex items-center gap-2 text-sm hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </Button>
        </div>

        {/* Aggregated Overview Cards */}
        {campaigns.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 rounded-2xl flex flex-col gap-2 border border-white/5">
              <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider">Active Campaigns</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{stats.activeCount}</span>
                <span className="text-xs text-neutral-400 font-medium">/ {campaigns.length} total</span>
              </div>
            </Card>
            <Card className="p-6 rounded-2xl flex flex-col gap-2 border border-white/5">
              <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider">Total Views</span>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-purple-400">{stats.totalViews.toLocaleString()}</span>
                <Eye className="w-5 h-5 text-neutral-600" />
              </div>
            </Card>
            <Card className="p-6 rounded-2xl flex flex-col gap-2 border border-white/5">
              <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider">Total Downloads</span>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-emerald-400">{stats.totalDownloads.toLocaleString()}</span>
                <Download className="w-5 h-5 text-neutral-600" />
              </div>
            </Card>
            <Card className="p-6 rounded-2xl flex flex-col gap-2 border border-white/5">
              <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider">Conversion Rate</span>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-pink-400">{stats.overallConversion}%</span>
                <TrendingUp className="w-5 h-5 text-neutral-600" />
              </div>
            </Card>
          </div>
        )}

        {/* Campaigns Listing Grid */}
        <div>
          <h2 className="text-lg font-bold text-neutral-300 mb-6 flex items-center gap-2">
            <span>Your Campaigns</span>
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs font-mono font-medium text-neutral-400">
              {campaigns.length}
            </span>
          </h2>

          {loadingCampaigns ? (
            <div className="w-full py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 rounded-full border-3 border-purple-500/20 border-t-purple-500 animate-spin"></div>
              <p className="text-xs text-neutral-500 font-semibold tracking-wide">Loading campaigns list...</p>
            </div>
          ) : campaigns.length === 0 ? (
            /* Empty State */
            <Card className="w-full py-20 px-8 rounded-3xl flex flex-col items-center justify-center text-center gap-6 border-dashed border-white/10 hover:border-purple-500/30">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-center text-purple-400/60">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <div className="flex flex-col gap-1 max-w-sm">
                <CardTitle className="text-lg font-bold text-white">No campaigns yet</CardTitle>
                <CardDescription className="text-neutral-500 text-sm leading-relaxed">
                  Start sharing your branded frame campaigns in under 5 minutes. No sign-up required for participants!
                </CardDescription>
              </div>
              <Button 
                onClick={() => setIsCreatorOpen(true)}
                className="px-6 py-3 rounded-xl font-bold text-sm"
              >
                Create Your First Campaign
              </Button>
            </Card>
          ) : (
            /* Card Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map(campaign => {
                const status = getCampaignStatus(campaign);
                return (
                  <Card key={campaign.id} className="rounded-2xl p-6 border border-white/5 hover:border-white/10 flex flex-col gap-5">
                    
                    {/* Top Row: Title and Visibility status */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="truncate flex-1">
                        <h3 className="font-bold text-white text-base truncate" title={campaign.title}>
                          {campaign.title}
                        </h3>
                        <p className="text-neutral-500 text-xxs font-mono mt-0.5 select-all">
                          /c/{campaign.slug}
                        </p>
                      </div>
                      
                      {/* Status Badges */}
                      <div className="flex gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xxs font-semibold border ${status.style}`}>
                          {status.label}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-full text-xxs border ${campaign.is_public ? 'border-purple-500/20 bg-purple-500/5 text-purple-400' : 'border-neutral-700 bg-neutral-800 text-neutral-500'}`} title={campaign.is_public ? 'Public Profile Visibility Enabled' : 'Private'}>
                          {campaign.is_public ? <Unlock className="w-3 h-3 text-purple-400" /> : <Lock className="w-3 h-3" />}
                        </span>
                      </div>
                    </div>

                    {/* Frame Visual Preview thumbnail */}
                    <div className="relative w-full h-40 overflow-hidden rounded-xl border border-white/5 bg-neutral-950 flex items-center justify-center p-2 hover:bg-neutral-900 transition-all duration-300">
                      <img 
                        src={campaign.frame_url} 
                        alt="PNG Overlay Frame Preview" 
                        className="max-h-full max-w-full object-contain pointer-events-none p-2"
                        onError={(e) => { e.target.src = '/favicon.ico'; }}
                      />
                    </div>

                    {/* Details Row: Calendar Expiry and stats */}
                    <div className="grid grid-cols-3 gap-3 border-y border-white/5 py-3 text-center text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-neutral-500 font-bold uppercase tracking-wider text-[9px]">Views</span>
                        <span className="font-bold text-white">{campaign.stats?.views || 0}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-neutral-500 font-bold uppercase tracking-wider text-[9px]">Downloads</span>
                        <span className="font-bold text-white">{campaign.stats?.downloads || 0}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-neutral-500 font-bold uppercase tracking-wider text-[9px]">Ends</span>
                        <span className="font-medium text-neutral-400 text-[10px] truncate" title={new Date(campaign.end_date).toLocaleDateString()}>
                          {new Date(campaign.end_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                        </span>
                      </div>
                    </div>

                    {/* Actions and analytics shortcuts */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mt-1 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        {/* Copy Link Button */}
                        <Button 
                          onClick={() => handleCopyLink(campaign.slug)}
                          title="Copy Shareable Link"
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 rounded-xl border border-white/5 hover:border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        
                        {/* Go to Live Campaign Page */}
                        <a 
                          href={`/c/${campaign.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View Live Campaign Page"
                          className="inline-flex items-center justify-center w-8 h-8 border border-white/5 hover:border-white/10 bg-white/5 hover:bg-white/10 rounded-xl text-neutral-300 hover:text-white transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        {/* Toggle Active state Button */}
                        <Button 
                          onClick={() => handleToggleActive(campaign)}
                          title={campaign.is_active ? 'Pause Campaign' : 'Resume Campaign'}
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 rounded-xl border border-white/5 hover:border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white"
                        >
                          {campaign.is_active ? (
                            <ToggleRight className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-3.5 h-3.5 text-neutral-500" />
                          )}
                        </Button>
                      </div>

                      <div className="flex items-center gap-1.5 ml-auto">
                        {/* View Detailed Analytics Dashboard */}
                        <Button 
                          onClick={() => router.push(`/dashboard/campaign/${campaign.id}`)}
                          className="px-3 py-1.5 border border-purple-500/20 hover:border-purple-500 bg-purple-500/10 text-purple-300 rounded-xl text-xxs font-bold flex items-center gap-1 hover:scale-[1.02]"
                        >
                          <BarChart3 className="w-3 h-3" />
                          <span>Analytics</span>
                        </Button>

                        {/* Edit Button */}
                        <Button 
                          onClick={() => setEditingCampaign(campaign)}
                          title="Edit Campaign"
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 border border-purple-500/10 hover:border-purple-500 bg-purple-500/5 hover:bg-purple-500/10 rounded-xl text-purple-400 hover:text-purple-300"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>

                        {/* Delete Button */}
                        <Button 
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          title="Delete Campaign"
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 border border-rose-500/10 hover:border-rose-500 bg-rose-500/5 hover:bg-rose-500/10 rounded-xl text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                  </Card>
                );
              })}
            </div>
          )}
        </div>
        </PageContainer>
      </main>

      {/* Campaign Creator Overlaid Wizard Modal */}
      {isCreatorOpen && (
        <CampaignCreator 
          onClose={() => {
            setIsCreatorOpen(false);
            fetchCampaigns();
          }}
        />
      )}

      {/* Campaign Editor Overlaid Modal */}
      {editingCampaign && (
        <CampaignEditor 
          campaign={editingCampaign}
          onClose={() => setEditingCampaign(null)}
          onUpdate={(updatedCampaign) => {
            // Update the campaign list in place instantly
            const updatedCampaignsList = campaigns.map(c => 
              c.id === updatedCampaign.id ? { ...c, ...updatedCampaign } : c
            );
            setCampaigns(updatedCampaignsList);
            
            // Instantly recalculate stats local values
            const now = new Date();
            const activeList = updatedCampaignsList.filter(c => {
              const start = new Date(c.start_date);
              const end = new Date(c.end_date);
              return c.is_active && now >= start && now <= end;
            });
            
            setStats(prev => ({
              ...prev,
              activeCount: activeList.length
            }));
            
            setEditingCampaign(null);
          }}
        />
      )}

    </div>
  );
}
