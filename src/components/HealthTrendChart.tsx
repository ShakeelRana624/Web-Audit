import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { AuditReport } from '../types.js';
import { TrendingUp, Activity } from 'lucide-react';

interface HealthTrendChartProps {
  audits: AuditReport[];
  onSelectAudit?: (audit: AuditReport) => void;
}

interface TrendDataPoint {
  auditId: string;
  auditIndex: number;
  label: string;
  domain: string;
  score: number;
  runningAvg: number;
  leaks: number;
  rawAudit: AuditReport;
}

export const HealthTrendChart: React.FC<HealthTrendChartProps> = ({
  audits,
  onSelectAudit
}) => {
  // Sort audits chronologically (oldest to newest) to show historical progression
  const sortedAudits = [...audits]
    .filter(a => a.status === 'COMPLETED' && typeof a.overallScore === 'number')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Take the last 10 audits
  const last10Audits = sortedAudits.slice(-10);

  if (last10Audits.length === 0) {
    return null;
  }

  // Calculate cumulative/running average for the 10 audits
  let cumulativeSum = 0;
  const chartData: TrendDataPoint[] = last10Audits.map((audit, idx) => {
    cumulativeSum += audit.overallScore;
    const runningAvg = Math.round(cumulativeSum / (idx + 1));
    const domain = new URL(audit.targetUrl).hostname.replace(/^www\./, '');
    const dateObj = new Date(audit.createdAt);
    const dateFormatted = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

    return {
      auditId: audit.id,
      auditIndex: idx + 1,
      label: `#${idx + 1} (${dateFormatted})`,
      domain,
      score: audit.overallScore,
      runningAvg,
      leaks: audit.totalLeaksCount,
      rawAudit: audit
    };
  });

  const overallAvg = Math.round(
    chartData.reduce((acc, d) => acc + d.score, 0) / chartData.length
  );

  const latestScore = chartData[chartData.length - 1]?.score ?? 0;
  const firstScore = chartData[0]?.score ?? 0;
  const delta = latestScore - firstScore;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 backdrop-blur-sm shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">
              Average Health Score Trend
            </h3>
            <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
              Last {chartData.length} Audits
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Running average health score and individual audit performance progression
          </p>
        </div>

        {/* Trend summary telemetry badge */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase block">Window Average</span>
            <span className="text-sm font-bold text-emerald-400">{overallAvg} / 100</span>
          </div>
          <div className="h-7 w-[1px] bg-slate-800" />
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase block">10-Audit Net</span>
            <span className={`text-sm font-bold flex items-center gap-0.5 ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <TrendingUp className={`h-3.5 w-3.5 ${delta < 0 ? 'rotate-180' : ''}`} />
              <span>{delta >= 0 ? `+${delta}` : delta} pts</span>
            </span>
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 12, left: -20, bottom: 5 }}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload[0] && onSelectAudit) {
                const point = e.activePayload[0].payload as TrendDataPoint;
                onSelectAudit(point.rawAudit);
              }
            }}
          >
            <defs>
              <linearGradient id="scoreGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              stroke="#64748b"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* 70-point benchmark line (Healthy Threshold) */}
            <ReferenceLine
              y={70}
              stroke="#38bdf8"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{
                value: 'Health Target (70)',
                position: 'right',
                fill: '#38bdf8',
                fontSize: 9,
                fontWeight: 600
              }}
            />

            {/* Running Average Line (Emerald / Smooth) */}
            <Line
              type="monotone"
              dataKey="runningAvg"
              name="Running Average"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10b981', strokeWidth: 1, stroke: '#064e3b' }}
              activeDot={{ r: 6, fill: '#34d399', stroke: '#ffffff', strokeWidth: 2 }}
            />

            {/* Individual Audit Score Line (Sky Blue / Subtle Dash) */}
            <Line
              type="monotone"
              dataKey="score"
              name="Audit Score"
              stroke="#60a5fa"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={{ r: 3, fill: '#3b82f6', strokeWidth: 1, stroke: '#1d4ed8' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & interaction hint */}
      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
            <span className="text-slate-300 font-medium">Running Average Trend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />
            <span className="text-slate-400">Individual Audit Score</span>
          </div>
        </div>
        <div className="text-slate-500 hidden sm:block">
          Tip: Click any data point to inspect that audit report
        </div>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as TrendDataPoint;
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 shadow-2xl text-xs space-y-1.5 min-w-[190px]">
        <div className="font-bold text-slate-100 flex items-center justify-between border-b border-slate-800 pb-1">
          <span className="truncate max-w-[130px]">{data.domain}</span>
          <span className="text-[10px] text-slate-400 font-mono">Audit #{data.auditIndex}</span>
        </div>
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-slate-400">Running Average:</span>
          <span className="font-bold font-mono text-emerald-400">{data.runningAvg} / 100</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Audit Score:</span>
          <span className="font-bold font-mono text-sky-400">{data.score} / 100</span>
        </div>
        <div className="flex items-center justify-between text-rose-400 font-mono text-[11px]">
          <span>Leaks Found:</span>
          <span>{data.leaks} issues</span>
        </div>
      </div>
    );
  }
  return null;
};
