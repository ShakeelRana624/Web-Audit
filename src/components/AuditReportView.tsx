import React, { useState } from 'react';
import { AuditReport, FindingCategory, Finding } from '../types.js';
import { ScoreGauge } from './ScoreGauge.js';
import { LeakDistributionChart } from './LeakDistributionChart.js';
import { exportAuditReportToPdf } from '../utils/exportPdf.js';
import { exportAuditLeaksToCsv } from '../utils/exportCsv.js';
import { ToastNotification, ToastMessage } from './ToastNotification.js';
import { 
  Share2, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check, 
  Sparkles, 
  Sliders, 
  Clock, 
  ArrowLeft,
  Printer,
  FileDown,
  FileSpreadsheet,
  Filter,
  Bot,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react';

interface AuditReportViewProps {
  report: AuditReport;
  onBack: () => void;
  onToggleShare: (id: string, enabled: boolean) => Promise<void>;
}

export const AuditReportView: React.FC<AuditReportViewProps> = ({
  report,
  onBack,
  onToggleShare
}) => {
  const [selectedCategory, setSelectedCategory] = useState<FindingCategory | 'all'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [copiedCopyIndex, setCopiedCopyIndex] = useState<number | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isGeneratingAiSummary, setIsGeneratingAiSummary] = useState(false);
  const [aiSummaryData, setAiSummaryData] = useState<any>(report.aiExecutiveSummary || null);
  const [currentSummaryText, setCurrentSummaryText] = useState<string>(report.executiveSummary || '');
  const [showDetailedAiAnalysis, setShowDetailedAiAnalysis] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleExportPdf = () => {
    if (isExportingPdf) return;

    setIsExportingPdf(true);
    const loadingToastId = addToast({
      type: 'loading',
      title: 'Generating PDF Summary...',
      message: 'Compiling deterministic findings and executive recommendations.',
      duration: 0,
    });

    // Run export in next frame to allow the loading state and toast to render
    setTimeout(() => {
      try {
        exportAuditReportToPdf(report);
        removeToast(loadingToastId);
        addToast({
          type: 'success',
          title: 'PDF Export Complete',
          message: 'Your executive audit summary has been downloaded successfully.',
          duration: 4500,
        });
      } catch (err: any) {
        removeToast(loadingToastId);
        addToast({
          type: 'error',
          title: 'PDF Export Failed',
          message: err?.message || 'Could not compile report PDF. Please try again.',
          duration: 5000,
        });
      } finally {
        setIsExportingPdf(false);
      }
    }, 150);
  };

  const handleExportCsv = () => {
    try {
      const leaksCount = report.findings.filter((f) => !f.passed).length;
      exportAuditLeaksToCsv(report);
      addToast({
        type: 'success',
        title: 'CSV Export Complete',
        message: `Exported ${leaksCount} lead leak findings to spreadsheet CSV.`,
        duration: 4500,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'CSV Export Failed',
        message: err?.message || 'Could not export findings to CSV.',
        duration: 5000,
      });
    }
  };

  const handleGenerateAiSummary = async () => {
    if (isGeneratingAiSummary) return;

    setIsGeneratingAiSummary(true);
    const toastId = addToast({
      type: 'loading',
      title: 'Consulting Gemini...',
      message: 'Synthesizing top 3 critical conversion leaks and estimating commercial business impact.',
      duration: 0,
    });

    try {
      const res = await fetch(`/api/v1/audits/${report.id}/ai-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': report.organizationId || 'org_growth_labs'
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate AI executive summary');
      }

      const { data } = await res.json();
      removeToast(toastId);

      if (data?.aiExecutiveSummary) {
        setAiSummaryData(data.aiExecutiveSummary);
        setCurrentSummaryText(data.aiExecutiveSummary.executiveSummary);
        report.executiveSummary = data.aiExecutiveSummary.executiveSummary;
        report.aiExecutiveSummary = data.aiExecutiveSummary;
      }

      addToast({
        type: 'success',
        title: 'AI Executive Summary Ready',
        message: 'Successfully generated high-impact commercial briefing with Gemini.',
        duration: 5000,
      });
    } catch (err: any) {
      removeToast(toastId);
      addToast({
        type: 'error',
        title: 'AI Synthesis Failed',
        message: err?.message || 'Could not generate AI executive summary with Gemini. Please try again.',
        duration: 5000,
      });
    } finally {
      setIsGeneratingAiSummary(false);
    }
  };

  const categories: Array<{ id: FindingCategory | 'all'; label: string }> = [
    { id: 'all', label: 'All Checks' },
    { id: 'conversion', label: 'Conversion (25%)' },
    { id: 'seo', label: 'SEO (18%)' },
    { id: 'technical', label: 'Technical (15%)' },
    { id: 'ux', label: 'UX & Mobile (12%)' },
    { id: 'performance', label: 'Speed (10%)' },
    { id: 'accessibility', label: 'A11y (8%)' },
    { id: 'local_business', label: 'Local (7%)' },
    { id: 'ai_visibility', label: 'AI Search (5%)' }
  ];

  const filteredFindings = report.findings.filter((f) => {
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    if (!matchesCategory) return false;

    if (selectedSeverity === 'all') return true;
    if (selectedSeverity === 'all_leaks') return !f.passed;
    if (selectedSeverity === 'passed') return f.passed;
    return !f.passed && f.severity === selectedSeverity;
  });

  const passedCount = report.findings.filter(f => f.passed).length;
  const criticalCount = report.findings.filter(f => !f.passed && f.severity === 'critical').length;
  const highCount = report.findings.filter(f => !f.passed && f.severity === 'high').length;
  const mediumCount = report.findings.filter(f => !f.passed && f.severity === 'medium').length;
  const lowCount = report.findings.filter(f => !f.passed && f.severity === 'low').length;
  const totalLeaksCount = report.findings.filter(f => !f.passed).length;

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCopyIndex(index);
    setTimeout(() => setCopiedCopyIndex(null), 2000);
  };

  const handleCopyShareLink = () => {
    const fullUrl = `${window.location.origin}/api/v1/reports/share/${report.shareToken}`;
    navigator.clipboard.writeText(fullUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl py-6 px-4 sm:px-6 space-y-8">
      {/* Top Bar Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <div className="h-4 w-[1px] bg-slate-800" />
          <div className="text-xs text-slate-400 font-mono">
            Target: <a href={report.targetUrl} target="_blank" rel="noreferrer" className="text-slate-200 hover:underline inline-flex items-center gap-1">{report.targetUrl} <ExternalLink className="h-3 w-3" /></a>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-slate-800 hover:text-emerald-300 shadow-sm transition disabled:opacity-50"
            title="Download executive PDF summary"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>{isExportingPdf ? 'Generating PDF...' : 'Export as PDF'}</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-sky-400 hover:bg-slate-800 hover:text-sky-300 shadow-sm transition"
            title="Download identified leaks as spreadsheet CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export to CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </button>
          <button
            onClick={() => setShareModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-sm transition"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share Report</span>
          </button>
        </div>
      </div>

      {/* Hero Overview Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Score Gauge */}
          <div className="lg:col-span-4 flex flex-col items-center lg:items-start border-b lg:border-b-0 lg:border-r border-slate-800 pb-6 lg:pb-0 lg:pr-6">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-3">
              Lead Conversion Health Score
            </span>
            <ScoreGauge score={report.overallScore} size="lg" />
            
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-300">
              <button
                onClick={() => setSelectedSeverity(selectedSeverity === 'critical' ? 'all' : 'critical')}
                className={`font-semibold transition hover:underline cursor-pointer ${
                  selectedSeverity === 'critical' ? 'text-rose-300 underline font-bold' : 'text-rose-400'
                }`}
                title="Filter findings to critical leaks"
              >
                {criticalCount} Critical Leaks
              </button>
              <span>&middot;</span>
              <button
                onClick={() => setSelectedSeverity(selectedSeverity === 'high' ? 'all' : 'high')}
                className={`font-semibold transition hover:underline cursor-pointer ${
                  selectedSeverity === 'high' ? 'text-amber-300 underline font-bold' : 'text-amber-400'
                }`}
                title="Filter findings to high severity leaks"
              >
                {highCount} High Leaks
              </button>
              <span>&middot;</span>
              <button
                onClick={() => setSelectedSeverity(selectedSeverity === 'passed' ? 'all' : 'passed')}
                className={`font-semibold transition hover:underline cursor-pointer ${
                  selectedSeverity === 'passed' ? 'text-emerald-300 underline font-bold' : 'text-emerald-400'
                }`}
                title="Filter findings to passed checks"
              >
                {passedCount} Passed Checks
              </button>
            </div>
          </div>

          {/* Executive Diagnosis & Business Context */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Executive Commercial Diagnosis
                </h2>
                {aiSummaryData && (
                  <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 text-[10px] font-mono text-purple-300">
                    <Bot className="h-3 w-3" />
                    <span>Gemini AI Synthesized</span>
                  </span>
                )}
              </div>

              {/* Action to trigger AI Executive Summary */}
              <button
                onClick={handleGenerateAiSummary}
                disabled={isGeneratingAiSummary}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/50 px-3 py-1.5 text-xs font-semibold text-purple-200 transition shadow-sm hover:border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto"
                title="Use Gemini AI to analyze the audit findings and synthesize an executive summary of the top 3 critical leaks and business impact"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isGeneratingAiSummary ? 'animate-spin text-purple-300' : 'text-purple-400'}`} />
                <span>
                  {isGeneratingAiSummary 
                    ? 'Synthesizing with Gemini...' 
                    : aiSummaryData 
                    ? 'Regenerate AI Summary' 
                    : 'Generate AI Executive Summary'}
                </span>
              </button>
            </div>

            <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans">
              {currentSummaryText || report.executiveSummary || 'Detailed lead leak audit completed.'}
            </p>

            {/* AI Top 3 Critical Leaks & Business Impact Breakdown */}
            {aiSummaryData?.topCriticalLeaks && aiSummaryData.topCriticalLeaks.length > 0 && (
              <div className="rounded-xl border border-purple-900/50 bg-purple-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-purple-200">
                      Top 3 Critical Leaks &amp; Potential Business Impact
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowDetailedAiAnalysis(!showDetailedAiAnalysis)}
                    className="flex items-center gap-1 text-[11px] text-purple-300 hover:text-purple-100 transition"
                  >
                    <span>{showDetailedAiAnalysis ? 'Collapse Details' : 'Expand Details'}</span>
                    {showDetailedAiAnalysis ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                </div>

                {showDetailedAiAnalysis && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {aiSummaryData.topCriticalLeaks.slice(0, 3).map((leak: any, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-purple-900/60 bg-slate-950/70 p-3.5 space-y-2 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold">
                                #{idx + 1}
                              </span>
                              <span className="text-[10px] font-mono uppercase bg-rose-950/60 text-rose-400 px-1.5 py-0.5 rounded border border-rose-900/50">
                                {leak.estimatedLeadLoss || 'High Friction'}
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-slate-100 mt-2 line-clamp-2">
                              {leak.title}
                            </h4>

                            <div className="mt-2 space-y-1">
                              <span className="text-[10px] uppercase font-mono text-rose-400 block font-semibold">
                                Business Impact:
                              </span>
                              <p className="text-[11px] text-slate-300 leading-normal">
                                {leak.businessImpact}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-800/80">
                            <span className="text-[10px] uppercase font-mono text-emerald-400 block font-semibold">
                              Executive Action:
                            </span>
                            <p className="text-[11px] text-slate-300 leading-normal mt-0.5">
                              {leak.recommendedAction}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {aiSummaryData.overallStrategicImpact && (
                      <div className="rounded-lg bg-purple-900/20 border border-purple-800/40 p-2.5 text-xs text-purple-200 flex items-start gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-purple-400 mt-0.5 shrink-0" />
                        <div className="leading-relaxed">
                          <span className="font-semibold text-purple-100">Strategic ROI: </span>
                          <span>{aiSummaryData.overallStrategicImpact}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Business Profile Tags */}
            {report.businessProfile && (
              <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
                <div>
                  <span className="text-slate-500">Business Model:</span>{' '}
                  <span className="text-slate-200">{report.businessProfile.businessType || 'Service / Commercial'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Primary Offering:</span>{' '}
                  <span className="text-slate-200">{report.businessProfile.primaryOffering || 'Professional Solutions'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Target Audience:</span>{' '}
                  <span className="text-slate-200">{report.businessProfile.targetAudience || 'Direct Consumers'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Contact Infrastructure:</span>{' '}
                  <span className="text-slate-200">{report.businessProfile.locationSummary || 'Active Contact Methods'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Donut Chart: Leak Category Distribution */}
      <LeakDistributionChart
        findings={report.findings}
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => setSelectedCategory(cat)}
      />

      {/* Quick Wins Box */}
      {report.quickWins && report.quickWins.length > 0 && (
        <div className="rounded-xl border border-emerald-950/60 bg-emerald-950/20 p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>High-Impact Quick Wins (&lt; 30 Minutes to Implement)</span>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
            {report.quickWins.map((qw, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-500 font-mono font-bold mt-0.5">&gt;</span>
                <span>{qw}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Priority Action Roadmap (Top Conversion Leaks) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-100 tracking-tight">
              Top Priority Lead Leaks
            </h3>
            <p className="text-xs text-slate-400">
              Ranked in order of direct impact on prospective customer conversion
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {report.priorityFixes.map((fix, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 transition hover:border-slate-700 shadow-md space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold">
                    #{fix.priority}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100">
                      {fix.ruleCode?.replace(/_/g, ' ') || 'Conversion Friction Point'}
                    </h4>
                    <span className="text-[11px] font-mono uppercase text-slate-400">
                      Category: {fix.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* Problem & Impact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="font-semibold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Why This Loses Leads</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {fix.leakExplanation}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Recommended Fix</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {fix.recommendedFix}
                  </p>
                </div>
              </div>

              {/* Ready-to-use Copy Suggestion */}
              {fix.suggestedCopy && (
                <div className="rounded-lg bg-slate-950 p-3 border border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-amber-400 block mb-0.5">
                      Suggested High-Converting Copy
                    </span>
                    <span className="text-slate-200 font-medium font-mono text-[11px]">
                      &ldquo;{fix.suggestedCopy}&rdquo;
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyText(fix.suggestedCopy!, idx)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-800 transition shrink-0"
                  >
                    {copiedCopyIndex === idx ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 8-Dimension Detailed Evidence Explorer */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-100 tracking-tight">
              Deterministic Findings &amp; Evidence Explorer
            </h3>
            <p className="text-xs text-slate-400">
              Algorithmic measurements across all 8 technical and commercial dimensions
            </p>
          </div>

          {/* Severity Filter Dropdown */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 shrink-0">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span>Severity:</span>
            </span>
            <div className="relative">
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="appearance-none rounded-lg border border-slate-700 bg-slate-950 py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition shadow-inner cursor-pointer"
              >
                <option value="all">All Severities ({report.findings.length})</option>
                <option value="all_leaks">All Leaks Only ({totalLeaksCount})</option>
                <option value="critical">🔴 Critical Leaks ({criticalCount})</option>
                <option value="high">🟠 High Severity ({highCount})</option>
                <option value="medium">🟡 Medium Severity ({mediumCount})</option>
                <option value="low">🔵 Low Severity ({lowCount})</option>
                <option value="passed">🟢 Passed Checks ({passedCount})</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <Sliders className="h-3 w-3" />
              </div>
            </div>
            {selectedSeverity !== 'all' && (
              <button
                onClick={() => setSelectedSeverity('all')}
                className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 underline shrink-0 ml-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-3">
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                selectedCategory === c.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Findings List */}
        <div className="space-y-3">
          {filteredFindings.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-200">
                No findings match the selected filters
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No checks match category &ldquo;{selectedCategory}&rdquo; with severity &ldquo;{selectedSeverity}&rdquo;.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedSeverity('all');
                }}
                className="text-xs font-mono text-emerald-400 hover:text-emerald-300 underline pt-1 inline-block"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            filteredFindings.map((finding) => (
            <div
              key={finding.id}
              className={`rounded-lg border p-4 text-xs transition ${
                finding.passed
                  ? 'border-slate-800/60 bg-slate-950/40 text-slate-300'
                  : finding.severity === 'critical'
                  ? 'border-rose-900/50 bg-rose-950/20 text-slate-200'
                  : 'border-amber-900/40 bg-amber-950/20 text-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  {finding.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className={`h-4 w-4 shrink-0 ${finding.severity === 'critical' ? 'text-rose-400' : 'text-amber-400'}`} />
                  )}
                  <span className="font-semibold text-sm text-slate-100">
                    {finding.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="uppercase text-slate-500">{finding.category}</span>
                  <span>&middot;</span>
                  <span className={finding.passed ? 'text-emerald-400' : finding.severity === 'critical' ? 'text-rose-400' : 'text-amber-400'}>
                    {finding.passed ? 'PASSED' : finding.severity.toUpperCase()}
                  </span>
                </div>
              </div>

              <p className="text-slate-300 leading-relaxed mb-3">
                {finding.description}
              </p>

              {/* Exact Evidence Snippet */}
              {finding.evidence && Object.keys(finding.evidence).length > 0 && (
                <div className="rounded bg-slate-950 p-2.5 font-mono text-[11px] text-slate-400 border border-slate-900">
                  <div className="text-slate-500 mb-1 font-semibold text-[10px] uppercase">
                    Captured DOM Evidence
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(finding.evidence, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )))
        }
        </div>
      </div>

      {/* Share Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-slate-100">
              Shareable Audit Report
            </h4>
            <p className="text-xs text-slate-400">
              Anyone with this cryptographic link can view a sanitized, read-only version of this report.
            </p>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-300">Public Link Status:</span>
              <button
                onClick={() => onToggleShare(report.id, !report.shareEnabled)}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  report.shareEnabled
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {report.shareEnabled ? 'Active (Public)' : 'Disabled (Private)'}
              </button>
            </div>

            {report.shareEnabled && (
              <div className="space-y-2">
                <label className="text-[11px] font-mono text-slate-400 uppercase">
                  Shareable URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/api/v1/reports/share/${report.shareToken}`}
                    className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-xs font-mono text-slate-300 focus:outline-none"
                  />
                  <button
                    onClick={handleCopyShareLink}
                    className="rounded bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition shrink-0"
                  >
                    {shareCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShareModalOpen(false)}
                className="rounded-lg border border-slate-800 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      <ToastNotification toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
