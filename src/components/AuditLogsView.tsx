import React from 'react';
import { AuditLog } from '../types.js';
import { ShieldCheck, Clock, Terminal } from 'lucide-react';

interface AuditLogsViewProps {
  logs: AuditLog[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs }) => {
  return (
    <div className="mx-auto max-w-6xl py-6 px-4 sm:px-6 space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold tracking-tight text-slate-100">
            Tenant Security &amp; Audit Logs
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Immutable event ledger tracking crawler execution, report access, and token sharing
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Telemetry Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 font-sans">
                    No security events recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-400">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {log.ipAddress}
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-md truncate">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
