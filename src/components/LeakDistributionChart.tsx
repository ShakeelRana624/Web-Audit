import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Sector
} from 'recharts';
import { Finding, FindingCategory } from '../types.js';
import { PieChart as PieChartIcon } from 'lucide-react';

interface LeakDistributionChartProps {
  findings: Finding[];
  onSelectCategory?: (category: FindingCategory | 'all') => void;
  selectedCategory?: FindingCategory | 'all';
}

interface CategorySlice {
  category: FindingCategory;
  name: string;
  count: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  color: string;
}

const CATEGORY_META: Record<FindingCategory, { label: string; color: string }> = {
  conversion: { label: 'Conversion', color: '#10b981' }, // Emerald
  seo: { label: 'SEO', color: '#38bdf8' }, // Sky
  technical: { label: 'Technical', color: '#818cf8' }, // Indigo
  ux: { label: 'UX & Mobile', color: '#f59e0b' }, // Amber
  performance: { label: 'Performance', color: '#ec4899' }, // Pink
  accessibility: { label: 'Accessibility', color: '#a855f7' }, // Purple
  content: { label: 'Content Clarity', color: '#3b82f6' }, // Blue
  local_business: { label: 'Local Business', color: '#14b8a6' }, // Teal
  ai_visibility: { label: 'AI Search', color: '#fb923c' } // Orange
};

const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 8}
        fill={fill}
      />
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        fill="#f8fafc"
        className="font-bold text-sm"
      >
        {value} {value === 1 ? 'Leak' : 'Leaks'}
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        fill="#94a3b8"
        className="text-[10px] font-mono uppercase"
      >
        {payload.name}
      </text>
      <text
        x={cx}
        y={cy + 24}
        textAnchor="middle"
        fill="#cbd5e1"
        className="text-[10px] font-mono"
      >
        ({(percent * 100).toFixed(0)}%)
      </text>
    </g>
  );
};

