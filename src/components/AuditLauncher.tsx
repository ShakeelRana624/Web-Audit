import React, { useState } from 'react';
import { Search, ShieldAlert, Zap, Layers, Sparkles, CheckCircle2, Lock } from 'lucide-react';

interface AuditLauncherProps {
  onStartAudit: (url: string) => Promise<void>;
  isLoading: boolean;
  errorMessage?: string;
}

export const AuditLauncher: React.FC<AuditLauncherProps> = ({
  onStartAudit,
  isLoading,
  errorMessage
}) => {
  const [url, setUrl] = useState('');
  const [localError, setLocalError] = useState('');

  const sampleTargets = [
    { label: 'Apex Heating & Plumbing', url: 'https://apex-heating-plumbing.com' },
    { label: 'Example SaaS Platform', url: 'https://stripe.com' },
    { label: 'Open Source Software', url: 'https://vitejs.dev' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    const trimmed = url.trim();
    if (!trimmed) {
      setLocalError('Please enter a target website URL');
      return;
    }

    // Basic format check
    try {
      const withProto = trimmed.startsWith('http://') || trimmed.startsWith('https://') 
        ? trimmed 
        : `https://${trimmed}`;
      new URL(withProto);
      onStartAudit(withProto);
    } catch {
      setLocalError('Invalid URL structure. Please enter a valid domain (e.g., example.com)');
    }
  };

  const handleSelectSample = (sampleUrl: string) => {
    setUrl(sampleUrl);
    setLocalError('');
  };

  return (
    <div className="mx-auto max-w-4xl py-6 sm:py-10">
      {/* Header Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Deterministic Audit &middot; Gemini Advisory Engine</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100">
          Find where your website is losing leads
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          Scan any business URL for technical blockers, missing call-to-actions, mobile friction, and SEO visibility gaps. Receive an evidence-backed remediation roadmap.
        </p>
      </div>

      {/* Input Box */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="url-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Target Website URL
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Search className="h-5 w-5" />
              </div>
              <input
                id="url-input"
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="e.g. acme-services.com or https://mybusiness.com"
                disabled={isLoading}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Crawling Target...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>Start Live Audit</span>
                </>
              )}
            </button>
          </div>

          {(localError || errorMessage) && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <div>{localError || errorMessage}</div>
            </div>
          )}

          {/* Preset Samples */}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-slate-400">
            <span className="text-slate-500">Quick Test Targets:</span>
            {sampleTargets.map(sample => (
              <button
                key={sample.url}
                type="button"
                onClick={() => handleSelectSample(sample.url)}
                disabled={isLoading}
                className="rounded border border-slate-800 bg-slate-950/60 px-2 py-1 text-slate-300 hover:border-slate-700 hover:text-white transition disabled:opacity-50"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </form>

        {/* Security & Pipeline Guarantees */}
        <div className="mt-8 border-t border-slate-800/80 pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-2.5">
              <div className="rounded bg-emerald-500/10 p-1.5 text-emerald-400 border border-emerald-500/20 shrink-0">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-200">SSRF & DNS Hardened</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pre-flight IP range inspection blocks private loopback, link-local, and metadata gateways.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="rounded bg-sky-500/10 p-1.5 text-sky-400 border border-sky-500/20 shrink-0">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-200">8 Deterministic Analyzers</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Deterministic mathematical evaluation for Conversion, SEO, Tech, UX, Speed & Schema.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="rounded bg-amber-500/10 p-1.5 text-amber-400 border border-amber-500/20 shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Prompt Injection Sandboxed</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Crawled HTML text is treated strictly as passive data, preventing instruction override.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
