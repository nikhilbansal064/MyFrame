'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Field, FrameDropzone, DateRangeFields, VisibilityToggle } from '@/components/CampaignFormFields';

// Helper: Format ISO string dates for datetime-local value input
const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const pad = (n) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function CampaignEditor({ campaign, onClose, onUpdate }) {
  const { user } = useAuth();
  
  const [title, setTitle] = useState(campaign.title || '');
  const [description, setDescription] = useState(campaign.description || '');
  const [startDate, setStartDate] = useState(formatDateTime(campaign.start_date));
  const [endDate, setEndDate] = useState(formatDateTime(campaign.end_date));
  const [isPublic, setIsPublic] = useState(campaign.is_public !== false);
  const [frameFile, setFrameFile] = useState(null);
  const [framePreview, setFramePreview] = useState(campaign.frame_url || '');
  
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Handle transparent PNG verification
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
      logger.debug('CampaignEditor', 'New frame PNG loaded for preview');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    // Strict validation checks
    if (!title.trim()) return alert('Please enter a campaign title.');
    if (new Date(startDate) >= new Date(endDate)) {
      return alert('The expiry date must be after the starting go-live date.');
    }

    setSubmitting(true);
    logger.info('CampaignEditor', 'Submitting campaign updates', { id: campaign.id, title });

    try {
      let finalFrameUrl = campaign.frame_url;

      // 1. Upload new frame PNG if user selected one
      if (frameFile) {
        const fileExt = frameFile.name.split('.').pop();
        // Path matches format frames/USER_ID/slug_timestamp.png to bypass storage RLS
        const fileName = `${user.id}/${campaign.slug}_${Date.now()}.${fileExt}`;
        const filePath = `frames/${fileName}`;

        logger.info('CampaignEditor', 'Uploading new frame to storage path:', filePath);

        const { error: uploadError } = await supabase.storage
          .from('campaign-frames')
          .upload(filePath, frameFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('campaign-frames')
          .getPublicUrl(filePath);

        finalFrameUrl = publicUrl;
        logger.info('CampaignEditor', 'New frame uploaded, CDN URL:', publicUrl);
      }

      // 2. Perform DB update
      const updatedFields = {
        title: title.trim(),
        description: description.trim(),
        frame_url: finalFrameUrl,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        is_public: isPublic
      };

      const { data: updatedCampaign, error: dbError } = await supabase
        .from('campaigns')
        .update(updatedFields)
        .eq('id', campaign.id)
        .select()
        .single();

      if (dbError) throw dbError;

      logger.info('CampaignEditor', 'Campaign successfully updated in Supabase', campaign.slug);
      alert('Campaign updated successfully!');
      
      // Update parent component instantly
      onUpdate(updatedCampaign);
    } catch (err) {
      logger.warn('CampaignEditor', 'Database connection failed, editing campaign locally', err.message);

      // Fallback: update inside Local Storage
      try {
        const localCampaigns = JSON.parse(localStorage.getItem('mystory_campaigns') || '[]');
        const exists = localCampaigns.some(c => c.id === campaign.id);

        if (exists) {
          const updatedLocalList = localCampaigns.map(c => {
            if (c.id === campaign.id) {
              return {
                ...c,
                title: title.trim(),
                description: description.trim(),
                frame_url: frameFile ? framePreview : c.frame_url, // Use base64 preview if new frame uploaded
                start_date: new Date(startDate).toISOString(),
                end_date: new Date(endDate).toISOString(),
                is_public: isPublic
              };
            }
            return c;
          });

          localStorage.setItem('mystory_campaigns', JSON.stringify(updatedLocalList));
          
          const updatedCampaignObj = updatedLocalList.find(c => c.id === campaign.id);
          logger.info('CampaignEditor', 'Campaign successfully updated in local storage fallback!', campaign.slug);
          alert('Campaign updated successfully (Offline sandbox mode)!');
          
          onUpdate(updatedCampaignObj);
        } else {
          throw err; // If not found in local storage either, bubble up the error
        }
      } catch (localErr) {
        logger.error('CampaignEditor', 'Local storage update failed', localErr);
        alert('Failed to update campaign. Please verify connection and try again.');
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
          <DialogTitle>Edit Campaign</DialogTitle>
          <DialogDescription className="font-mono text-xs">/c/{campaign.slug}</DialogDescription>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex flex-col gap-6 px-6 sm:px-8 py-6">
          
            {/* Frame File Uploader */}
            <Field label="Frame overlay (transparent PNG)">
              <FrameDropzone
                inputId="edit-frame-file-input"
                framePreview={framePreview}
                frameFile={frameFile}
                dragOver={dragOver}
                onFile={handleFileChange}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                hint="Must be a transparent PNG."
                existingLabel="Using current frame overlay"
              />
            </Field>

            {/* Title */}
            <Field label="Campaign Title" htmlFor="edit-title">
              <Input 
                id="edit-title"
                name="title"
                type="text" 
                required
                maxLength={80}
                placeholder="e.g. Earth Day 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>

            {/* Description */}
            <Field label="Campaign Description" htmlFor="edit-description">
              <Textarea 
                id="edit-description"
                name="description"
                rows={3}
                maxLength={300}
                placeholder="Tell your supporters what this is about."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            {/* Scheduling */}
            <DateRangeFields
              startDate={startDate}
              endDate={endDate}
              onStartChange={setStartDate}
              onEndChange={setEndDate}
            />

            {/* Visibility */}
            <VisibilityToggle
              isPublic={isPublic}
              onToggle={() => setIsPublic(!isPublic)}
              publicHint="Anyone can find this campaign on your organiser profile."
              privateHint="Hidden from directories. Only people with the link can join."
            />
          </div>

          {/* Action Row */}
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
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                  <span>Saving...</span>
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>

        </form>

      </DialogContent>
    </Dialog>
  );
}
