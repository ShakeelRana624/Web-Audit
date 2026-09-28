import React from 'react';

interface ScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, size = 'md', showLabel = true }) => {
  // Determine color and tier
  let color = '#ef4444'; // rose-500
  let strokeBg = '#450a0a';
  let tier = 'Critical Risk';
  let tierDesc = 'Severe conversion blockers detected';

  if (score >= 85) {
    color = '#10b981'; // emerald-500
    strokeBg = '#064e3b';
    tier = 'High Converting';
    tierDesc = 'Strong conversion architecture';
  } else if (score >= 70) {
    color = '#38bdf8'; // sky-400
    strokeBg = '#082f49';
    tier = 'Moderate Health';
    tierDesc = 'Minor friction points present';
  } else if (score >= 50) {
    color = '#f59e0b'; // amber-500
    strokeBg = '#451a03';
    tier = 'Leaking Leads';
    tierDesc = 'Noticeable customer drop-off points';
  }

  const dimensions = size === 'sm' ? 64 : size === 'lg' ? 160 : 110;
  const strokeWidth = size === 'sm' ? 6 : size === 'lg' ? 12 : 9;
  const radius = (dimensions - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex items-center justify-center" style={{ width: dimensions, height: dimensions }}>
        <svg width={dimensions} height={dimensions} className="transform -rotate-90">
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={radius}
            stroke={strokeBg}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold tracking-tight text-slate-100 ${size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-lg' : 'text-2xl'}`}>
            {score}
          </span>
          {size !== 'sm' && (
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
              / 100
            </span>
          )}
        </div>
      </div>

      {showLabel && (
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-slate-100">
              {tier}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              (v1.0)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 max-w-[220px]">
            {tierDesc}
          </p>
        </div>
      )}
    </div>
  );
};
