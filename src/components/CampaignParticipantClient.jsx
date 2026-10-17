'use client';

import { useEffect, useState } from 'react';
import LiveCanvasEditor from './LiveCanvasEditor';
import { logger } from '@/lib/logger';
import { Sparkles, Heart, Share2, Info, AlertTriangle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function CampaignParticipantClient({ campaign: initialCampaign }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState(initialCampaign);
  const [downloadCount, setDownloadCount] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);

  // Search local storage fallback if the SSR campaign was not found in the DB (offline sandbox mode)
  useEffect(() => {
    if (!campaign) {
      try {
        const pathParts = window.location.pathname.split('/');
        const slug = pathParts[pathParts.length - 1];
        if (slug) {
          logger.info('CampaignClient', 'Searching local storage fallback for slug:', slug);
          const localCampaigns = JSON.parse(localStorage.getItem('mystory_campaigns') || '[]');
          const found = localCampaigns.find(c => c.slug === slug);
          if (found) {
            setCampaign(found);
            logger.info('CampaignClient', 'Loaded campaign from local storage fallback sandbox!', found);
          }
        }
      } catch (err) {
        logger.error('CampaignClient', 'Error checking local storage slug fallback', err);
      }
    }
  }, [initialCampaign]);

  // Verify scheduler constraints
  useEffect(() => {
    if (!campaign) return;
    
    const now = new Date();
    const start = new Date(campaign.start_date);
    const end = new Date(campaign.end_date);
    
    if (now < start) {
      setIsScheduled(true);
      logger.info('CampaignClient', 'Campaign is scheduled but not yet live.');
    }
    if (now > end) {
      setIsExpired(true);
      logger.info('CampaignClient', 'Campaign has expired.');
    }
  }, [campaign]);

  // Log "view" event telemetry anonymously on-load
  useEffect(() => {
    if (!campaign || isScheduled) return;

    logger.info('CampaignClient', 'Logging page view telemetry...');
    fetch('/api/log-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: campaign.id,
        eventType: 'view'
      })
    })
    .then(res => res.json())
    .then(data => {
      logger.debug('CampaignClient', 'Page view logged successfully', data);
    })
    .catch(err => {
      logger.error('CampaignClient', 'Failed logging page view telemetry', err);
    });
  }, [campaign, isScheduled]);

  // Log "download" event telemetry on successful composite download
  const handleDownloadSuccess = () => {
    logger.info('CampaignClient', 'Logging photo download telemetry...');
    setDownloadCount(prev => prev + 1);

    fetch('/api/log-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: campaign.id,
        eventType: 'download'
      })
    })
    .then(res => res.json())
    .then(data => {
      logger.debug('CampaignClient', 'Download event logged successfully', data);
    })
    .catch(err => {
      logger.error('CampaignClient', 'Failed logging download telemetry', err);
    });
  };

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground text-center px-6 gap-5">
        <div className="w-16 h-16 rounded-2xl bg-neutral-800 border border-white/5 flex items-center justify-center text-neutral-400">
          <Info className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Campaign Not Found</h1>
          <p className="text-xs text-neutral-500 max-w-xs mt-1">This campaign link is invalid or has been archived by the organiser.</p>
        </div>
        <Button 
          onClick={() => router.push('/')}
          className="px-6 py-2.5 rounded-xl font-bold text-xs"
        >
          Create Your Own Campaign
        </Button>
      </div>
    );
  }

  const isPaused = !campaign.is_active;
  const isInactive = isPaused || isExpired || isScheduled;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      
      {/* Dynamic Header */}
      <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-pink-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
            </div>
            <span className="text-sm font-bold text-white">My Story</span>
          </div>
          
          <span className="text-xs text-neutral-400 font-semibold truncate max-w-[150px] sm:max-w-[250px]" title={campaign.title}>
            {campaign.title}
          </span>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main className="flex-1 w-full py-10 lg:py-16 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
        
        {/* Left Column: Interactive Canvas Editor Workspace */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center w-full">
          {isInactive ? (
            /* Inactive Campaign Lockscreen Overlay */
            <Card className="w-full aspect-square max-w-[500px] border border-dashed border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-white">Campaign Inactive</CardTitle>
                <CardDescription className="text-neutral-500 text-xs mt-1.5 leading-relaxed max-w-xs mx-auto">
                  {isPaused && 'This campaign has been temporarily paused by the organiser.'}
                  {isScheduled && `This campaign is scheduled and will go live on ${new Date(campaign.start_date).toLocaleString()}.`}
                  {isExpired && 'This campaign has ended. The expiry window set by the organiser has passed.'}
                </CardDescription>
              </div>
              <Button 
                onClick={() => router.push('/')}
                className="px-6 py-2.5 rounded-xl font-bold text-xs"
              >
                Create Your Own Campaign
              </Button>
            </Card>
          ) : (
            /* Canvas compositor */
            <LiveCanvasEditor 
              frameUrl={campaign.frame_url} 
              campaignTitle={campaign.title} 
              onDownloadSuccess={handleDownloadSuccess}
            />
          )}
        </div>

        {/* Right Column: Campaign details & share loop */}
        <div className="lg:col-span-6 flex flex-col items-start gap-6 lg:pl-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xxs font-bold border border-purple-500/20 bg-purple-500/5 text-purple-400">
            <Heart className="w-3.5 h-3.5 fill-purple-400/20 text-purple-400" />
            <span>Join Branded Photo Campaign</span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-black text-white tracking-tight leading-none sm:text-4xl">
              {campaign.title}
            </h1>
            <p className="text-neutral-400 text-sm leading-relaxed mt-2">
              {campaign.description || 'Add your profile photo to our official branded overlay frame. Support us by downloading and sharing your branded photo on social media!'}
            </p>
          </div>

          {/* Dynamic Helper Guidance Cards */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-6">
            <Card className="p-4 rounded-xl border border-white/5 flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-purple-500/5 border border-purple-500/10 flex items-center justify-center text-purple-400 font-bold shrink-0">
                1
              </div>
              <div className="flex flex-col gap-0.5">
                <h4 className="text-xs font-bold text-white">Upload Selfie</h4>
                <p className="text-xxs text-neutral-500">Pick any image or take a quick mobile photo.</p>
              </div>
            </Card>

            <Card className="p-4 rounded-xl border border-white/5 flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-purple-500/5 border border-purple-500/10 flex items-center justify-center text-purple-400 font-bold shrink-0">
                2
              </div>
              <div className="flex flex-col gap-0.5">
                <h4 className="text-xs font-bold text-white">Align & Scale</h4>
                <p className="text-xxs text-neutral-500">Drag to pan and use slider to fit perfectly inside boundaries.</p>
              </div>
            </Card>
          </div>

          {/* Social share suggestion row */}
          {downloadCount > 0 && (
            <div className="w-full p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 animate-in fade-in slide-in-from-bottom duration-300 flex items-start gap-3">
              <Share2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <div className="flex flex-col gap-0.5">
                <h4 className="text-xs font-bold text-white">Downloaded Successfully!</h4>
                <p className="text-xxs text-neutral-500 leading-relaxed">
                  Share it on **Instagram, WhatsApp, X (Twitter), or Facebook** with the campaign hashtag to spread the reach!
                </p>
              </div>
            </div>
          )}

          {/* Quick Footer redirection */}
          <div className="w-full flex items-center justify-between border-t border-white/5 pt-6 mt-2 text-xxs text-neutral-500">
            <span>Powered by My Story</span>
            <button 
              onClick={() => router.push('/')}
              className="hover:text-purple-400 flex items-center gap-1 font-semibold cursor-pointer"
            >
              Launch Your Own Frame Campaign
              <ArrowRight className="w-2.5 h-2.5 text-purple-400" />
            </button>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
