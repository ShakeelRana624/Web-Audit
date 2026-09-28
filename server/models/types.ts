export type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  tier: 'FREE' | 'PRO' | 'AGENCY';
  maxAuditsPerMonth: number;
  auditsUsedThisMonth: number;
  createdAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrgRole;
  createdAt: string;
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

export type AuditStatus = 
  | 'QUEUED' 
  | 'CRAWLING' 
  | 'ANALYZING' 
  | 'AI_REASONING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'CANCELLED';

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

export interface CrawledPage {
  url: string;
  statusCode: number;
  loadTimeMs: number;
  byteSize: number;
  title: string;
  metaDescription: string;
  canonical?: string;
  robotsMeta?: string;
  viewportMeta?: string;
  language?: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  ctaButtons: Array<{ text: string; href?: string; type: string }>;
  forms: Array<{ action?: string; method?: string; inputsCount: number; hasEmailInput: boolean; hasPhoneInput: boolean; buttonText?: string }>;
  telLinks: string[];
  mailtoLinks: string[];
  images: Array<{ src: string; alt: string; hasAlt: boolean }>;
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
  };
  jsonLdSchemas: any[];
  wordCount: number;
  textSnippet: string;
}

export interface Finding {
  id: string;
  auditId: string;
  category: FindingCategory;
  ruleCode: string;
  severity: FindingSeverity;
  impactScore: number; // positive number representing penalty or weight
  title: string;
  description: string;
  pageUrl: string;
  evidence: Record<string, any>;
  passed: boolean; // true if the check passed, false if it's a leak
}

export interface AIRecommendation {
  findingId?: string;
  priority: number; // 1 (highest) to 5
  ruleCode?: string;
  category: FindingCategory;
  leakExplanation: string; // Plain-English business cost
  recommendedFix: string; // Specific implementation steps
  suggestedCopy?: string; // Proposed headline, CTA button label, etc.
}

export interface CategoryScore {
  category: FindingCategory;
  score: number; // 0 - 100
  weight: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  passedCount: number;
}

export interface AuditReport {
  id: string;
  organizationId: string;
  websiteId?: string;
  targetUrl: string;
  status: AuditStatus;
  statusMessage?: string;
  overallScore: number; // 0 - 100
  scoreVersion: string;
  categoryScores: Record<FindingCategory, CategoryScore>;
  findings: Finding[];
  priorityFixes: AIRecommendation[];
  executiveSummary: string;
  businessProfile?: {
    businessType?: string;
    primaryOffering?: string;
    targetAudience?: string;
    locationSummary?: string;
  };
  quickWins: string[];
  pagesCrawled: CrawledPage[];
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
  status: AuditStatus;
  currentStep: string;
  stepProgress: number; // 0 - 100
  pagesFound: number;
  pagesCrawled: number;
  findingsCount: number;
  elapsedMs: number;
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
  dayOfWeek?: number; // 0-6 for weekly (0 = Sunday, 1 = Monday, etc.)
  dayOfMonth?: number; // 1-28 for monthly
  notifyEmail?: string;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt: string;
  lastRunStatus?: 'SUCCESS' | 'FAILED' | 'PENDING';
  createdAt: string;
}
