import React from 'react';
import { ShieldCheck, BarChart3, Search, Globe, FileText, Sparkles, Calendar } from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'new-audit' | 'websites' | 'schedules' | 'logs' | 'report';
  setActiveTab: (tab: 'dashboard' | 'new-audit' | 'websites' | 'schedules' | 'logs' | 'report') => void;
  activeReportId?: string;
  auditsCount: number;
  schedulesCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeReportId,
  auditsCount,
  schedulesCount = 0
}) => {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 text-left transition hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-100 text-sm tracking-tight sm:text-base">
                  AI Website Lead Leak Detector
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                  v1.0-PROD
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Deterministic Analysis &middot; Evidence-Backed Reasoning
              </p>
            </div>
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition ${
              activeTab === 'dashboard'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Audits</span>
            <span className="text-xs text-slate-500 ml-0.5">({auditsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('new-audit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition ${
              activeTab === 'new-audit'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
            }`}
          >
            <Search className="h-4 w-4" />
            <span>Run Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('websites')}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition ${
              activeTab === 'websites'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>Domains</span>
          </button>

          <button
            onClick={() => setActiveTab('schedules')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition ${
              activeTab === 'schedules'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Schedules</span>
            {schedulesCount > 0 && (
              <span className="text-xs text-slate-500 ml-0.5">({schedulesCount})</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition ${
              activeTab === 'logs'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Audit Logs</span>
          </button>

          {activeReportId && (
            <button
              onClick={() => setActiveTab('report')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition ${
                activeTab === 'report'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Active Report</span>
            </button>
          )}
        </nav>

        {/* Tenant context pill */}
        <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-800 text-xs">
          <div className="text-right">
            <div className="font-medium text-slate-200">Growth Labs Agency</div>
            <div className="text-slate-400 text-[11px]">Pro Tier &middot; 12/50 Used</div>
          </div>
        </div>
      </div>
    </header>
  );
};
