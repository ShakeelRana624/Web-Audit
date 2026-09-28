import React, { useState } from 'react';
import { Website } from '../types.js';
import { Globe, Plus, Zap, ExternalLink } from 'lucide-react';
import { ScoreGauge } from './ScoreGauge.js';

interface WebsitesListProps {
  websites: Website[];
  onAddWebsite: (domain: string, name?: string) => Promise<void>;
  onTriggerAudit: (url: string) => void;
}

export const WebsitesList: React.FC<WebsitesListProps> = ({
  websites,
  onAddWebsite,
  onTriggerAudit
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;
    setLoading(true);
    try {
      await onAddWebsite(newDomain, newName);
      setNewDomain('');
      setNewName('');
      setShowAddModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl py-6 px-4 sm:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">
            Monitored Websites &amp; Domains
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track historical conversion health scores and trigger on-demand audits
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-sm transition"
        >
          <Plus className="h-4 w-4" />
          <span>Register Website</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {websites.map(site => (
          <div
            key={site.id}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm shadow-md hover:border-slate-700 transition space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-800 p-2 text-slate-300">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {site.name}
                  </h3>
                  <a
                    href={site.baseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    {site.domain} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {typeof site.lastScore === 'number' && (
                <div className="scale-90 origin-top-right">
                  <ScoreGauge score={site.lastScore} size="sm" showLabel={false} />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400">
              <div>
                {site.lastAuditedAt ? (
                  <span>Last Audited: {new Date(site.lastAuditedAt).toLocaleDateString()}</span>
                ) : (
                  <span>Never Audited</span>
                )}
              </div>
              <button
                onClick={() => onTriggerAudit(site.baseUrl)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Run New Scan</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100">
              Register New Website Domain
            </h3>
            <form onSubmit={handleAdd} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Website Domain or URL
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. acmeplumbing.com"
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                  className="w-full rounded bg-slate-950 border border-slate-700 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Plumbing LLC"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full rounded bg-slate-950 border border-slate-700 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded px-4 py-2 bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded px-4 py-2 bg-emerald-600 text-white font-semibold hover:bg-emerald-500 disabled:opacity-50"
                >
                  {loading ? 'Registering...' : 'Save Website'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
