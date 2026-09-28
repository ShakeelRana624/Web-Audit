import React from 'react';
import { AuditProgressTelemetry } from '../types.js';
import { CheckCircle2, Clock, Terminal } from 'lucide-react';

interface LiveTelemetryProps {
  telemetry: AuditProgressTelemetry;
  targetUrl: string;
}

export const LiveTelemetry: React.FC<LiveTelemetryProps> = ({ telemetry, targetUrl }) => {
  const steps = [
    { label: 'Security Pre-Flight & SSRF Validation', minProgress: 10 },
    { label: 'Polite Crawler & DOM Parser', minProgress: 20 },
    { label: '8 Deterministic Analyzers', minProgress: 55 },
    { label: 'Gemini Reasoning & Prioritization', minProgress: 80 },
    { label: 'Report Compilation & Explainable Scoring', minProgress: 95 }
  ];

  const elapsedSec = (telemetry.elapsedMs / 1000).toFixed(1);

  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
        {/* Title and URL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-3">
          <div>
            <span className="text-xs uppercase font-mono tracking-widest text-emerald-400">
              Active Job Telemetry
            </span>
            <h2 className="text-xl font-bold text-slate-100 mt-0.5">
              Auditing {targetUrl}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-md border border-slate-800">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span>Elapsed: {elapsedSec}s</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono">
            <span>Progress: {telemetry.stepProgress}%</span>
            <span>Status: {telemetry.status}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 ease-out"
              style={{ width: `${Math.max(5, telemetry.stepProgress)}%` }}
            />
          </div>
        </div>

        {/* Steps Pipeline */}
        <div className="mt-8 space-y-3.5">
          {steps.map((st, index) => {
            const isCompleted = telemetry.stepProgress > st.minProgress;
            const isCurrent = !isCompleted && (index === 0 || telemetry.stepProgress > steps[index - 1].minProgress);

            return (
              <div
                key={st.label}
                className={`flex items-center justify-between p-3 rounded-lg border transition ${
                  isCurrent
                    ? 'border-emerald-500/40 bg-emerald-950/20 text-slate-100'
                    : isCompleted
                    ? 'border-slate-800/80 bg-slate-950/40 text-slate-300'
                    : 'border-slate-900 bg-slate-950/20 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : isCurrent ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-slate-700 shrink-0" />
                  )}
                  <span className="text-xs sm:text-sm font-medium">
                    {st.label}
                  </span>
                </div>

                <div className="text-xs font-mono text-slate-500">
                  {isCompleted ? 'Done' : isCurrent ? 'Active' : 'Pending'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Real-time Log Feed */}
        <div className="mt-6 rounded-lg bg-slate-950 p-4 border border-slate-800/80 font-mono text-xs">
          <div className="flex items-center gap-2 text-slate-400 pb-2 mb-2 border-b border-slate-900">
            <Terminal className="h-3.5 w-3.5 text-slate-500" />
            <span>Worker Activity Stream</span>
          </div>
          <p className="text-emerald-400 animate-pulse">
            &gt; {telemetry.currentStep}
          </p>
          <div className="mt-2 text-slate-500 flex gap-4 text-[11px]">
            <span>Pages Parsed: {telemetry.pagesCrawled}</span>
            <span>Findings Recorded: {telemetry.findingsCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
