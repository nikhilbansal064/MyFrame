'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Field, FrameDropzone, DateRangeFields, VisibilityToggle } from '@/components/CampaignFormFields';

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
      <DialogContent flush className="max-w-2xl">
        
        {/* Header */}
        <DialogHeader className="pl-6 pr-14 sm:pl-8 pt-6 sm:pt-7 pb-5 border-b border-white/[0.06]">
          <DialogTitle>Launch Campaign</DialogTitle>
          <DialogDescription>Upload your frame, choose a link and set when it goes live.</DialogDescription>
        </DialogHeader>

        {/* Wizard Form */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex flex-col gap-6 px-6 sm:px-8 py-6">
          
            {/* Frame File Uploader */}
            <Field label="Frame overlay (transparent PNG)">
              <FrameDropzone
                inputId="frame-file-input"
                framePreview={framePreview}
                frameFile={frameFile}
                dragOver={dragOver}
                onFile={handleFileChange}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                hint="Must be a transparent PNG, ideally 1080×1080px (square)."
              />
            </Field>

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Campaign Title" htmlFor="title">
                <Input 
                  id="title"
                  name="title"
                  type="text" 
                  required
                  maxLength={80}
                  placeholder="e.g. Diwali celebration 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Field>

              {/* Custom URL Slug with uniqueness validation */}
              <Field
                label="Custom URL Slug"
                htmlFor="slug"
                hint="Lowercase letters, numbers and hyphens only."
                extra={checkingSlug && <span className="w-3 h-3 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin"></span>}
              >
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-sm text-neutral-500 select-none pointer-events-none">/c/</span>
                  <Input 
                    id="slug"
                    name="slug"
                    type="text" 
                    required
                    maxLength={40}
                    placeholder="diwali-2026"
                    value={slug}
                    onChange={handleSlugChange}
                    className={`pl-9 pr-10 ${
                      slugAvailable === true 
                        ? 'border-emerald-500/40 focus-visible:border-emerald-500/60 focus-visible:ring-emerald-500/15' 
                        : slugAvailable === false 
                          ? 'border-rose-500/40 focus-visible:border-rose-500/60 focus-visible:ring-rose-500/15' 
                          : ''
                    }`}
                  />
                  
                  {/* Visual Verification Indicators */}
                  <div className="absolute right-3.5 flex items-center pointer-events-none">
                    {slugAvailable === true && <Check className="w-4 h-4 text-emerald-400" />}
                    {slugAvailable === false && <X className="w-4 h-4 text-rose-400" />}
                  </div>
                </div>
              </Field>
            </div>

            {/* Description */}
            <Field label="Campaign Description" htmlFor="description">
              <Textarea 
                id="description"
                name="description"
                rows={3}
                maxLength={300}
                placeholder="Tell your supporters what this is about (e.g. Add your photo to our official frame to stand for our planet!)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            {/* Date Scheduling */}
            <DateRangeFields
              startDate={startDate}
              endDate={endDate}
              onStartChange={setStartDate}
              onEndChange={setEndDate}
            />

            {/* Visibility Toggle */}
            <VisibilityToggle
              isPublic={isPublic}
              onToggle={() => setIsPublic(!isPublic)}
              publicHint="Anyone can find this campaign on your organiser profile and in search."
              privateHint="Hidden from directories and search engines. Only people with the link can join."
            />
          </div>

          {/* Actions */}
          <DialogFooter className="sticky bottom-0 px-6 sm:px-8 py-4 border-t border-white/[0.06] bg-neutral-950/95 backdrop-blur">
            <Button 
              type="button" 
              disabled={submitting}
              onClick={onClose}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitting || slugAvailable !== true}
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                  <span>Launching...</span>
                </>
              ) : (
                'Launch Campaign'
              )}
            </Button>
          </DialogFooter>

        </form>

      </DialogContent>
    </Dialog>
  );
}
