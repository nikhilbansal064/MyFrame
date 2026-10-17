# Analysis Report: Dashboard Interactions (Milestone 1)

This report details findings and proposed implementations for introducing interactive campaign editing, optimizing the deletion flow, and resolving database schema discrepancies in the My Story Web Application.

---

## 1. Analysis of Deletion Flow in `src/app/dashboard/page.jsx`

### Current Implementation
In the current implementation of `handleDeleteCampaign` (lines 185-213), the flow is pessimistic and blocks UI updates:
1. A standard `confirm()` modal is shown.
2. If confirmed, a delete request is sent to Supabase: `.from('campaigns').delete().eq('id', campaignId)`.
3. The function awaits completion of this network request.
4. Once completed successfully, it triggers `fetchCampaigns()` to completely reload the list from the database.
5. If the request fails, it catches the error, deletes the campaign from local storage, and again triggers `fetchCampaigns()`.

**Critique**: This requires multiple network roundtrips (delete request + fetch request), leading to a slow and unresponsive UI update (typically 300ms to several seconds depending on latency).

### Optimistic Deletion Implementation (Under 100ms)
To make deletion feel instantaneous:
1. Immediately filter out the deleted campaign from the local `campaigns` state.
2. Calculate and update dashboard stats locally.
3. Perform the network request asynchronously in the background.
4. Keep a backup copy of campaigns and stats. If the deletion fails, revert the state to the backup and show an error notification.

#### Exact Code Changes for `src/app/dashboard/page.jsx`
Replace the existing `handleDeleteCampaign` with the following:

```javascript
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
```

---

## 2. Table Schema & Local Storage Fallback Analysis

Our code review reveals a structural mismatch between the migration scripts and the functional codebase:

### DB Schema Discrepancy
- **Active Code Schema (Embedded)**: The application code (`CampaignCreator.jsx`, `CampaignParticipantClient.jsx`, and `generateMetadata` in `c/[slug]/page.jsx`) assumes that the campaigns table has a `frame_url` column directly:
  ```sql
  frame_url TEXT -- CDN URL of the PNG image frame
  ```
- **Migration Schema (Decoupled)**: The database initialization migration file `supabase/migrations/20260530000000_init.sql` decouples frames into a separate `public.frames` table and defines campaigns as:
  ```sql
  frame_id UUID REFERENCES public.frames(id) ON DELETE RESTRICT NOT NULL
  ```
  And removes `frame_url` from the campaigns table.

*Key Finding*: The React components do not write or join with `public.frames`. They execute queries against `campaigns.frame_url` directly. If the database schema is updated to enforce `frame_id`, the client insertions will break unless updated. For Milestone 1, we design `CampaignEditor.jsx` to support the **active code schema** (`frame_url` on `campaigns`) to remain aligned with the existing code, but add support/recommendations for transition.

### Verbatim Database Schema of Campaigns (Active Code Model)
Based on current reads/inserts:
| Column Name | Type | Constraints / Default | Purpose |
|---|---|---|---|
| `id` | uuid | Primary Key, default `gen_random_uuid()` | Unique Campaign ID |
| `slug` | text | Unique, NOT NULL | Custom URL slug (e.g., `diwali-2026`) |
| `creator_id` | uuid | FK `public.organisers(id)`, NOT NULL | Owner organizer UUID |
| `title` | text | NOT NULL, Max 80 chars | Public heading |
| `description` | text | Max 300 chars | Public explanation text |
| `frame_url` | text | NOT NULL | CDN public image URL (or base64 fallback) |
| `start_date` | timestamptz | NOT NULL | Scheduled start window |
| `end_date` | timestamptz | NOT NULL | Scheduled expiry window |
| `is_active` | boolean | DEFAULT true, NOT NULL | Campaign active/paused switch |
| `is_public` | boolean | DEFAULT true, NOT NULL | Profile/search listing toggle |
| `settings` | jsonb | DEFAULT '{}' | Client style config |
| `metadata` | jsonb | DEFAULT '{}' | Metadata JSON object |
| `created_at` | timestamptz | DEFAULT `now()`, NOT NULL | Date created |

### Local Storage Fallback Structure (`mystory_campaigns`)
When Supabase is offline, campaigns are loaded/saved to a local storage key called `mystory_campaigns`. An item inside the JSON array has this schema:
```json
{
  "id": "local-1717904000000",
  "slug": "campaign-slug",
  "creator_id": "current-user-uuid",
  "title": "Campaign Title String",
  "description": "Campaign Description Text",
  "frame_url": "data:image/png;base64,iVBORw0KGgo...", 
  "start_date": "2026-06-09T15:38:28.000Z",
  "end_date": "2026-06-16T15:38:28.000Z",
  "is_public": true,
  "is_active": true,
  "stats": {
    "views": 0,
    "downloads": 0
  },
  "settings": {},
  "metadata": {
    "is_local": true
  }
}
```
*Note*: `frame_url` stores a base64 encoded PNG Data URL since standard Supabase file storage is unreachable offline.

---

## 3. Component Design: `src/components/CampaignEditor.jsx`

Below is the design of `CampaignEditor.jsx` component. It mirrors the styling of `CampaignCreator.jsx` while adding values initialization and support for editing.

