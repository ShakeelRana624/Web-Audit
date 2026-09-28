export type FindingCategory = 
  | 'conversion' 
  | 'seo' 
  | 'technical' 
  | 'ux' 
  | 'performance' 
  | 'accessibility' 
  | 'content'
  | 'local_business' 
  | 'ai_visibility';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Finding {
  id: string;
  auditId: string;
  category: FindingCategory;
  ruleCode: string;
  severity: FindingSeverity;
  impactScore: number;
  title: string;
  description: string;
  pageUrl: string;
  evidence: Record<string, any>;
  passed: boolean;
}

export interface AIRecommendation {
  findingId?: string;
  priority: number;
  ruleCode?: string;
  category: FindingCategory;
  leakExplanation: string;
  recommendedFix: string;
  suggestedCopy?: string;
}

export interface CategoryScore {
  category: FindingCategory;
  score: number;
  weight: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  passedCount: number;
}

export interface AIExecutiveSummary {
  executiveSummary: string;
  topCriticalLeaks: Array<{
    title: string;
    category: string;
    severity: string;
    businessImpact: string;
    estimatedLeadLoss: string;
    recommendedAction: string;
  }>;
  overallStrategicImpact: string;
  generatedAt: string;
}

export interface AuditReport {
  id: string;
  organizationId: string;
  websiteId?: string;
  targetUrl: string;
  status: 'QUEUED' | 'CRAWLING' | 'ANALYZING' | 'AI_REASONING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  statusMessage?: string;
  overallScore: number;
  scoreVersion: string;
  categoryScores: Record<FindingCategory, CategoryScore>;
  findings: Finding[];
  priorityFixes: AIRecommendation[];
  executiveSummary: string;
  aiExecutiveSummary?: AIExecutiveSummary;
  businessProfile?: {
    businessType?: string;
    primaryOffering?: string;
    targetAudience?: string;
    locationSummary?: string;
  };
  quickWins: string[];
  pagesCrawledCount: number;
  totalLeaksCount: number;
  shareToken: string;
  shareEnabled: boolean;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  durationMs?: number;
}

export interface AuditProgressTelemetry {
  auditId: string;
  status: string;
  currentStep: string;
  stepProgress: number;
  pagesFound: number;
  pagesCrawled: number;
  findingsCount: number;
  elapsedMs: number;
}

export interface Website {
  id: string;
  organizationId: string;
  domain: string;
  baseUrl: string;
  name: string;
  createdAt: string;
  lastAuditedAt?: string;
  lastScore?: number;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  userId?: string;
  action: string;
  ipAddress: string;
  details: Record<string, any>;
  createdAt: string;
}

export type ScheduleFrequency = 'weekly' | 'monthly';

export interface ScheduledAudit {
  id: string;
  organizationId: string;
  websiteId: string;
  domain: string;
  targetUrl: string;
  frequency: ScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  notifyEmail?: string;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt: string;
  lastRunStatus?: 'SUCCESS' | 'FAILED' | 'PENDING';
  createdAt: string;
}
