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

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-purple-500/30 selection:text-white">
      
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => router.push('/')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-pink-400">
              My Story
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="w-8 h-8 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin"></div>
            ) : user ? (
              <Button 
                onClick={() => router.push('/dashboard')}
                variant="outline"
                className="border-purple-500/30 hover:border-purple-500 text-purple-300"
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                {/* Local Dev Mode bypass trigger button */}
                <Button 
                  onClick={handleDevModeSignIn}
                  variant="ghost"
                  className="hidden sm:flex border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 text-purple-300 gap-1.5"
                  title="Bypass Google OAuth for local offline testing"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Dev Mode
                </Button>
                <Button 
                  onClick={handleCreateCampaignClick}
                  variant="secondary"
                  className="bg-white text-black hover:bg-neutral-200 shadow-lg shadow-white/5 hover:scale-[1.02]"
                >
                  Organiser Sign In
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="flex-1 w-full py-20 lg:py-28 flex items-center">
      <PageContainer className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Left Column: Headline */}
          <div className="lg:col-span-7 flex flex-col items-start text-left gap-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border border-purple-500/20 bg-purple-500/10 text-purple-300">
              <Flame className="w-3.5 h-3.5 text-purple-400" />
              <span>Launch a Frame Campaign in 5 Minutes</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-100 to-neutral-400">
              Empower Supporters.<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">Branded Photos</span> at Scale.
            </h1>
            
            <p className="text-base sm:text-lg text-neutral-400 max-w-xl leading-relaxed">
              The premium, ad-free alternative to Twibbonize. Create beautiful, transparent photo overlays for festivals, elections, or corporate events. Distributed via a single link with <strong className="text-white font-semibold">zero friction</strong> and <strong className="text-white font-semibold">complete client-side privacy</strong>.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-2">
              <Button 
                onClick={handleCreateCampaignClick}
                size="lg"
                className="px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-semibold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Start Free Campaign
                <ArrowRight className="w-5 h-5" />
              </Button>
              
              {/* Dev mode bypass login button for local testing */}
              {!user && (
                <Button 
                  onClick={handleDevModeSignIn}
                  size="lg"
                  variant="outline"
                  className="px-8 py-4 rounded-2xl border-purple-500/30 hover:border-purple-500/60 bg-purple-500/10 hover:bg-purple-500/15 font-semibold text-lg text-purple-300 text-center transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/10 hover:scale-[1.02]"
                >
                  <Terminal className="w-5 h-5" />
                  Developer Bypass
                </Button>
              )}
            </div>
          </div>

          {/* Right Column: Premium Mockup (Clean layout aspect-ratio fixes to prevent overlaps) */}
          <div className="lg:col-span-5 w-full flex items-center justify-center">
            <Card className="flex flex-col items-center justify-center w-full max-w-[420px] p-6 sm:p-8 rounded-3xl shadow-2xl border border-white/5">
              
              {/* Mockup Header (Proper layout, no absolute overlaps!) */}
              <div className="w-full flex justify-between items-center text-[10px] text-neutral-400 font-mono tracking-wider mb-4 pb-2 border-b border-white/5">
                <span>LIVE MOCKUP PREVIEW</span>
                <span className="text-purple-400 animate-pulse flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  COMPOSITING
                </span>
              </div>

              {/* Canvas Mockup viewport (Perfect aspect square without inner size redundancies) */}
              <div className="relative w-full aspect-square overflow-hidden rounded-2xl border border-white/5 bg-neutral-950 flex items-center justify-center select-none shadow-inner">
                {/* Supporter image backing */}
                <div 
                  className="absolute w-full h-full transition-transform duration-300 ease-out flex items-center justify-center bg-gradient-to-tr from-neutral-900 to-black"
                  style={{
                    transform: `scale(${mockZoom}) translate(${mockX}px, 0px)`,
                  }}
                >
                  <div className="w-40 h-40 rounded-full bg-neutral-800 border border-purple-500/20 relative overflow-hidden flex items-center justify-center shadow-lg shadow-purple-500/5">
                    <div className="w-24 h-24 rounded-full bg-purple-500/5 flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-purple-400/40" />
                    </div>
                  </div>
                </div>

                {/* Static frame overlay overlaying the face */}
                <div className="absolute inset-0 z-20 pointer-events-none border-[14px] border-purple-600/30 flex flex-col justify-between p-6">
                  <div className="flex justify-between items-start">
                    <div className="bg-purple-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded shadow uppercase tracking-widest">
                      #MYSTORY
                    </div>
                    <div className="w-6 h-6 rounded-full bg-white/10 backdrop-blur border border-white/10 flex items-center justify-center text-white text-xs">
                      ★
                    </div>
                  </div>
                  <div className="text-center bg-black/50 backdrop-blur border border-white/10 py-2.5 px-3 rounded-lg shadow-2xl">
                    <h3 className="text-white font-extrabold text-xs uppercase tracking-wider">
                      Green Planet 2026
                    </h3>
                    <p className="text-purple-300 text-[10px] font-medium mt-0.5">
                      I Stand For Sustainable Futures
                    </p>
                  </div>
                </div>
              </div>

              {/* Interactive controls underneath mockup */}
              <div className="w-full mt-5 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-neutral-400 font-semibold">
                  <span>Adjust Zoom:</span>
                  <span className="text-purple-300 font-mono">{(mockZoom * 100).toFixed(0)}%</span>
                </div>
                <div className="flex gap-4 items-center">
                  <input 
                    type="range" 
                    min="0.8" 
                    max="2" 
                    step="0.01"
                    value={mockZoom}
                    onChange={(e) => setMockZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-purple-500 bg-white/10 h-1 rounded-lg appearance-none cursor-pointer"
                  />
                  <Button 
                    onClick={() => { setMockZoom(1.1); setMockX(0); }}
                    variant="outline"
                    size="sm"
                    className="px-2.5 py-1 text-[10px] font-semibold text-neutral-300"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </Card>
          </div>

        </PageContainer>
      </section>

      {/* 3. Features Matrix */}
      <section id="features" className="w-full bg-neutral-950/40 border-y border-white/5 py-24 lg:py-32">
        <PageContainer>
          <div className="text-center max-w-2xl mx-auto mb-20 flex flex-col gap-4">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white">
              Engineered for Speed, Growth, and Privacy
            </h2>
            <p className="text-neutral-400 text-base">
              Say goodbye to intrusive advertising templates and clunky editor flows. My Story features high-performance visual tools designed to highlight your campaign.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card className="p-8 rounded-2xl flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Launch in 60 Seconds</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Organisers sign in via Google, type a name, choose a customized slug (e.g. yoursite.com/c/pride), upload a transparent PNG frame, and immediately publish.
              </p>
            </Card>

            {/* Feature 2 */}
            <Card className="p-8 rounded-2xl flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">100% Client-Side Privacy</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Participants' uploaded selfies and final composite frames are computed entirely in the local browser canvas. No participant photos are uploaded to any server, guaranteeing compliance.
              </p>
            </Card>

            {/* Feature 3 */}
            <Card className="p-8 rounded-2xl flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Advanced Devices Telemetry</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Organiser dashboard records campaign views and downloads. Collects locales, geographic regions, and active browser user-agents, grouped in dynamic interactive charts.
              </p>
            </Card>

            {/* Feature 4 */}
            <Card className="p-8 rounded-2xl flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Fluid Touch Canvas Engine</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Supports seamless drag, scale slider, and touch mechanics. Participants view frames composited live, scale and align precisely inside transparent overlays, and download JPEG files instantly.
              </p>
            </Card>

            {/* Feature 5 */}
            <Card className="p-8 rounded-2xl flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Dynamic SEO Previews</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Powered by Next.js Server-Side Rendering (SSR). Every campaign has indexable OpenGraph tags so shared links dynamically show your actual frame overlay card in messengers.
              </p>
            </Card>

            {/* Feature 6 */}
            <Card className="p-8 rounded-2xl flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Future-Proof Flexibility</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Engineered using Postgres JSONB columns. Future enhancements like multi-slot frame layouts, custom text fields, custom domains, or branding palettes can be deployed on-the-fly.
              </p>
            </Card>
          </div>
        </PageContainer>
      </section>

      {/* 4. Footer */}
      <footer className="w-full border-t border-white/5 py-12 bg-black text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-purple-500 flex items-center justify-center animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-neutral-300">My Story</span>
          </div>
          <p>© 2026 My Story. Built as a premium, ad-free, privacy-first Twibbonize alternative.</p>
        </div>
      </footer>

      {/* Auth Selection Modal using new shadcn-like Dialog component */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="max-w-md bg-neutral-900 border border-white/5 shadow-2xl rounded-3xl p-6 sm:p-8 flex flex-col gap-6">
          
          {/* Header */}
          <DialogHeader className="flex flex-col gap-2 text-center mt-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto shadow-lg shadow-purple-500/5">
              <Sparkles className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-white tracking-tight">Organiser Sign In</DialogTitle>
            <DialogDescription className="text-neutral-400 text-xs leading-relaxed max-w-sm mx-auto">
              Access your organiser dashboard to launch frame campaigns and parse supporter metrics.
            </DialogDescription>
          </DialogHeader>

          {/* Info Box explaining offline behavior */}
          <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 text-purple-300 text-xs flex gap-2.5 items-start">
            <Terminal className="w-4 h-4 shrink-0 mt-0.5 text-purple-400" />
            <div className="flex flex-col gap-0.5 leading-relaxed text-left">
              <span className="font-bold text-white">Local Testing Info</span>
              <span>Standard Google Sign-In requires an active local Supabase stack emulator running via Docker. For offline testing, use the bypass option below.</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3">
            {/* Option 1: Developer Bypass (Sandbox) */}
            <Button 
              onClick={handleDevModeSignIn}
              variant="outline"
              className="w-full py-6 rounded-xl font-bold border-purple-500/30 hover:border-purple-500 bg-purple-500/10 hover:bg-purple-500/15 text-purple-300 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] group shadow-lg shadow-purple-500/5"
            >
              <Terminal className="w-4.5 h-4.5 group-hover:animate-pulse text-purple-400" />
              <span>Developer Bypass (Offline Sandbox)</span>
            </Button>

            {/* Option 2: Google OAuth */}
            <Button 
              onClick={() => {
                setShowAuthModal(false);
                signInWithGoogle().catch(err => {
                  logger.error('LandingPage', 'Google Sign-In error', err);
                });
              }}
              variant="secondary"
              className="w-full py-6 rounded-xl font-bold bg-white text-black hover:bg-neutral-200 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-white/5"
            >
              {/* Simulated Google Logo (Colored circles) */}
              <span className="flex items-center gap-1 shrink-0">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce delay-75"></span>
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce delay-150"></span>
              </span>
              <span>Sign In with Google Account</span>
            </Button>
          </div>

          {/* Privacy note */}
          <p className="text-[10px] text-neutral-500 text-center leading-relaxed">
            By continuing, you agree to secure data isolation. Organizer configurations are persisted locally or in your custom PostgreSQL backend.
          </p>
        </DialogContent>
      </Dialog>

    </div>
  );
}