```jsx
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
  FileImage,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function CampaignEditor({ campaign, onClose, onUpdate }) {
  const { user } = useAuth();
  
  const [title, setTitle] = useState(campaign.title || '');
  const [description, setDescription] = useState(campaign.description || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPublic, setIsPublic] = useState(campaign.is_public !== false);
  const [frameFile, setFrameFile] = useState(null);
  const [framePreview, setFramePreview] = useState(campaign.frame_url || '');
  
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Helper: Format ISO string dates for datetime-local value input
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // Pre-populate fields on mount
  useEffect(() => {
    if (campaign) {
      setStartDate(formatDateTime(campaign.start_date));
      setEndDate(formatDateTime(campaign.end_date));
    }
  }, [campaign]);

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
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh] p-6 sm:p-8 rounded-3xl shadow-2xl border border-white/8 bg-neutral-900">
        
        {/* Header */}
        <DialogHeader className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4.5 h-4.5 text-purple-400" />
            </div>
            <DialogTitle className="text-xl font-bold text-white tracking-tight">Edit Campaign</DialogTitle>
          </div>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          {/* Section 1: Frame File Uploader */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              1. Transparent Frame Overlay (PNG ONLY - Leave unchanged to keep current)
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
                id="edit-frame-file-input"
              />
              
              <label htmlFor="edit-frame-file-input" className="w-full h-full flex flex-col items-center justify-center gap-3 cursor-pointer">
                {framePreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-36 h-36 border border-white/10 bg-neutral-950 rounded-xl overflow-hidden flex items-center justify-center shadow-lg p-2">
                      <img 
                        src={framePreview} 
                        alt="PNG Frame Overlay Preview" 
                        className="max-h-full max-w-full object-contain pointer-events-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      {frameFile ? (
                        <>
                          <FileImage className="w-3.5 h-3.5 text-purple-400" />
                          <span className="truncate max-w-[200px] font-semibold">{frameFile.name}</span>
                          <span className="text-[10px] text-neutral-500 font-mono">({(frameFile.size / 1024).toFixed(0)} KB)</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                          <span className="font-semibold text-neutral-500">Using existing frame overlay</span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-center text-purple-400 animate-pulse">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-bold text-white">Click or drag & drop PNG frame</p>
                      <p className="text-xxs text-neutral-500">Overlay MUST be a transparent PNG file</p>
                    </div>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Section 2: Metadata */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Campaign Title
            </Label>
            <Input 
              type="text" 
              required
              maxLength={80}
              placeholder="e.g. Earth Day 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Campaign Description
            </Label>
            <textarea 
              rows={2}
              maxLength={300}
              placeholder="Provide a brief explanation for your supporters."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-neutral-950 border border-white/8 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 resize-none"
            />
          </div>

          {/* Section 3: Scheduling & Visibility */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/5 pt-5">
            {/* Scheduling */}
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
                    className="w-full bg-transparent border-0 rounded-none p-0 text-xs text-white focus:outline-none font-mono cursor-pointer"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5 border border-white/5 bg-white/5 rounded-xl px-3.5 py-2.5">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Expiry Time</span>
                  <input 
                    type="datetime-local" 
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-transparent border-0 rounded-none p-0 text-xs text-white focus:outline-none font-mono cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Visibility */}
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
                    ? 'Anyone can view this campaign on your organiser profile directory.' 
                    : 'The campaign page is hidden from directories. Direct link only.'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Row */}
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
              disabled={submitting}
              className="px-6 py-3 font-bold text-sm text-white btn-premium"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-purple-200/30 border-t-white animate-spin"></span>
                  <span>Saving...</span>
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>

        </form>

      </DialogContent>
    </Dialog>
  );
}
```

---

## 4. Integration of `CampaignEditor` inside Dashboard

To render `CampaignEditor` and update its state instantly without full-refresh page delays, apply the following changes to `src/app/dashboard/page.jsx`:

### 1. State Declaration
Add a new state parameter to track which campaign is being edited (under line 35):
```javascript
  const [editingCampaign, setEditingCampaign] = useState(null);
```

### 2. Import Lucide Icon & Component
Import the `Edit` or `Edit2` icon from `lucide-react` (line 25) and import the new `CampaignEditor` component:
```javascript
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
  Edit // <-- Add this
} from 'lucide-react';
```

### 3. Rendering Action Button on the Card Layout
Add the edit action button beside the delete button on each campaign card:
```jsx
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
```

### 4. Mounting the Modal in the Return Statement
Add the conditional mount rule at the bottom of the return statement (under line 550):
```jsx
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
```

---

## 5. Campaigns Loading and Storage API Index

Here is a summary index mapping campaign storage and Supabase queries:

### Data Storage Strategy
- **Primary Database**: Supabase Postgres (online mode).
- **Secondary Failover**: Local Storage key `'mystory_campaigns'` (offline sandbox mode).

### API Reference Table
| Functionality | Target | Client Query / Code Location | Mode |
|---|---|---|---|
| **Loading Campaigns List** | `campaigns` table | `supabase.from('campaigns').select('*').eq('creator_id', user.id).order('created_at', { ascending: false })` | Online |
| **Fallback Loading** | `localStorage` | `JSON.parse(localStorage.getItem('mystory_campaigns') \|\| '[]')` | Offline |
| **Aggregating Stats** | `participants` table | `supabase.from('participants').select('event_type').in('campaign_id', campaignIds)` | Online |
| **Toggling Active State** | `campaigns` table | `supabase.from('campaigns').update({ is_active: !campaign.is_active }).eq('id', campaign.id)` | Online |
| **Deleting Campaigns** | `campaigns` table | `supabase.from('campaigns').delete().eq('id', campaignId)` | Online |
| **Uploading PNG Frame** | `campaign-frames` bucket | `supabase.storage.from('campaign-frames').upload('frames/USER_ID/filename.png', frameFile, ...)` | Online |
| **Constructing Public CDN URL** | `campaign-frames` bucket | `supabase.storage.from('campaign-frames').getPublicUrl('frames/USER_ID/filename.png').data.publicUrl` | Online |
| **Updating Campaign** | `campaigns` table | `supabase.from('campaigns').update(updatedFields).eq('id', campaign.id).select().single()` | Online |
