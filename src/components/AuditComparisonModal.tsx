import React from 'react';
import { AuditReport, FindingCategory } from '../types.js';
import { 
  ArrowRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ExternalLink,
  Calendar,
  Layers,
  FileText,
  Activity,
  GitCompare,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { ScoreGauge } from './ScoreGauge.js';

interface AuditComparisonModalProps {
  auditA: AuditReport;
  auditB: AuditReport;
  onClose: () => void;
  onViewReport: (audit: AuditReport) => void;
}

export const AuditComparisonModal: React.FC<AuditComparisonModalProps> = ({
  auditA,
  auditB,
  onClose,
  onViewReport
}) => {
  // Sort chronologically: older is baseline, newer is comparison
  const dateA = new Date(auditA.createdAt).getTime();
  const dateB = new Date(auditB.createdAt).getTime();
  const [olderAudit, newerAudit] = dateA <= dateB ? [auditA, auditB] : [auditB, auditA];

  const domainOlder = new URL(olderAudit.targetUrl).hostname;
  const domainNewer = new URL(newerAudit.targetUrl).hostname;
  const isSameDomain = domainOlder === domainNewer;

  // Score delta
  const scoreDelta = newerAudit.overallScore - olderAudit.overallScore;
  const leaksDelta = newerAudit.totalLeaksCount - olderAudit.totalLeaksCount;
  const pagesDelta = newerAudit.pagesCrawledCount - olderAudit.pagesCrawledCount;

  // Category comparisons
  const categoryKeys: Array<{ key: FindingCategory; label: string }> = [
    { key: 'conversion', label: 'Conversion Architecture' },
    { key: 'seo', label: 'SEO & Meta Standards' },
    { key: 'technical', label: 'Technical Infrastructure' },
    { key: 'ux', label: 'UX & Mobile Experience' },
    { key: 'performance', label: 'Speed & Page Weight' },
    { key: 'accessibility', label: 'Accessibility Standards' },
    { key: 'local_business', label: 'Local Business & Trust' },
    { key: 'ai_visibility', label: 'AI Search Visibility' }
  ];

  // Specific leak comparisons: resolved vs newly introduced
  const olderLeakRuleCodes = new Set(
    olderAudit.findings.filter(f => !f.passed).map(f => f.ruleCode)
  );
  const newerLeakRuleCodes = new Set(
    newerAudit.findings.filter(f => !f.passed).map(f => f.ruleCode)
  );

  const resolvedLeaks = olderAudit.findings
    .filter(f => !f.passed && !newerLeakRuleCodes.has(f.ruleCode))
    .map(f => f.title);

  const newLeaks = newerAudit.findings
    .filter(f => !f.passed && !olderLeakRuleCodes.has(f.ruleCode))
    .map(f => f.title);

  const persistentLeaks = newerAudit.findings
    .filter(f => !f.passed && olderLeakRuleCodes.has(f.ruleCode))
    .map(f => f.title);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                  Audit Comparison &amp; Metric Diff
                </h3>
                {isSameDomain ? (
                  <span className="text-[10px] font-mono uppercase bg-emerald-950/80 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/60">
                    Same Domain Progress
                  </span>
                ) : (
                  <span className="text-[10px] font-mono uppercase bg-sky-950/80 text-sky-400 px-2 py-0.5 rounded border border-sky-800/60">
                    Cross-Domain Benchmark
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Side-by-side performance delta between Baseline (Older) and Comparison (Newer) runs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition self-end sm:self-auto"
            title="Close Comparison"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto font-sans">
          {/* Top Summary Cards with Deltas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Score Delta Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <span className="text-[11px] font-mono uppercase text-slate-400 block font-semibold">
                Lead Conversion Score Delta
              </span>
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold font-mono text-slate-100">
                    {newerAudit.overallScore}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    vs {olderAudit.overallScore}
                  </span>
                </div>
                <div className={`flex items-center gap-1 font-mono text-sm font-bold px-2 py-0.5 rounded ${
                  scoreDelta > 0 
                    ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/60' 
                    : scoreDelta < 0 
                    ? 'text-rose-400 bg-rose-950/60 border border-rose-800/60' 
                    : 'text-slate-400 bg-slate-800'
                }`}>
                  {scoreDelta > 0 ? (
                    <>
                      <TrendingUp className="h-4 w-4" />
                      <span>+{scoreDelta} pts</span>
                    </>
                  ) : scoreDelta < 0 ? (
                    <>
                      <TrendingDown className="h-4 w-4" />
                      <span>{scoreDelta} pts</span>
                    </>
                  ) : (
                    <span>0 pts</span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                {scoreDelta > 0 
                  ? 'Strong positive momentum in overall commercial conversion readiness.' 
                  : scoreDelta < 0 
                  ? 'Conversion friction increased; newly identified leaks degraded score.' 
                  : 'No net score change detected between audit runs.'}
              </p>
            </div>

            {/* Total Leaks Delta Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <span className="text-[11px] font-mono uppercase text-slate-400 block font-semibold">
                Lead Leak Deficit
              </span>
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold font-mono text-slate-100">
                    {newerAudit.totalLeaksCount}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    vs {olderAudit.totalLeaksCount}
                  </span>
                </div>
                <div className={`flex items-center gap-1 font-mono text-sm font-bold px-2 py-0.5 rounded ${
                  leaksDelta < 0 
                    ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/60' 
                    : leaksDelta > 0 
                    ? 'text-rose-400 bg-rose-950/60 border border-rose-800/60' 
                    : 'text-slate-400 bg-slate-800'
                }`}>
                  {leaksDelta < 0 ? (
                    <>
                      <ArrowDownRight className="h-4 w-4" />
                      <span>{leaksDelta} leaks</span>
                    </>
                  ) : leaksDelta > 0 ? (
                    <>
                      <ArrowUpRight className="h-4 w-4" />
                      <span>+{leaksDelta} leaks</span>
                    </>
                  ) : (
                    <span>0 leaks</span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                {leaksDelta < 0 
                  ? `${Math.abs(leaksDelta)} fewer leaks observed compared to initial baseline.` 
                  : leaksDelta > 0 
                  ? `${leaksDelta} additional conversion barrier(s) detected.` 
                  : 'Total active leak count remained constant.'}
              </p>
            </div>

            {/* Pages Sampled Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <span className="text-[11px] font-mono uppercase text-slate-400 block font-semibold">
                Pages Crawled Scope
              </span>
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold font-mono text-slate-100">
                    {newerAudit.pagesCrawledCount}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    vs {olderAudit.pagesCrawledCount}
                  </span>
                </div>
                <span className="font-mono text-xs text-slate-400">
                  {pagesDelta >= 0 ? `+${pagesDelta}` : pagesDelta} pages
                </span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                {isSameDomain 
                  ? 'Consistent deterministic depth verifies repeatable measurements.' 
                  : 'Different domains compared for competitive benchmark.'}
              </p>
            </div>
          </div>

          {/* Side-by-Side Metadata Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Baseline (Older) */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                  Baseline (Older Run)
                </span>
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(olderAudit.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-100 truncate">
                  {domainOlder}
                </h4>
                <p className="text-xs font-mono text-slate-500 truncate">
                  {olderAudit.targetUrl}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold font-mono text-slate-200">
                    {olderAudit.overallScore}/100
                  </span>
                  <span className="text-xs text-rose-400 font-mono">
                    {olderAudit.totalLeaksCount} Leaks
                  </span>
                </div>
                <button
                  onClick={() => onViewReport(olderAudit)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
                >
                  <span>Open Report</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Comparison (Newer) */}
            <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/60">
                  Comparison (Newer Run)
                </span>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(newerAudit.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-100 truncate">
                  {domainNewer}
                </h4>
                <p className="text-xs font-mono text-slate-400 truncate">
                  {newerAudit.targetUrl}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-emerald-900/40">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    {newerAudit.overallScore}/100
                  </span>
                  <span className="text-xs text-rose-400 font-mono">
                    {newerAudit.totalLeaksCount} Leaks
                  </span>
                </div>
                <button
                  onClick={() => onViewReport(newerAudit)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
                >
                  <span>Open Report</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* 8-Dimension Detailed Comparison Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-100 tracking-tight">
                8-Dimension Category Breakdown
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                Higher score indicates lower conversion friction
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-lg">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Evaluation Dimension</th>
                    <th className="py-3 px-4 text-center">Baseline Score</th>
                    <th className="py-3 px-4 text-center">Newer Score</th>
                    <th className="py-3 px-4 text-center">Performance Change</th>
                    <th className="py-3 px-4 text-right">Leaks Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {categoryKeys.map(({ key, label }) => {
                    const scoreOlder = olderAudit.categoryScores?.[key]?.score ?? 0;
                    const scoreNewer = newerAudit.categoryScores?.[key]?.score ?? 0;
                    const diff = scoreNewer - scoreOlder;

                    const leaksOlder = (olderAudit.categoryScores?.[key]?.criticalCount || 0) + 
                                       (olderAudit.categoryScores?.[key]?.highCount || 0) + 
                                       (olderAudit.categoryScores?.[key]?.mediumCount || 0) + 
                                       (olderAudit.categoryScores?.[key]?.lowCount || 0);

                    const leaksNewer = (newerAudit.categoryScores?.[key]?.criticalCount || 0) + 
                                       (newerAudit.categoryScores?.[key]?.highCount || 0) + 
                                       (newerAudit.categoryScores?.[key]?.mediumCount || 0) + 
                                       (newerAudit.categoryScores?.[key]?.lowCount || 0);

                    const leakDiff = leaksNewer - leaksOlder;

                    return (
                      <tr key={key} className="hover:bg-slate-900/40 transition">
                        <td className="py-3 px-4 font-semibold text-slate-200">
                          {label}
                        </td>

                        <td className="py-3 px-4 text-center font-mono">
                          <span className="text-slate-300 font-bold">{scoreOlder}</span>
                          <span className="text-slate-500 text-[10px]">/100</span>
                        </td>

                        <td className="py-3 px-4 text-center font-mono">
                          <span className="text-slate-100 font-bold">{scoreNewer}</span>
                          <span className="text-slate-500 text-[10px]">/100</span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1 font-mono text-xs">
                            {diff > 0 ? (
                              <span className="inline-flex items-center text-emerald-400 font-semibold gap-0.5">
                                <ArrowUpRight className="h-3.5 w-3.5" />
                                +{diff}
                              </span>
                            ) : diff < 0 ? (
                              <span className="inline-flex items-center text-rose-400 font-semibold gap-0.5">
                                <ArrowDownRight className="h-3.5 w-3.5" />
                                {diff}
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-slate-400 gap-0.5">
                                <Minus className="h-3 w-3" />
                                0
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-xs">
                          {leakDiff < 0 ? (
                            <span className="text-emerald-400 font-semibold">
                              {leakDiff} leak(s)
                            </span>
                          ) : leakDiff > 0 ? (
                            <span className="text-rose-400 font-semibold">
                              +{leakDiff} leak(s)
                            </span>
                          ) : (
                            <span className="text-slate-500">Unchanged</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Leak Delta Diff: Resolved vs Newly Discovered */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Resolved Leaks */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Fixed / Resolved Friction Points ({resolvedLeaks.length})
                </h5>
              </div>
              {resolvedLeaks.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  No previously flagged leaks were resolved between these audits.
                </p>
              ) : (
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {resolvedLeaks.map((title, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">&check;</span>
                      <span className="line-through text-slate-400">{title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Newly Introduced or Unresolved Leaks */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <h5 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                  New or Active Leak Alerts ({newLeaks.length})
                </h5>
              </div>
              {newLeaks.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  No new leak categories introduced.
                </p>
              ) : (
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {newLeaks.map((title, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">&times;</span>
                      <span className="text-slate-200">{title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90">
          <span className="text-xs text-slate-400 font-mono">
            Comparing <span className="text-slate-200 font-semibold">{domainOlder}</span> with <span className="text-slate-200 font-semibold">{domainNewer}</span>
          </span>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
