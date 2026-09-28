import { CategoryScore, Finding, FindingCategory } from '../models/types.js';

export const SCORE_VERSION = 'v1.0.0-PROD';

export const CATEGORY_WEIGHTS: Record<FindingCategory, number> = {
  conversion: 0.25,
  seo: 0.18,
  technical: 0.15,
  ux: 0.12,
  performance: 0.10,
  accessibility: 0.08,
  content: 0.05,
  local_business: 0.04,
  ai_visibility: 0.03
};

export const SEVERITY_DEDUCTIONS = {
  critical: 35,
  high: 20,
  medium: 10,
  low: 5,
  info: 0
};

export interface ScoringResult {
  overallScore: number;
  scoreVersion: string;
  categoryScores: Record<FindingCategory, CategoryScore>;
  totalLeaksCount: number;
  criticalLeaksCount: number;
  healthTier: 'Critical Risk' | 'Leaking Leads' | 'Moderate Health' | 'High Converting';
}

export function computeAuditScores(findings: Finding[]): ScoringResult {
  const categories: FindingCategory[] = [
    'conversion',
    'seo',
    'technical',
    'ux',
    'performance',
    'accessibility',
    'content',
    'local_business',
    'ai_visibility'
  ];

  const categoryScores: Record<FindingCategory, CategoryScore> = {} as any;
  let totalWeightedScore = 0;
  let totalLeaksCount = 0;
  let criticalLeaksCount = 0;

  for (const cat of categories) {
    const catFindings = findings.filter(f => f.category === cat);
    let categoryScore = 100;

    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let passedCount = 0;

    for (const f of catFindings) {
      if (f.passed) {
        passedCount++;
      } else {
        totalLeaksCount++;
        const deduction = SEVERITY_DEDUCTIONS[f.severity] || 0;
        categoryScore -= deduction;

        if (f.severity === 'critical') {
          criticalCount++;
          criticalLeaksCount++;
        } else if (f.severity === 'high') {
          highCount++;
        } else if (f.severity === 'medium') {
          mediumCount++;
        } else if (f.severity === 'low') {
          lowCount++;
        }
      }
    }

    // Clamp between 0 and 100
    categoryScore = Math.max(0, Math.min(100, categoryScore));
    const weight = CATEGORY_WEIGHTS[cat];

    categoryScores[cat] = {
      category: cat,
      score: categoryScore,
      weight,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      passedCount
    };

    totalWeightedScore += categoryScore * weight;
  }

  const overallScore = Math.round(totalWeightedScore);

  let healthTier: ScoringResult['healthTier'] = 'High Converting';
  if (overallScore < 50) {
    healthTier = 'Critical Risk';
  } else if (overallScore < 70) {
    healthTier = 'Leaking Leads';
  } else if (overallScore < 85) {
    healthTier = 'Moderate Health';
  }

  return {
    overallScore,
    scoreVersion: SCORE_VERSION,
    categoryScores,
    totalLeaksCount,
    criticalLeaksCount,
    healthTier
  };
}