export const LeakDistributionChart: React.FC<LeakDistributionChartProps> = ({
  findings,
  onSelectCategory,
  selectedCategory = 'all'
}) => {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Filter only failed findings (leaks)
  const leaks = findings.filter((f) => !f.passed);

  if (leaks.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm shadow-xl flex flex-col items-center justify-center text-center py-8">
        <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
          <PieChartIcon className="h-5 w-5" />
        </div>
        <h4 className="text-sm font-semibold text-slate-200">Zero Leaks Identified</h4>
        <p className="text-xs text-slate-400 max-w-xs mt-1">
          All audited tests passed with optimal commercial conversion criteria.
        </p>
      </div>
    );
  }

  // Aggregate leaks by category
  const categoryCounts: Record<string, { total: number; critical: number; high: number; medium: number; low: number }> = {};

  leaks.forEach((f) => {
    if (!categoryCounts[f.category]) {
      categoryCounts[f.category] = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
    }
    categoryCounts[f.category].total += 1;
    if (f.severity === 'critical') categoryCounts[f.category].critical += 1;
    else if (f.severity === 'high') categoryCounts[f.category].high += 1;
    else if (f.severity === 'medium') categoryCounts[f.category].medium += 1;
    else categoryCounts[f.category].low += 1;
  });

  const chartData: CategorySlice[] = Object.entries(categoryCounts)
    .map(([catKey, counts]) => {
      const category = catKey as FindingCategory;
      const meta = CATEGORY_META[category] || { label: catKey, color: '#94a3b8' };
      return {
        category,
        name: meta.label,
        count: counts.total,
        criticalCount: counts.critical,
        highCount: counts.high,
        mediumCount: counts.medium,
        lowCount: counts.low,
        color: meta.color
      };
    })
    .sort((a, b) => b.count - a.count);

  const totalLeaks = leaks.length;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 backdrop-blur-sm shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">
              Leak Category Distribution
            </h3>
            <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
              {totalLeaks} Total {totalLeaks === 1 ? 'Leak' : 'Leaks'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Proportion of identified conversion and technical friction points by dimension
          </p>
        </div>

        {selectedCategory !== 'all' && onSelectCategory && (
          <button
            onClick={() => onSelectCategory('all')}
            className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 underline"
          >
            Reset filter (view all)
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-2">
        {/* Donut Chart */}
        <div className="lg:col-span-6 h-56 w-full flex items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                {...({
                  activeIndex,
                  activeShape: renderActiveShape,
                  data: chartData,
                  cx: "50%",
                  cy: "50%",
                  innerRadius: 55,
                  outerRadius: 80,
                  paddingAngle: 3,
                  dataKey: "count",
                  onMouseEnter: (_: any, index: number) => setActiveIndex(index),
                  onMouseLeave: () => setActiveIndex(undefined),
                  onClick: (entry: any) => {
                    if (onSelectCategory && entry) {
                      const cat = entry.category || entry.payload?.category;
                      if (cat) {
                        onSelectCategory(
                          selectedCategory === cat ? 'all' : cat
                        );
                      }
                    }
                  },
                  className: "cursor-pointer outline-none"
                } as any)}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={`cell-${entry.category}`}
                    fill={entry.color}
                    stroke="#0f172a"
                    strokeWidth={2}
                    opacity={
                      selectedCategory === 'all' || selectedCategory === entry.category
                        ? 1
                        : 0.35
                    }
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip totalLeaks={totalLeaks} />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Fallback center label when no slice is hovered */}
          {activeIndex === undefined && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold font-mono text-slate-100">
                {totalLeaks}
              </span>
              <span className="text-[10px] font-mono uppercase text-slate-400">
                Leaks
              </span>
            </div>
          )}
        </div>

        {/* Category breakdown list / interactive legend */}
        <div className="lg:col-span-6 space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block pb-1 border-b border-slate-800/60">
            Click category to filter evidence
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
            {chartData.map((item) => {
              const isSelected = selectedCategory === item.category;
              const percent = Math.round((item.count / totalLeaks) * 100);

              return (
                <button
                  key={item.category}
                  onClick={() =>
                    onSelectCategory &&
                    onSelectCategory(isSelected ? 'all' : item.category)
                  }
                  className={`flex items-center justify-between p-2 rounded-lg text-xs transition border text-left w-full ${
                    isSelected
                      ? 'bg-slate-800/90 border-slate-600 shadow-sm text-white'
                      : 'bg-slate-950/40 border-slate-800/70 hover:bg-slate-800/50 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium truncate">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                    {item.criticalCount > 0 && (
                      <span className="text-rose-400 text-[10px] font-bold">
                        {item.criticalCount} crit
                      </span>
                    )}
                    <span className="text-slate-400">{percent}%</span>
                    <span className="font-bold text-slate-100 bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                      {item.count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, totalLeaks }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as CategorySlice;
    const percent = ((data.count / totalLeaks) * 100).toFixed(1);

    return (
      <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 shadow-2xl text-xs space-y-1.5 min-w-[170px] z-50">
        <div className="font-bold text-slate-100 flex items-center justify-between border-b border-slate-800 pb-1">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <span>{data.name}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">{percent}%</span>
        </div>
        <div className="flex items-center justify-between pt-0.5 font-mono">
          <span className="text-slate-400">Total Leaks:</span>
          <span className="font-bold text-slate-100">{data.count}</span>
        </div>
        {data.criticalCount > 0 && (
          <div className="flex items-center justify-between font-mono text-rose-400 text-[11px]">
            <span>Critical Priority:</span>
            <span className="font-bold">{data.criticalCount}</span>
          </div>
        )}
        {data.highCount > 0 && (
          <div className="flex items-center justify-between font-mono text-amber-400 text-[11px]">
            <span>High Severity:</span>
            <span>{data.highCount}</span>
          </div>
        )}
        <div className="text-[10px] text-slate-500 pt-0.5 border-t border-slate-800/80">
          Click slice to filter findings below
        </div>
      </div>
    );
  }
  return null;
};
