'use client';

import { UploadCloud, FileImage, Image as ImageIcon, Globe, Lock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { inputStyles } from '@/components/ui/input';

// Shared form building blocks for CampaignCreator and CampaignEditor

export function Field({ label, htmlFor, hint, extra, children }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {extra}
      </div>
      {children}
      {hint && <p className="text-xs text-neutral-500 leading-relaxed">{hint}</p>}
    </div>
  );
}

export function FrameDropzone({ inputId, framePreview, frameFile, dragOver, onFile, onDragOver, onDragLeave, onDrop, hint, existingLabel }) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`rounded-2xl border border-dashed transition-colors ${
        dragOver
          ? 'border-purple-400 bg-purple-500/[0.08]'
          : 'border-white/15 hover:border-purple-400/50 bg-white/[0.02] hover:bg-white/[0.04]'
      }`}
    >
      <input
        type="file"
        accept="image/png"
        onChange={(e) => onFile(e.target.files[0])}
        className="hidden"
        id={inputId}
      />

      <label htmlFor={inputId} className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 p-5 cursor-pointer text-center sm:text-left">
        {framePreview ? (
          <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden ring-1 ring-white/10 bg-neutral-900 bg-[conic-gradient(#262626_25%,#171717_0_50%,#262626_0_75%,#171717_0)] [background-size:16px_16px] flex items-center justify-center p-1.5">
            <img
              src={framePreview}
              alt=""
              className="max-h-full max-w-full object-contain pointer-events-none"
              onError={(e) => { e.currentTarget.src = '/favicon.ico'; }}
            />
          </div>
        ) : (
          <div className="w-12 h-12 shrink-0 rounded-xl bg-purple-500/10 ring-1 ring-inset ring-purple-500/20 flex items-center justify-center text-purple-300">
            <UploadCloud className="w-5 h-5" />
          </div>
        )}

        <div className="flex flex-col gap-1 min-w-0">
          {frameFile ? (
            <span className="flex items-center justify-center sm:justify-start gap-2 text-sm font-medium text-white min-w-0">
              <FileImage className="w-4 h-4 shrink-0 text-purple-300" />
              <span className="truncate">{frameFile.name}</span>
              <span className="text-xs text-neutral-500 font-mono shrink-0">{(frameFile.size / 1024).toFixed(0)} KB</span>
            </span>
          ) : framePreview && existingLabel ? (
            <span className="flex items-center justify-center sm:justify-start gap-2 text-sm font-medium text-white">
              <ImageIcon className="w-4 h-4 text-purple-300" />
              {existingLabel}
            </span>
          ) : (
            <span className="text-sm font-medium text-white">Click or drag & drop PNG frame</span>
          )}
          <span className="text-xs text-neutral-500 leading-relaxed">
            {framePreview ? 'Click or drop a new PNG to replace it.' : hint}
          </span>
        </div>
      </label>
    </div>
  );
}

export function DateRangeFields({ startDate, endDate, onStartChange, onEndChange }) {
  const dateInput = `${inputStyles} h-11 font-mono text-[13px] cursor-pointer`;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Go-Live Time" htmlFor="campaign-start">
        <input
          id="campaign-start"
          type="datetime-local"
          required
          value={startDate}
          onChange={(e) => onStartChange(e.target.value)}
          className={dateInput}
        />
      </Field>
      <Field label="Expiry Time" htmlFor="campaign-end">
        <input
          id="campaign-end"
          type="datetime-local"
          required
          value={endDate}
          onChange={(e) => onEndChange(e.target.value)}
          className={dateInput}
        />
      </Field>
    </div>
  );
}

export function VisibilityToggle({ isPublic, onToggle, publicHint, privateHint }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex gap-3 min-w-0">
        <span className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${isPublic ? 'bg-purple-500/10 text-purple-300' : 'bg-white/[0.06] text-neutral-400'}`}>
          {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
        </span>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-medium text-white">
            {isPublic ? 'Publicly Listed' : 'Private (Hidden)'}
          </span>
          <span className="text-xs text-neutral-500 leading-relaxed">
            {isPublic ? publicHint : privateHint}
          </span>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={isPublic}
        aria-label="Public visibility"
        onClick={onToggle}
        className={`relative w-11 h-6 shrink-0 rounded-full transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${isPublic ? 'bg-purple-500' : 'bg-neutral-700'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${isPublic ? 'translate-x-5' : 'translate-x-0'}`}></span>
      </button>
    </div>
  );
}
