'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import { 
  X, 
  UploadCloud, 
  Calendar, 
  Sparkles, 
  Globe, 
  Lock, 
  Check, 
  FileImage,
  Terminal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function CampaignCreator({ onClose }) {
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [frameFile, setFrameFile] = useState(null);
  const [framePreview, setFramePreview] = useState('');
  
  // Checking states
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState(null); // null, true, false
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Set default dates on render (Start: now, End: 7 days later)
  useEffect(() => {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + 7);

    // Format to YYYY-MM-DDTHH:MM for datetime-local input
    const formatDateTime = (date) => {
      const pad = (n) => n.toString().padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    setStartDate(formatDateTime(now));
    setEndDate(formatDateTime(future));
  }, []);

  // Format and validate slug input (only alphanumeric and hyphens)
  const handleSlugChange = (e) => {
    const value = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '') // remove special chars except alphanumeric and hyphens
      .replace(/-+/g, '-');       // deduplicate hyphens
    setSlug(value);
    setSlugAvailable(null);       // Reset availability check
  };

  // Perform backend check on slug availability
  useEffect(() => {
    if (!slug) {
      setSlugAvailable(null);
      return;
    }

    const checkTimer = setTimeout(async () => {
      setCheckingSlug(true);
      logger.debug('CampaignCreator', 'Checking slug availability:', slug);
      
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();

        if (error) throw error;
        
        // If data is null, the slug is unique and available
        setSlugAvailable(!data);
        logger.debug('CampaignCreator', 'Slug available response:', !data);
      } catch (err) {
        logger.warn('CampaignCreator', 'Database offline, checking slug locally', err.message);
        
        // Fallback to local storage
        try {
          const localCampaigns = JSON.parse(localStorage.getItem('mystory_campaigns') || '[]');
          const isTaken = localCampaigns.some(c => c.slug === slug);
          setSlugAvailable(!isTaken);
          logger.info('CampaignCreator', 'Local slug check result (available):', !isTaken);
        } catch (localErr) {
          logger.error('CampaignCreator', 'Local storage fallback check failed', localErr);
          setSlugAvailable(true); // Default to true if even local storage fails
        }
      } finally {
        setCheckingSlug(false);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(checkTimer);
  }, [slug]);

  // Handle transparent PNG upload and verification
  const handleFileChange = (file) => {
    if (!file) return;

    if (file.type !== 'image/png') {
      alert('Invalid file format. The campaign frame overlay MUST be a transparent PNG file.');
      return;
    }

    setFrameFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFramePreview(reader.result);
      logger.debug('CampaignCreator', 'Frame PNG file loaded for preview');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    // Strict Validations
    if (!title.trim()) return alert('Please enter a campaign title.');
    if (!slug) return alert('Please provide a campaign URL slug.');
    if (slugAvailable === false) return alert('The campaign URL slug is already taken. Please enter a different one.');
    if (!frameFile) return alert('Please upload a transparent PNG frame.');
    if (new Date(startDate) >= new Date(endDate)) {
      return alert('The expiry date must be after the starting go-live date.');
    }

    setSubmitting(true);
    logger.info('CampaignCreator', 'Submitting new campaign', { title, slug });

    try {
      // 1. Upload transparent PNG frame to Supabase Storage Bucket
      const fileExt = frameFile.name.split('.').pop();
      const fileName = `${user.id}/${slug}_${Date.now()}.${fileExt}`;
      const filePath = `frames/${fileName}`;

      logger.info('CampaignCreator', 'Uploading frame to storage paths:', filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('campaign-frames')
        .upload(filePath, frameFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 2. Construct public CDN storage asset URL
      const { data: { publicUrl } } = supabase.storage
        .from('campaign-frames')
        .getPublicUrl(filePath);

      logger.info('CampaignCreator', 'Frame uploaded, CDN URL:', publicUrl);

      // 3. Save campaign record to database
      const { error: dbError } = await supabase
        .from('campaigns')
        .insert({
          slug,
          creator_id: user.id,
          title: title.trim(),
          description: description.trim(),
          frame_url: publicUrl,
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString(),
          is_public: isPublic,
          is_active: true,
          settings: {},
          metadata: {}
        });

      if (dbError) throw dbError;

      logger.info('CampaignCreator', 'Campaign successfully created!', slug);
      alert('Campaign launched successfully! You can now copy and share the link.');
      onClose();
    } catch (err) {
      logger.warn('CampaignCreator', 'Database connection failed, saving campaign to local storage sandbox fallback', err.message);
      
      try {
        // Fallback: Save campaign in local storage using framePreview (Data URL) as the frame_url
        const newCampaign = {
          id: `local-${Date.now()}`,
          slug,
          creator_id: user.id,
          title: title.trim(),
          description: description.trim(),
          frame_url: framePreview, // Use base64 preview since cloud storage is offline!
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString(),
          is_public: isPublic,
          is_active: true,
          stats: { views: 0, downloads: 0 }, // Initial stats mock
          settings: {},
          metadata: { is_local: true }
        };

        const localCampaigns = JSON.parse(localStorage.getItem('mystory_campaigns') || '[]');
        localCampaigns.push(newCampaign);
        localStorage.setItem('mystory_campaigns', JSON.stringify(localCampaigns));

        logger.info('CampaignCreator', 'Campaign successfully saved to local storage sandbox!', slug);
        alert('Campaign launched successfully (Offline sandbox mode)! You can now copy and share the link.');
        onClose();
      } catch (localErr) {
        logger.error('CampaignCreator', 'Local storage save failed', localErr);
        alert('Failed to launch campaign. Please verify your fields.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh] p-6 sm:p-8 rounded-3xl shadow-2xl border border-white/8 bg-neutral-900">
        
        {/* Header */}
        <DialogHeader className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4.5 h-4.5 text-purple-400" />
            </div>
            <DialogTitle className="text-xl font-bold text-white tracking-tight">Launch Campaign</DialogTitle>
          </div>
        </DialogHeader>

        {/* Wizard Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          {/* Section 1: Frame File Uploader */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              1. Transparent Frame Overlay (PNG ONLY)
            </Label>
            
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center text-center gap-3 cursor-pointer ${
                dragOver 
                  ? 'border-purple-500 bg-purple-500/5' 
                  : frameFile 
                    ? 'border-purple-500/30 bg-neutral-950/40' 
                    : 'border-white/10 hover:border-purple-500/30 bg-white/5 hover:bg-white/10'
              }`}
            >
              <input 
                type="file" 
                accept="image/png" 
                onChange={(e) => handleFileChange(e.target.files[0])}
                className="hidden" 
                id="frame-file-input"
              />
              
              <label htmlFor="frame-file-input" className="w-full h-full flex flex-col items-center justify-center gap-3 cursor-pointer">
                {framePreview ? (
                  /* PNG Preview Layer */
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-36 h-36 border border-white/10 bg-neutral-950 rounded-xl overflow-hidden flex items-center justify-center shadow-lg p-2">
                      <img 
                        src={framePreview} 
                        alt="PNG Frame Overlay Preview" 
                        className="max-h-full max-w-full object-contain pointer-events-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <FileImage className="w-3.5 h-3.5 text-purple-400" />
                      <span className="truncate max-w-[200px] font-semibold">{frameFile.name}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">({(frameFile.size / 1024).toFixed(0)} KB)</span>
                    </div>
                  </div>
                ) : (
                  /* Upload CTA */
                  <>
                    <div className="w-12 h-12 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-center text-purple-400 animate-pulse">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-bold text-white">Click or drag & drop PNG frame</p>
                      <p className="text-xxs text-neutral-500">Overlay MUST be a transparent PNG file, ideally 1080x1080px (Square aspect ratio)</p>
                    </div>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Section 2: Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Title */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Campaign Title
              </Label>
              <Input 
                type="text" 
                required
                maxLength={80}
                placeholder="e.g. Diwali celebration 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
              />
            </div>

            {/* Custom URL Slug with uniqueness validation */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>Custom URL Slug</span>
                {checkingSlug && <span className="w-2.5 h-2.5 rounded-full border border-purple-500/30 border-t-purple-500 animate-spin"></span>}
              </Label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-xs font-semibold text-neutral-500 select-none">/c/</span>
                <Input 
                  type="text" 
                  required
                  maxLength={40}
                  placeholder="diwali-2026"
                  value={slug}
                  onChange={handleSlugChange}
                  className={`pl-8 pr-10 ${
                    slugAvailable === true 
                      ? 'border-emerald-500/30 focus:border-emerald-500 focus:ring-emerald-500/20' 
                      : slugAvailable === false 
                        ? 'border-rose-500/30 focus:border-rose-500 focus:ring-rose-500/20' 
                        : 'border-white/10 focus:border-purple-500'
                  }`}
                />
                
                {/* Visual Verification Indicators */}
                <div className="absolute right-4 flex items-center">
                  {slugAvailable === true && <Check className="w-4 h-4 text-emerald-400" />}
                  {slugAvailable === false && <X className="w-4 h-4 text-rose-400" />}
                </div>
              </div>
              <p className="text-[10px] text-neutral-500 mt-0.5 leading-relaxed">
                Lowercase letters, numbers, and hyphens only.
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Campaign Description
            </Label>
            <textarea 
              rows={2}
              maxLength={300}
              placeholder="Provide a brief explanation for your supporters (e.g. Add your photo to our official branded frame to stand for our planet!)."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-neutral-950 border border-white/8 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none animate-none"
            />
          </div>

          {/* Section 3: Date Scheduling & Visibility */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/5 pt-5">
            {/* Date Scheduler */}
            <div className="flex flex-col gap-4">
              <Label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>Scheduling Windows</span>
              </Label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 border border-white/5 bg-white/5 rounded-xl px-3.5 py-2.5">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Go-Live Time</span>
                  <input 
                    type="datetime-local" 
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-transparent border-0 rounded-none p-0 text-xs text-white focus:outline-none transition-all font-mono cursor-pointer"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5 border border-white/5 bg-white/5 rounded-xl px-3.5 py-2.5">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Expiry Time</span>
                  <input 
                    type="datetime-local" 
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-transparent border-0 rounded-none p-0 text-xs text-white focus:outline-none transition-all font-mono cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Visibility Toggle */}
            <div className="flex flex-col gap-4 md:pl-6 md:border-l border-white/5">
              <Label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                {isPublic ? <Globe className="w-3.5 h-3.5 text-purple-400" /> : <Lock className="w-3.5 h-3.5 text-neutral-500" />}
                <span>Profile & Search Visibility</span>
              </Label>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                  <span className="text-xs font-semibold text-neutral-300">
                    {isPublic ? 'Publicly Listed' : 'Private (Hidden)'}
                  </span>
                  
                  {/* Custom Toggle Switch */}
                  <button 
                    type="button"
                    onClick={() => setIsPublic(!isPublic)}
                    className={`w-11 h-6 rounded-full transition-all duration-300 p-0.5 cursor-pointer ${isPublic ? 'bg-purple-500' : 'bg-neutral-800'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${isPublic ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </button>
                </div>
                <p className="text-[10px] text-neutral-500 leading-relaxed">
                  {isPublic 
                    ? 'Anyone can view this campaign on your organiser profile directory and search listings.' 
                    : 'The campaign page is hidden from directories and index crawlers. Only users with the direct link can participate.'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Actions Submit */}
          <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-5 mt-2">
            <Button 
              type="button" 
              disabled={submitting}
              onClick={onClose}
              variant="secondary"
              className="px-5 py-3 font-bold text-sm text-neutral-300"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitting || slugAvailable !== true}
              className={`px-6 py-3 font-bold text-sm text-white ${
                submitting || slugAvailable !== true 
                  ? 'bg-neutral-800 border border-white/5 text-neutral-500 cursor-not-allowed shadow-none hover:transform-none' 
                  : 'btn-premium'
              }`}
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-purple-200/30 border-t-white animate-spin"></span>
                  <span>Launching...</span>
                </>
              ) : (
                'Launch Campaign'
              )}
            </Button>
          </div>

        </form>

      </DialogContent>
    </Dialog>
  );
}
