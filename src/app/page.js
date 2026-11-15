'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import { 
  Sparkles, 
  ArrowRight, 
  BarChart3, 
  ShieldCheck, 
  UploadCloud, 
  Flame, 
  Smartphone, 
  Globe,
  Terminal
} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import GoogleIcon from '@/components/GoogleIcon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageContainer } from '@/components/ui/PageContainer';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Home() {
  const { user, loading, signInWithGoogle, signInWithDevMode } = useAuth();
  const router = useRouter();
  
  // Interactive mock photo engine states for landing page wow factor
  const [mockZoom, setMockZoom] = useState(1.1);
  const [mockX, setMockX] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    logger.debug('LandingPage', 'Rendered, loading status:', loading, 'User:', user?.email);
  }, [loading, user]);

  const handleCreateCampaignClick = () => {
    if (user) {
      router.push('/dashboard');
    } else {
      setShowAuthModal(true);
    }
  };

  const handleDevModeSignIn = () => {
    setShowAuthModal(false);
    signInWithDevMode()
      .then(() => {
        router.push('/dashboard');
      })
      .catch(err => {
        logger.error('LandingPage', 'Developer login error', err);
      });
  };

  const features = [
    {
      icon: UploadCloud,
      tone: 'text-purple-300 bg-purple-500/10 ring-purple-500/20',
      title: 'Launch in 60 Seconds',
      body: 'Sign in with Google, name your campaign, pick a custom link (e.g. yoursite.com/c/pride), upload a transparent PNG frame and publish.',
    },
    {
      icon: ShieldCheck,
      tone: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/20',
      title: '100% Client-Side Privacy',
      body: "Supporters' selfies are composited entirely in their own browser. No participant photo is ever uploaded to a server.",
    },
    {
      icon: BarChart3,
      tone: 'text-sky-300 bg-sky-500/10 ring-sky-500/20',
      title: 'Built-in Analytics',
      body: 'Track views, downloads and conversion, with device and locale breakdowns in interactive charts.',
    },
    {
      icon: Smartphone,
      tone: 'text-cyan-300 bg-cyan-500/10 ring-cyan-500/20',
      title: 'Fluid Touch Editor',
      body: 'Drag, zoom and align with mouse or touch. Supporters see the frame live and download a high-resolution JPEG instantly.',
    },
    {
      icon: Globe,
      tone: 'text-rose-300 bg-rose-500/10 ring-rose-500/20',
      title: 'Rich Link Previews',
      body: 'Every campaign is server-rendered with OpenGraph tags, so shared links show your frame in WhatsApp, X and more.',
    },
    {
      icon: Sparkles,
      tone: 'text-amber-300 bg-amber-500/10 ring-amber-500/20',
      title: 'Future-Proof Flexibility',
      body: 'Flexible JSONB settings make room for multi-slot layouts, custom text fields, custom domains and brand palettes.',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-40 w-full app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <BrandLogo />
          
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="w-6 h-6 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin"></div>
            ) : user ? (
              <Button onClick={() => router.push('/dashboard')} variant="light" size="sm">
                Go to Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <>
                {/* Local Dev Mode bypass trigger button */}
                <Button 
                  onClick={handleDevModeSignIn}
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex"
                  title="Bypass Google OAuth for local offline testing"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Dev Mode
                </Button>
                <Button onClick={handleCreateCampaignClick} variant="light" size="sm">
                  Organiser Sign In
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="w-full pt-16 pb-20 sm:pt-20 lg:pt-28 lg:pb-32">
        <PageContainer className="grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-12 items-center">
          
          {/* Left Column: Headline */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 h-7 px-3 rounded-full text-xs font-medium border border-purple-500/25 bg-purple-500/10 text-purple-200">
              <Flame className="w-3.5 h-3.5 text-purple-300" />
              <span>Launch a Frame Campaign in 5 Minutes</span>
            </div>
            
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.08] text-white text-balance">
              Empower Supporters.<br />
              <span className="text-gradient">Branded Photos</span> at Scale.
            </h1>
            
            <p className="mt-6 text-base sm:text-lg text-neutral-400 max-w-xl leading-relaxed">
              The ad-free alternative to Twibbonize. Create beautiful transparent photo frames for festivals, elections or corporate events, shared through a single link with <span className="text-neutral-100 font-medium">zero friction</span> and <span className="text-neutral-100 font-medium">complete client-side privacy</span>.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button onClick={handleCreateCampaignClick} size="lg" className="w-full sm:w-auto">
                Start Free Campaign
                <ArrowRight className="w-4 h-4" />
              </Button>
              
              {/* Dev mode bypass login button for local testing */}
              {!user && (
                <Button onClick={handleDevModeSignIn} size="lg" variant="outline" className="w-full sm:w-auto">
                  <Terminal className="w-4 h-4 text-purple-300" />
                  Developer Bypass
                </Button>
              )}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-500">
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400/80" />No sign-up for supporters</span>
              <span className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-sky-400/80" />Works on any device</span>
            </div>
          </div>

          {/* Right Column: Interactive mockup */}
          <div className="lg:col-span-5 w-full flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-[420px]">
              <div aria-hidden className="absolute -inset-8 rounded-[40px] bg-gradient-to-tr from-purple-600/25 via-fuchsia-500/10 to-transparent blur-3xl" />
              <Card className="relative w-full p-5 sm:p-6 rounded-3xl bg-neutral-950/80">
              
                {/* Mockup Header */}
                <div className="w-full flex justify-between items-center mb-4">
                  <span className="eyebrow">Live preview</span>
                  <span className="text-xxs text-purple-300 flex items-center gap-1.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                    Compositing
                  </span>
                </div>

                {/* Canvas Mockup viewport */}
                <div className="relative w-full aspect-square overflow-hidden rounded-2xl border border-white/[0.06] bg-neutral-950 flex items-center justify-center select-none">
                  {/* Supporter image backing */}
                  <div 
                    className="absolute w-full h-full transition-transform duration-300 ease-out flex items-center justify-center bg-gradient-to-br from-neutral-800 via-neutral-900 to-black"
                    style={{
                      transform: `scale(${mockZoom}) translate(${mockX}px, 0px)`,
                    }}
                  >
                    <div className="w-40 h-40 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 ring-1 ring-white/10 flex items-center justify-center shadow-2xl">
                      <Sparkles className="w-10 h-10 text-purple-300/50" />
                    </div>
                  </div>

                  {/* Static frame overlay */}
                  <div className="absolute inset-0 z-20 pointer-events-none border-[12px] border-purple-600/40 rounded-2xl flex flex-col justify-between p-5">
                    <div className="flex justify-between items-start">
                      <div className="bg-purple-500 text-white font-semibold text-xxs px-2 py-0.5 rounded-md shadow uppercase tracking-wider">
                        #MyStory
                      </div>
                      <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/15 flex items-center justify-center text-white text-xs">
                        ★
                      </div>
                    </div>
                    <div className="text-center bg-black/60 backdrop-blur ring-1 ring-white/10 py-2.5 px-3 rounded-xl">
                      <p className="text-white font-semibold text-xs uppercase tracking-wider">
                        Green Planet 2026
                      </p>
                      <p className="text-purple-200 text-xxs mt-0.5">
                        I Stand For Sustainable Futures
                      </p>
                    </div>
                  </div>
                </div>

                {/* Interactive controls underneath mockup */}
                <div className="w-full mt-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-neutral-400 font-medium">
                    <span>Zoom</span>
                    <span className="text-neutral-200 font-mono tabular-nums">{(mockZoom * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex gap-3 items-center">
                    <input 
                      type="range" 
                      min="0.8" 
                      max="2" 
                      step="0.01"
                      value={mockZoom}
                      onChange={(e) => setMockZoom(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 cursor-pointer"
                      aria-label="Mockup zoom"
                    />
                    <Button 
                      onClick={() => { setMockZoom(1.1); setMockX(0); }}
                      variant="secondary"
                      size="sm"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>

        </PageContainer>
      </section>

      {/* 3. Features Matrix */}
      <section id="features" className="w-full border-t border-white/[0.06] bg-white/[0.01] py-20 lg:py-28">
        <PageContainer>
          <div className="text-center max-w-2xl mx-auto mb-14 lg:mb-16 flex flex-col gap-4">
            <span className="eyebrow text-purple-300">Features</span>
            <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight text-white text-balance">
              Engineered for Speed, Growth, and Privacy
            </h2>
            <p className="text-neutral-400 text-base leading-relaxed">
              No intrusive ads or clunky editors. My Story gives you fast, focused tools that put your campaign front and centre.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {features.map(({ icon: Icon, tone, title, body }) => (
              <Card key={title} className="card-hover p-6 lg:p-7 flex flex-col">
                <div className={`w-10 h-10 rounded-xl ring-1 ring-inset flex items-center justify-center ${tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-neutral-400 text-sm leading-relaxed">{body}</p>
              </Card>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* 4. Footer */}
      <footer className="w-full border-t border-white/[0.06] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
          <BrandLogo size="sm" />
          <p className="text-center sm:text-right">© 2026 My Story. Ad-free, privacy-first photo frame campaigns.</p>
        </div>
      </footer>

      {/* Auth Selection Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="max-w-md">
          
          {/* Header */}
          <DialogHeader className="items-center text-center pt-2">
            <div className="w-12 h-12 mb-2 rounded-2xl bg-purple-500/10 ring-1 ring-inset ring-purple-500/25 flex items-center justify-center text-purple-300">
              <Sparkles className="w-6 h-6" />
            </div>
            <DialogTitle>Organiser Sign In</DialogTitle>
            <DialogDescription className="max-w-sm">
              Access your organiser dashboard to launch frame campaigns and view supporter analytics.
            </DialogDescription>
          </DialogHeader>

          {/* Info Box explaining offline behavior */}
          <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/[0.06] text-sm flex gap-3 items-start">
            <Terminal className="w-4 h-4 shrink-0 mt-0.5 text-purple-300" />
            <div className="flex flex-col gap-1 leading-relaxed text-left">
              <span className="font-medium text-white">Local testing</span>
              <span className="text-neutral-400 text-xs">Google Sign-In needs a local Supabase stack running in Docker. For offline testing, use the bypass option below.</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3">
            <Button onClick={handleDevModeSignIn} variant="accent" size="lg" className="w-full">
              <Terminal className="w-4 h-4" />
              <span>Developer Bypass (Offline Sandbox)</span>
            </Button>

            <Button 
              onClick={() => {
                setShowAuthModal(false);
                signInWithGoogle().catch(err => {
                  logger.error('LandingPage', 'Google Sign-In error', err);
                });
              }}
              variant="light"
              size="lg"
              className="w-full"
            >
              <GoogleIcon />
              <span>Sign In with Google Account</span>
            </Button>
          </div>

          {/* Privacy note */}
          <p className="text-xs text-neutral-500 text-center leading-relaxed">
            By continuing, you agree to secure data isolation. Organiser settings are stored locally or in your own PostgreSQL backend.
          </p>
        </DialogContent>
      </Dialog>

    </div>
  );
}
