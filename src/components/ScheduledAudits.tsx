import React, { useState } from 'react';
import { Website, ScheduledAudit, ScheduleFrequency } from '../types.js';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Globe, 
  Mail, 
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  ChevronRight,
  X
} from 'lucide-react';

interface ScheduledAuditsProps {
  websites: Website[];
  schedules: ScheduledAudit[];
  onAddSchedule: (scheduleData: {
    websiteId: string;
    frequency: ScheduleFrequency;
    dayOfWeek?: number;
    dayOfMonth?: number;
    notifyEmail?: string;
  }) => Promise<void>;
  onToggleSchedule: (id: string, enabled: boolean) => Promise<void>;
  onDeleteSchedule: (id: string) => Promise<void>;
  onRunScheduleNow: (id: string) => Promise<void>;
  onLaunchNewAuditForUrl: (url: string) => void;
}

export const ScheduledAudits: React.FC<ScheduledAuditsProps> = ({
  websites,
  schedules,
  onAddSchedule,
  onToggleSchedule,
  onDeleteSchedule,
  onRunScheduleNow,
  onLaunchNewAuditForUrl
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>(websites[0]?.id || '');
  const [frequency, setFrequency] = useState<ScheduleFrequency>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // Monday
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [notifyEmail, setNotifyEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runningScheduleId, setRunningScheduleId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string>('');

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWebsiteId) {
      setFormError('Please select a website from your domain inventory.');
      return;
    }

    setFormError('');
    setIsSubmitting(true);
    try {
      await onAddSchedule({
        websiteId: selectedWebsiteId,
        frequency,
        dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
        dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
        notifyEmail: notifyEmail.trim() || undefined
      });
      setShowCreateModal(false);
      setNotifyEmail('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to create schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunNow = async (id: string) => {
    setRunningScheduleId(id);
    try {
      await onRunScheduleNow(id);
    } finally {
      setRunningScheduleId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
              Scheduled Recurring Audits
            </h2>
            <span className="text-[10px] font-mono uppercase bg-emerald-950/80 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/60">
              Autonomous Cadence
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Automate weekly or monthly lead leak audits across your monitored domains to catch conversion regression early
          </p>
        </div>

        <button
          onClick={() => {
            if (websites.length > 0 && !selectedWebsiteId) {
              setSelectedWebsiteId(websites[0].id);
            }
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-emerald-500 transition shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Scheduled Audit</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <span className="text-[11px] font-mono uppercase text-slate-400">
            Active Automations
          </span>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
            {schedules.filter(s => s.enabled).length}{' '}
            <span className="text-xs font-normal text-slate-500">/ {schedules.length} total</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Recurring background scans actively queued
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <span className="text-[11px] font-mono uppercase text-slate-400">
            Next Scheduled Run
          </span>
          <div className="text-sm font-bold font-mono text-emerald-400 mt-1 truncate">
            {schedules.filter(s => s.enabled).length > 0
              ? new Date(
                  [...schedules]
                    .filter(s => s.enabled)
                    .sort((a, b) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime())[0].nextRunAt
                ).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : 'None scheduled'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Earliest upcoming deterministic crawl
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <span className="text-[11px] font-mono uppercase text-slate-400">
            Domain Coverage
          </span>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
            {new Set(schedules.map(s => s.domain)).size}{' '}
            <span className="text-xs font-normal text-slate-500">/ {websites.length} domains</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Websites under automated cadence
          </p>
        </div>
      </div>

      {/* Scheduled Audits Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">
              Upcoming &amp; Active Schedules
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {schedules.length} configured cadence{schedules.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Domain &amp; URL</th>
                <th className="py-3.5 px-4">Frequency</th>
                <th className="py-3.5 px-4">Next Scheduled Run</th>
                <th className="py-3.5 px-4">Last Run Status</th>
                <th className="py-3.5 px-4">Notification Email</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-slate-200">
                        No recurring audits scheduled
                      </p>
                      <p className="text-xs text-slate-400">
                        Set up weekly or monthly audits to automatically track conversion leaks and ensure zero performance regression.
                      </p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Schedule First Audit</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                schedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{schedule.domain}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate max-w-xs pl-5">
                        {schedule.targetUrl}
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-200 uppercase bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        <RefreshCw className="h-3 w-3 text-emerald-400" />
                        <span>{schedule.frequency}</span>
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {schedule.frequency === 'weekly' 
                          ? `Every ${daysOfWeek.find(d => d.value === schedule.dayOfWeek)?.label || 'Monday'}`
                          : `Day ${schedule.dayOfMonth || 1} of month`}
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono">
                      <div className="font-semibold text-slate-200">
                        {new Date(schedule.nextRunAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(schedule.nextRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono text-[11px]">
                      {schedule.lastRunAt ? (
                        <div className="flex items-center gap-1.5">
                          {schedule.lastRunStatus === 'SUCCESS' ? (
                            <span className="flex items-center gap-1 text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Success</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-rose-400">
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span>Failed</span>
                            </span>
                          )}
                          <span className="text-slate-500">&middot;</span>
                          <span className="text-slate-400">
                            {new Date(schedule.lastRunAt).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Pending first run</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-slate-300 font-mono text-[11px]">
                      <div className="flex items-center gap-1 text-slate-300">
                        <Mail className="h-3 w-3 text-slate-500" />
                        <span>{schedule.notifyEmail || 'Account email'}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => onToggleSchedule(schedule.id, !schedule.enabled)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition ${
                          schedule.enabled
                            ? 'text-emerald-300 bg-emerald-950/60 border border-emerald-800/60'
                            : 'text-slate-400 bg-slate-800 border border-slate-700'
                        }`}
                        title={schedule.enabled ? 'Pause schedule' : 'Resume schedule'}
                      >
                        {schedule.enabled ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                            <span>Paused</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleRunNow(schedule.id)}
                          disabled={runningScheduleId === schedule.id}
                          className="inline-flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 px-2.5 py-1 text-xs font-semibold text-slate-200 transition"
                          title="Run audit immediately"
                        >
                          <Play className={`h-3 w-3 text-emerald-400 ${runningScheduleId === schedule.id ? 'animate-spin' : ''}`} />
                          <span>Run Now</span>
                        </button>

                        <button
                          onClick={() => onDeleteSchedule(schedule.id)}
                          className="rounded p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Delete schedule"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Set Recurring Website Audit
                  </h3>
                  <p className="text-xs text-slate-400">
                    Automatically trigger deterministic audits on a weekly or monthly cadence
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs font-sans">
              {formError && (
                <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300">
                  {formError}
                </div>
              )}

              {/* Website Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                  <span>Target Website Domain *</span>
                  {websites.length === 0 && (
                    <span className="text-[11px] text-amber-400">No domains registered yet</span>
                  )}
                </label>
                {websites.length > 0 ? (
                  <select
                    value={selectedWebsiteId}
                    onChange={(e) => setSelectedWebsiteId(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  >
                    {websites.map(site => (
                      <option key={site.id} value={site.id}>
                        {site.domain} ({site.name || 'Main'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-400">
                    No websites found. Please register a website in the Domains tab first or launch a manual audit.
                  </div>
                )}
              </div>

              {/* Cadence Frequency Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">
                  Audit Cadence Frequency *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFrequency('weekly')}
                    className={`rounded-lg border p-3 text-left transition ${
                      frequency === 'weekly'
                        ? 'border-emerald-500 bg-emerald-950/30 text-slate-100 shadow-sm'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">Weekly Audit</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Frequent monitoring for fast-moving sites
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFrequency('monthly')}
                    className={`rounded-lg border p-3 text-left transition ${
                      frequency === 'monthly'
                        ? 'border-emerald-500 bg-emerald-950/30 text-slate-100 shadow-sm'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">Monthly Audit</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      High-level cadence for stable businesses
                    </div>
                  </button>
                </div>
              </div>

              {/* Day of Week or Month */}
              {frequency === 'weekly' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">
                    Day of the Week
                  </label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {daysOfWeek.map(d => (
                      <option key={d.value} value={d.value}>
                        Every {d.label} at 09:00 AM
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">
                    Day of the Month (1st to 28th)
                  </label>
                  <select
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>
                        Day {day} of each month at 08:00 AM
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notification Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">
                  Notification Recipient Email (Optional)
                </label>
                <input
                  type="email"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="e.g. team@growthlabs.io (defaults to account email)"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || websites.length === 0}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-sm transition"
                >
                  {isSubmitting ? 'Creating Schedule...' : 'Save & Activate Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
