'use client';

import { useEffect, useState } from 'react';
import LiveCanvasEditor from './LiveCanvasEditor';
import { logger } from '@/lib/logger';
import { Heart, Share2, Info, AlertTriangle, ArrowRight } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground text-center px-6 gap-6">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.06] ring-1 ring-inset ring-white/10 flex items-center justify-center text-neutral-300">
          <Info className="w-6 h-6" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Campaign Not Found</h1>
          <p className="text-sm text-neutral-400 max-w-xs leading-relaxed">This campaign link is invalid or has been archived by the organiser.</p>
        </div>
        <Button onClick={() => router.push('/')}>
          Create Your Own Campaign
        </Button>
      </div>
    );
  }

  const isPaused = !campaign.is_active;
  const isInactive = isPaused || isExpired || isScheduled;

  const steps = [
    { title: 'Upload Selfie', body: 'Pick any image or take a quick photo on your phone.' },
    { title: 'Align & Scale', body: 'Drag to position and use the slider to fit the frame.' },
    { title: 'Download & Share', body: 'Save a high-res JPEG and post it anywhere.' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      
      {/* Header */}
      <header className="sticky top-0 z-40 w-full app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <BrandLogo />
          <span className="text-sm text-neutral-400 font-medium truncate max-w-[50%]" title={campaign.title}>
            {campaign.title}
          </span>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main className="flex-1 w-full py-8 sm:py-12 lg:py-16">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
        
        {/* Left Column: Interactive Canvas Editor Workspace */}
        <div className="lg:col-span-6 flex flex-col items-center w-full">
          {isInactive ? (
            /* Inactive Campaign Lockscreen Overlay */
            <Card className="w-full aspect-square max-w-[500px] border-dashed border-white/10 p-8 flex flex-col items-center justify-center text-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 ring-1 ring-inset ring-amber-500/25 flex items-center justify-center text-amber-300">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-2">
                <CardTitle className="text-lg">Campaign Inactive</CardTitle>
                <CardDescription className="max-w-xs mx-auto">
                  {isPaused && 'This campaign has been temporarily paused by the organiser.'}
                  {isScheduled && `This campaign is scheduled and will go live on ${new Date(campaign.start_date).toLocaleString()}.`}
                  {isExpired && 'This campaign has ended. The expiry window set by the organiser has passed.'}
                </CardDescription>
              </div>
              <Button onClick={() => router.push('/')}>
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
        <div className="lg:col-span-6 flex flex-col items-start gap-8 lg:pt-4">
          <div className="flex flex-col items-start gap-5">
            <div className="inline-flex items-center gap-2 h-7 px-3 rounded-full text-xs font-medium border border-purple-500/25 bg-purple-500/10 text-purple-200">
              <Heart className="w-3.5 h-3.5 fill-purple-400/30 text-purple-300" />
              <span>Join Branded Photo Campaign</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-[1.1] text-balance">
              {campaign.title}
            </h1>
            <p className="text-neutral-400 text-base leading-relaxed max-w-xl">
              {campaign.description || 'Add your profile photo to our official branded overlay frame. Support us by downloading and sharing your branded photo on social media!'}
            </p>
          </div>

          {/* Steps */}
          <ol className="w-full grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-3">
            {steps.map((step, idx) => (
              <li key={step.title} className="glass-panel rounded-xl p-4 flex gap-3 items-start">
                <span className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-300 text-sm font-semibold flex items-center justify-center shrink-0 tabular-nums">
                  {idx + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h4 className="text-sm font-medium text-white">{step.title}</h4>
                  <p className="text-xs text-neutral-500 leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* Social share suggestion row */}
          {downloadCount > 0 && (
            <div className="w-full p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] animate-slide-up flex items-start gap-3">
              <Share2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-medium text-white">Downloaded successfully!</h4>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Share it on <span className="text-neutral-200 font-medium">Instagram, WhatsApp, X or Facebook</span> with the campaign hashtag to spread the word.
                </p>
              </div>
            </div>
          )}

          {/* Footer redirection */}
          <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-sm text-neutral-500">
            <span>Powered by My Story</span>
            <button 
              onClick={() => router.push('/')}
              className="text-neutral-300 hover:text-white flex items-center gap-1.5 font-medium cursor-pointer transition-colors"
            >
              Launch your own frame campaign
              <ArrowRight className="w-3.5 h-3.5 text-purple-300" />
            </button>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
