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
  Edit,
  Check
} from 'lucide-react';
import GoogleIcon from '@/components/GoogleIcon';
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
  const [copiedSlug, setCopiedSlug] = useState(null);
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
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(current => (current === slug ? null : current)), 1800);
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
      return { label: 'Paused', style: 'text-neutral-300 ring-neutral-500/30', dot: 'bg-neutral-400' };
    }
    if (now < start) {
      return { label: 'Scheduled', style: 'text-amber-300 ring-amber-500/30', dot: 'bg-amber-400' };
    }
    if (now > end) {
      return { label: 'Expired', style: 'text-rose-300 ring-rose-500/30', dot: 'bg-rose-400' };
    }
    return { label: 'Active', style: 'text-emerald-300 ring-emerald-500/30', dot: 'bg-emerald-400' };
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground gap-4">
        <div className="w-10 h-10 rounded-full border-[3px] border-purple-500/25 border-t-purple-400 animate-spin"></div>
        <p className="text-sm text-neutral-400">Loading your session…</p>
      </div>
    );
  }

  // Lockscreen for unauthenticated users (with Dev Mode bypass for offline testing)
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <DashboardHeader />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center">
          <Card className="max-w-md w-full p-6 sm:p-8 rounded-2xl flex flex-col items-center text-center gap-6 animate-slide-up">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 ring-1 ring-inset ring-purple-500/25 flex items-center justify-center text-purple-300">
              <Lock className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold text-white tracking-tight">Access Locked</h1>
              <CardDescription className="max-w-xs mx-auto">
                The organiser dashboard is protected. Sign in to manage campaigns and view metrics.
              </CardDescription>
            </div>
            
            {/* Info Box explaining offline behavior */}
            <div className="w-full p-4 rounded-xl border border-purple-500/20 bg-purple-500/[0.06] flex gap-3 items-start text-left">
              <Terminal className="w-4 h-4 shrink-0 mt-0.5 text-purple-300" />
              <div className="flex flex-col gap-1 leading-relaxed">
                <span className="text-sm font-medium text-white">Local testing</span>
                <span className="text-xs text-neutral-400">Google Sign-In needs a local Supabase stack running in Docker. For offline testing, use the bypass option below.</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <Button onClick={signInWithDevMode} variant="accent" size="lg" className="w-full">
                <Terminal className="w-4 h-4" />
                <span>Developer Bypass (Offline Sandbox)</span>
              </Button>

              <Button onClick={signInWithGoogle} variant="light" size="lg" className="w-full">
                <GoogleIcon />
                <span>Sign In with Google</span>
              </Button>
            </div>
            
            <p className="text-xs text-neutral-500 leading-relaxed max-w-xs">
              Organiser accounts are isolated securely. Google sign-in registers your profile in Supabase automatically.
            </p>
          </Card>
        </main>
      </div>
    );
  }

  const overview = [
    { label: 'Active Campaigns', value: stats.activeCount, suffix: `/ ${campaigns.length} total`, icon: Sparkles, tone: 'text-purple-300 bg-purple-500/10' },
    { label: 'Total Views', value: stats.totalViews.toLocaleString(), icon: Eye, tone: 'text-sky-300 bg-sky-500/10' },
    { label: 'Total Downloads', value: stats.totalDownloads.toLocaleString(), icon: Download, tone: 'text-emerald-300 bg-emerald-500/10' },
    { label: 'Conversion Rate', value: `${stats.overallConversion}%`, icon: TrendingUp, tone: 'text-pink-300 bg-pink-500/10' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <DashboardHeader />

      <main className="flex-1 w-full py-8 sm:py-12">
        <PageContainer className="flex flex-col gap-8 sm:gap-10">
        
        {/* Page heading */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">Organiser Dashboard</h1>
            <p className="text-neutral-400 text-sm">Manage frames, schedule campaigns and track participant analytics.</p>
          </div>
          <Button onClick={() => setIsCreatorOpen(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Create Campaign
          </Button>
        </div>

        {/* Aggregated Overview Cards */}
        {campaigns.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {overview.map(({ label, value, suffix, icon: Icon, tone }) => (
              <Card key={label} className="p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="eyebrow truncate">{label}</span>
                  <span className={`hidden sm:flex w-8 h-8 rounded-lg items-center justify-center ${tone}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-white tabular-nums">{value}</span>
                  {suffix && <span className="text-xs text-neutral-500">{suffix}</span>}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Campaigns Listing Grid */}
        <section className="flex flex-col gap-5">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span>Your Campaigns</span>
            <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-md bg-white/[0.06] text-xs font-medium text-neutral-400 tabular-nums">
              {campaigns.length}
            </span>
          </h2>

          {loadingCampaigns ? (
            <div className="w-full py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-8 h-8 rounded-full border-[3px] border-purple-500/20 border-t-purple-400 animate-spin"></div>
              <p className="text-sm text-neutral-500">Loading campaigns…</p>
            </div>
          ) : campaigns.length === 0 ? (
            /* Empty State */
            <Card className="w-full py-16 sm:py-20 px-6 sm:px-8 flex flex-col items-center justify-center text-center gap-6 border-dashed border-white/10">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 ring-1 ring-inset ring-purple-500/20 flex items-center justify-center text-purple-300">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-2 max-w-sm">
                <CardTitle className="text-lg">No campaigns yet</CardTitle>
                <CardDescription>
                  Launch your first branded frame campaign in under 5 minutes. Participants don&apos;t need to sign up.
                </CardDescription>
              </div>
              <Button onClick={() => setIsCreatorOpen(true)}>
                <Plus className="w-4 h-4" />
                Create Your First Campaign
              </Button>
            </Card>
          ) : (
            /* Card Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {campaigns.map(campaign => {
                const status = getCampaignStatus(campaign);
                const isCopied = copiedSlug === campaign.slug;
                return (
                  <Card key={campaign.id} className="card-hover overflow-hidden flex flex-col">

                    {/* Frame Visual Preview thumbnail */}
                    <div className="relative w-full aspect-[16/10] bg-neutral-950 border-b border-white/[0.06] flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:16px_16px]">
                      <img 
                        src={campaign.frame_url} 
                        alt="PNG Overlay Frame Preview" 
                        className="max-h-full max-w-full object-contain pointer-events-none p-4"
                        onError={(e) => { e.target.src = '/favicon.ico'; }}
                      />

                      {/* Status Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xxs font-medium ring-1 ring-inset bg-black/70 backdrop-blur ${status.style}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                          {status.label}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-xxs font-medium ring-1 ring-inset ring-white/10 bg-black/70 backdrop-blur text-neutral-300"
                          title={campaign.is_public ? 'Public Profile Visibility Enabled' : 'Private'}
                        >
                          {campaign.is_public ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          {campaign.is_public ? 'Public' : 'Private'}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 flex flex-col gap-4 flex-1">
                      {/* Title and slug */}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white text-base truncate" title={campaign.title}>
                          {campaign.title}
                        </h3>
                        <p className="text-neutral-500 text-xs font-mono mt-1 truncate select-all">
                          /c/{campaign.slug}
                        </p>
                      </div>

                      {/* Stats row */}
                      <dl className="grid grid-cols-3 rounded-xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.06] divide-x divide-white/[0.06]">
                        <div className="px-3 py-2.5">
                          <dt className="eyebrow text-neutral-500">Views</dt>
                          <dd className="mt-0.5 text-sm font-semibold text-white tabular-nums">{(campaign.stats?.views || 0).toLocaleString()}</dd>
                        </div>
                        <div className="px-3 py-2.5">
                          <dt className="eyebrow text-neutral-500">Downloads</dt>
                          <dd className="mt-0.5 text-sm font-semibold text-white tabular-nums">{(campaign.stats?.downloads || 0).toLocaleString()}</dd>
                        </div>
                        <div className="px-3 py-2.5">
                          <dt className="eyebrow text-neutral-500">Ends</dt>
                          <dd className="mt-0.5 text-sm font-medium text-neutral-300 truncate" title={new Date(campaign.end_date).toLocaleDateString()}>
                            {new Date(campaign.end_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                          </dd>
                        </div>
                      </dl>

                      {/* Actions */}
                      <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                        <div className="flex items-center gap-1">
                          <Button 
                            onClick={() => handleCopyLink(campaign.slug)}
                            title="Copy Shareable Link"
                            aria-label="Copy shareable link"
                            variant="ghost"
                            size="icon-sm"
                          >
                            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </Button>
                          
                          <a 
                            href={`/c/${campaign.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View Live Campaign Page"
                            aria-label="View live campaign page"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-all"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          <Button 
                            onClick={() => handleToggleActive(campaign)}
                            title={campaign.is_active ? 'Pause Campaign' : 'Resume Campaign'}
                            aria-label={campaign.is_active ? 'Pause campaign' : 'Resume campaign'}
                            variant="ghost"
                            size="icon-sm"
                          >
                            {campaign.is_active ? (
                              <ToggleRight className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                          </Button>

                          <Button 
                            onClick={() => setEditingCampaign(campaign)}
                            title="Edit Campaign"
                            aria-label="Edit campaign"
                            variant="ghost"
                            size="icon-sm"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>

                          <Button 
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            title="Delete Campaign"
                            aria-label="Delete campaign"
                            variant="ghost-danger"
                            size="icon-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <Button 
                          onClick={() => router.push(`/dashboard/campaign/${campaign.id}`)}
                          variant="secondary"
                          size="sm"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Analytics</span>
                        </Button>
                      </div>
                    </div>

                  </Card>
                );
              })}
            </div>
          )}
        </section>
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
