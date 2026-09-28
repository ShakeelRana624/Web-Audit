import { useState, useEffect, useCallback, useRef } from 'react';
import { AuditReport, Website, AuditLog, AuditProgressTelemetry, ScheduledAudit, ScheduleFrequency } from './types.js';
import { Navbar } from './components/Navbar.js';
import { AuditLauncher } from './components/AuditLauncher.js';
import { LiveTelemetry } from './components/LiveTelemetry.js';
import { AuditReportView } from './components/AuditReportView.js';
import { WebsitesList } from './components/WebsitesList.js';
import { ScheduledAudits } from './components/ScheduledAudits.js';
import { AuditLogsView } from './components/AuditLogsView.js';
import { ScoreGauge } from './components/ScoreGauge.js';
import { HealthTrendChart } from './components/HealthTrendChart.js';
import { AuditComparisonModal } from './components/AuditComparisonModal.js';
import { 
  BarChart3, 
  ExternalLink, 
  ArrowRight, 
  Plus,
  Search,
  X,
  GitCompare,
  CheckSquare,
  Square
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'new-audit' | 'websites' | 'logs' | 'report'>('dashboard');
  const [audits, setAudits] = useState<AuditReport[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [activeReport, setActiveReport] = useState<AuditReport | null>(null);
  const [activeTelemetry, setActiveTelemetry] = useState<AuditProgressTelemetry | null>(null);
  const [activeAuditUrl, setActiveAuditUrl] = useState<string>('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [selectedAuditIdsForComparison, setSelectedAuditIdsForComparison] = useState<string[]>([]);
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Filter audits by domain name or date
  const filteredAudits = audits.filter((audit) => {
    if (!auditSearchQuery.trim()) return true;
    const query = auditSearchQuery.toLowerCase().trim();

    // Domain matching
    let domain = '';
    try {
      domain = new URL(audit.targetUrl).hostname.toLowerCase();
    } catch {
      domain = audit.targetUrl.toLowerCase();
    }
    const fullUrl = audit.targetUrl.toLowerCase();

    // Date matching (formats: YYYY-MM-DD, localized date, month name, etc.)
    const dateObj = new Date(audit.createdAt);
    const dateIso = audit.createdAt.toLowerCase();
    const dateLocale = dateObj.toLocaleDateString().toLowerCase();
    const dateFormatted = `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;
    const dateFull = dateObj.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).toLowerCase();

    return (
      domain.includes(query) ||
      fullUrl.includes(query) ||
      dateIso.includes(query) ||
      dateLocale.includes(query) ||
      dateFormatted.includes(query) ||
      dateFull.includes(query)
    );
  });

  // Fetch initial audits and data
  const fetchData = useCallback(async () => {
    try {
      const [auditsRes, sitesRes, logsRes] = await Promise.all([
        fetch('/api/v1/audits'),
        fetch('/api/v1/websites'),
        fetch('/api/v1/audit-logs')
      ]);

      if (auditsRes.ok) {
        const json = await auditsRes.json();
        setAudits(json.data || []);
        // Set first audit as default active report if none selected
        if (!activeReport && json.data?.length > 0) {
          setActiveReport(json.data[0]);
        }
      }

      if (sitesRes.ok) {
        const json = await sitesRes.json();
        setWebsites(json.data || []);
      }

      if (logsRes.ok) {
        const json = await logsRes.json();
        setLogs(json.data || []);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  }, [activeReport]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Poll for telemetry during active audit
  const startTelemetryPolling = (auditId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/audits/${auditId}/telemetry`);
        if (!res.ok) return;

        const { data } = await res.json();
        setActiveTelemetry(data);

        if (data.status === 'COMPLETED') {
          clearInterval(pollingRef.current!);
          setIsAuditing(false);
          // Fetch final completed audit
          const auditRes = await fetch(`/api/v1/audits/${auditId}`);
          if (auditRes.ok) {
            const auditData = await auditRes.json();
            setActiveReport(auditData.data);
            setActiveTab('report');
            fetchData();
          }
        } else if (data.status === 'FAILED') {
          clearInterval(pollingRef.current!);
          setIsAuditing(false);
          setErrorMessage(data.currentStep || 'Audit failed to complete');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 800);
  };

  const handleStartAudit = async (targetUrl: string) => {
    setErrorMessage('');
    setIsAuditing(true);
    setActiveAuditUrl(targetUrl);

    try {
      const res = await fetch('/api/v1/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize audit');
      }

      const auditId = data.auditId;
      setActiveTelemetry({
        auditId,
        status: 'QUEUED',
        currentStep: 'Pre-flight URL validation verified. Starting crawler...',
        stepProgress: 10,
        pagesFound: 1,
        pagesCrawled: 0,
        findingsCount: 0,
        elapsedMs: 0
      });

      startTelemetryPolling(auditId);
    } catch (err: any) {
      setIsAuditing(false);
      setErrorMessage(err.message || 'Audit start failed');
    }
  };

  const handleToggleShare = async (auditId: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/v1/audits/${auditId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      if (res.ok) {
        const { data } = await res.json();
        if (activeReport && activeReport.id === auditId) {
          setActiveReport({ ...activeReport, shareEnabled: data.shareEnabled, shareToken: data.shareToken });
        }
        fetchData();
      }
    } catch (err) {
      console.error('Error toggling share:', err);
    }
  };

  const handleAddWebsite = async (domain: string, name?: string) => {
    const res = await fetch('/api/v1/websites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, name })
    });
    if (res.ok) {
      fetchData();
    }
  };

  // Metrics for dashboard
  const avgScore = audits.length > 0
    ? Math.round(audits.reduce((acc, a) => acc + (a.overallScore || 0), 0) / audits.length)
    : 0;

  const totalLeaksAcrossAudits = audits.reduce((acc, a) => acc + (a.totalLeaksCount || 0), 0);

  // Toggle audit selection for side-by-side comparison (max 2)
  const handleToggleAuditComparison = (auditId: string) => {
    setSelectedAuditIdsForComparison((prev) => {
      if (prev.includes(auditId)) {
        return prev.filter((id) => id !== auditId);
      }
      if (prev.length >= 2) {
        // Replace oldest selection or keep to 2
        return [prev[1], auditId];
      }
      return [...prev, auditId];
    });
  };

  const selectedComparisonAudits = audits.filter((a) =>
    selectedAuditIdsForComparison.includes(a.id)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeReportId={activeReport?.id}
        auditsCount={audits.length}
      />

      <main className="flex-1">
        {/* If an audit is actively running, show live telemetry view */}
        {isAuditing && activeTelemetry ? (
          <LiveTelemetry telemetry={activeTelemetry} targetUrl={activeAuditUrl} />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <div className="mx-auto max-w-7xl py-6 px-4 sm:px-6 space-y-8">
                {/* Metric Summary Ribbon */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm shadow-md flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                        Average Health Score
                      </span>
                      <div className="text-2xl font-extrabold text-slate-100 mt-1">
                        {avgScore} / 100
                      </div>
                      <span className="text-xs text-slate-400 mt-0.5 block">
                        Across {audits.length} audited property(ies)
                      </span>
                    </div>
                    <div className="scale-75 origin-right">
                      <ScoreGauge score={avgScore} size="sm" showLabel={false} />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm shadow-md">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                      Total Leaks Identified
                    </span>
                    <div className="text-2xl font-extrabold text-rose-400 mt-1">
                      {totalLeaksAcrossAudits} Leaks
                    </div>
                    <span className="text-xs text-slate-400 mt-0.5 block">
                      Conversion, SEO &amp; UX blockers
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm shadow-md">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                      Monthly Quota Consumption
                    </span>
                    <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                      12 / 50 Used
                    </div>
                    <span className="text-xs text-slate-400 mt-0.5 block">
                      Pro Tier &middot; Resets in 18 days
                    </span>
                  </div>
                </div>

                {/* Quick Launch CTA Banner */}
                <div className="rounded-xl border border-emerald-900/40 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                  <div>
                    <h2 className="text-lg font-bold text-slate-100">
                      Ready to inspect a new business property?
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                      Provide any client or competitor URL to generate an evidence-backed lead leak report.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('new-audit')}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-500 shadow-md transition shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Launch New Audit</span>
                  </button>
                </div>

                {/* Health Score Trend Chart (Recharts) */}
                <HealthTrendChart
                  audits={audits}
                  onSelectAudit={(selectedAudit) => {
                    setActiveReport(selectedAudit);
                    setActiveTab('report');
                  }}
                />

                {/* Recent Audits Table */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-100 tracking-tight">
                          Recent Audit Reports
                        </h3>
                        <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                          {filteredAudits.length} of {audits.length}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Select any two audits to compare performance metrics, scores, and lead leak resolution side-by-side
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                      {/* Comparison Action Button */}
                      {selectedAuditIdsForComparison.length > 0 && (
                        <div className="flex items-center gap-2 bg-slate-900 border border-emerald-500/40 px-3 py-1.5 rounded-lg shadow-sm">
                          <span className="text-xs font-mono text-emerald-400 font-semibold">
                            {selectedAuditIdsForComparison.length}/2 Selected
                          </span>
                          <button
                            onClick={() => {
                              if (selectedAuditIdsForComparison.length === 2) {
                                setComparisonModalOpen(true);
                              }
                            }}
                            disabled={selectedAuditIdsForComparison.length !== 2}
                            className="inline-flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed px-2.5 py-1 text-xs font-bold text-white transition shadow-sm"
                            title={selectedAuditIdsForComparison.length === 2 ? 'Launch side-by-side comparison' : 'Please select 2 audits to compare'}
                          >
                            <GitCompare className="h-3.5 w-3.5" />
                            <span>Compare Side-by-Side</span>
                          </button>
                          <button
                            onClick={() => setSelectedAuditIdsForComparison([])}
                            className="text-slate-400 hover:text-slate-200 transition p-0.5"
                            title="Clear comparison selection"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Search Input Bar */}
                      <div className="relative min-w-[220px] sm:w-64">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Search className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          value={auditSearchQuery}
                          onChange={(e) => setAuditSearchQuery(e.target.value)}
                          placeholder="Filter by domain or date..."
                          className="w-full rounded-lg border border-slate-700 bg-slate-950/80 py-2 pl-9 pr-8 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition shadow-inner"
                        />
                        {auditSearchQuery && (
                          <button
                            onClick={() => setAuditSearchQuery('')}
                            className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-200 transition"
                            title="Clear search"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="py-3.5 px-3 w-10 text-center">
                              <span className="sr-only">Compare</span>
                              <GitCompare className="h-3.5 w-3.5 mx-auto text-slate-500" />
                            </th>
                            <th className="py-3.5 px-4">Target Website</th>
                            <th className="py-3.5 px-4">Health Score</th>
                            <th className="py-3.5 px-4">Status &amp; Leaks</th>
                            <th className="py-3.5 px-4">Pages Crawled</th>
                            <th className="py-3.5 px-4">Scanned Date</th>
                            <th className="py-3.5 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-sans">
                          {filteredAudits.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-12 px-4 text-center">
                                <div className="max-w-xs mx-auto space-y-2">
                                  <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                                    <Search className="h-4 w-4" />
                                  </div>
                                  <p className="text-sm font-semibold text-slate-200">
                                    No matching audit reports
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    No completed audits match &ldquo;{auditSearchQuery}&rdquo;. Try searching for another domain name or date.
                                  </p>
                                  <button
                                    onClick={() => setAuditSearchQuery('')}
                                    className="text-xs font-mono text-emerald-400 hover:text-emerald-300 pt-1 underline"
                                  >
                                    Reset search filter
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            filteredAudits.map(audit => {
                              const isSelected = selectedAuditIdsForComparison.includes(audit.id);
                              return (
                                <tr 
                                  key={audit.id} 
                                  className={`transition ${
                                    isSelected 
                                      ? 'bg-emerald-950/30 hover:bg-emerald-950/40 border-l-2 border-emerald-500' 
                                      : 'hover:bg-slate-800/30'
                                  }`}
                                >
                                  {/* Selection Checkbox */}
                                  <td className="py-4 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleAuditComparison(audit.id)}
                                      className={`h-5 w-5 rounded flex items-center justify-center transition border ${
                                        isSelected
                                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                                          : 'border-slate-700 bg-slate-950/80 hover:border-slate-500 text-transparent'
                                      }`}
                                      title={isSelected ? 'Deselect from comparison' : 'Select for side-by-side comparison'}
                                    >
                                      {isSelected ? (
                                        <CheckSquare className="h-3.5 w-3.5" />
                                      ) : (
                                        <Square className="h-3.5 w-3.5 opacity-0 hover:opacity-40" />
                                      )}
                                    </button>
                                  </td>

                                  <td className="py-4 px-4">
                                    <div className="font-semibold text-slate-100">
                                      {new URL(audit.targetUrl).hostname}
                                    </div>
                                    <div className="text-[11px] font-mono text-slate-400 truncate max-w-xs">
                                      {audit.targetUrl}
                                    </div>
                                  </td>

                                  <td className="py-4 px-4">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-sm text-slate-100 font-mono">
                                        {audit.overallScore}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono uppercase">
                                        /100
                                      </span>
                                    </div>
                                  </td>

                                  <td className="py-4 px-4">
                                    <div className="flex items-center gap-2 font-mono text-[11px]">
                                      <span className="text-rose-400 font-semibold">
                                        {audit.totalLeaksCount} Leaks
                                      </span>
                                      <span className="text-slate-500">&middot;</span>
                                      <span className="text-slate-400">{audit.status}</span>
                                    </div>
                                  </td>

                                  <td className="py-4 px-4 font-mono text-slate-400">
                                    {audit.pagesCrawledCount} Pages
                                  </td>

                                  <td className="py-4 px-4 text-slate-400 font-mono text-[11px]">
                                    {new Date(audit.createdAt).toLocaleDateString()}
                                  </td>

                                  <td className="py-4 px-4 text-right">
                                    <div className="inline-flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleAuditComparison(audit.id)}
                                        className={`rounded px-2 py-1 text-[11px] font-medium transition border ${
                                          isSelected
                                            ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300'
                                            : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700'
                                        }`}
                                      >
                                        {isSelected ? 'Selected' : 'Compare'}
                                      </button>

                                      <button
                                        onClick={() => {
                                          setActiveReport(audit);
                                          setActiveTab('report');
                                        }}
                                        className="inline-flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition"
                                      >
                                        <span>View Report</span>
                                        <ArrowRight className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'new-audit' && (
              <AuditLauncher
                onStartAudit={handleStartAudit}
                isLoading={isAuditing}
                errorMessage={errorMessage}
              />
            )}

            {activeTab === 'report' && activeReport && (
              <AuditReportView
                report={activeReport}
                onBack={() => setActiveTab('dashboard')}
                onToggleShare={handleToggleShare}
              />
            )}

            {activeTab === 'websites' && (
              <WebsitesList
                websites={websites}
                onAddWebsite={handleAddWebsite}
                onTriggerAudit={(url) => {
                  setActiveTab('new-audit');
                  handleStartAudit(url);
                }}
              />
            )}

            {activeTab === 'logs' && (
              <AuditLogsView logs={logs} />
            )}
          </>
        )}
      </main>

      {/* Audit Comparison Modal */}
      {comparisonModalOpen && selectedComparisonAudits.length === 2 && (
        <AuditComparisonModal
          auditA={selectedComparisonAudits[0]}
          auditB={selectedComparisonAudits[1]}
          onClose={() => setComparisonModalOpen(false)}
          onViewReport={(audit) => {
            setComparisonModalOpen(false);
            setActiveReport(audit);
            setActiveTab('report');
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            AI Website Lead Leak Detector &middot; Enterprise SaaS Platform
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            Scoring Engine: v1.0.0-PROD &middot; SSRF &amp; Prompt Isolated
          </div>
        </div>
      </footer>
    </div>
  );
}
