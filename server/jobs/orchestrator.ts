import crypto from 'crypto';
import { validateTargetUrl } from '../core/security.js';
import { crawlWebsite } from '../crawler/crawler.js';
import { runDeterministicAnalyzers } from '../analyzers/rules.js';
import { computeAuditScores } from '../findings/scoring.js';
import { runGeminiAnalysis } from '../ai/gemini.js';
import { db } from '../storage/store.js';
import { AuditReport, AuditProgressTelemetry } from '../models/types.js';

export async function createAndEnqueueAudit(
  organizationId: string,
  rawUrl: string,
  userId?: string,
  ipAddress = '127.0.0.1'
): Promise<{ auditId: string; normalizedUrl: string }> {
  // 1. Validate Target URL & Pre-flight SSRF
  const validation = await validateTargetUrl(rawUrl);
  if (!validation.valid || !validation.normalizedUrl) {
    throw new Error(validation.error || 'Invalid or forbidden URL target');
  }

  const normalizedUrl = validation.normalizedUrl;
  const auditId = `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const shareToken = crypto.randomBytes(16).toString('hex');

  // 2. Initialize Audit Record
  const initialAudit: AuditReport = {
    id: auditId,
    organizationId,
    targetUrl: normalizedUrl,
    status: 'QUEUED',
    statusMessage: 'Audit queued and waiting for worker execution...',
    overallScore: 0,
    scoreVersion: 'v1.0.0-PROD',
    categoryScores: {} as any,
    findings: [],
    priorityFixes: [],
    executiveSummary: '',
    quickWins: [],
    pagesCrawled: [],
    pagesCrawledCount: 0,
    totalLeaksCount: 0,
    shareToken,
    shareEnabled: false,
    createdAt: new Date().toISOString()
  };

  db.audits.set(auditId, initialAudit);

  // 3. Initialize Progress Telemetry
  const telemetry: AuditProgressTelemetry = {
    auditId,
    status: 'QUEUED',
    currentStep: 'Queue initialized',
    stepProgress: 5,
    pagesFound: 0,
    pagesCrawled: 0,
    findingsCount: 0,
    elapsedMs: 0
  };
  db.activeTelemetry.set(auditId, telemetry);

  // Log creation
  db.logEvent(organizationId, 'AUDIT_CREATED', ipAddress, { auditId, targetUrl: normalizedUrl }, userId);

  // Increment organization quota
  const org = db.organizations.get(organizationId);
  if (org) {
    org.auditsUsedThisMonth += 1;
  }

  // 4. Dispatch Async Processing in background (Non-blocking)
  setImmediate(() => {
    executeAuditPipeline(auditId, normalizedUrl, organizationId).catch(err => {
      console.error(`Audit pipeline fatal error for ${auditId}:`, err);
      const audit = db.audits.get(auditId);
      if (audit) {
        audit.status = 'FAILED';
        audit.errorMessage = err.message || 'Audit execution encountered an unexpected failure';
      }
    });
  });

  return { auditId, normalizedUrl };
}

/**
 * Worker execution pipeline
 */
async function executeAuditPipeline(auditId: string, targetUrl: string, organizationId: string) {
  const startTime = Date.now();
  const audit = db.audits.get(auditId);
  const telemetry = db.activeTelemetry.get(auditId);
  if (!audit || !telemetry) return;

  try {
    // Step 1: Crawl
    audit.status = 'CRAWLING';
    audit.statusMessage = 'Crawling site structure and discovering conversion pages...';
    telemetry.status = 'CRAWLING';
    telemetry.currentStep = 'Fetching root page and links...';
    telemetry.stepProgress = 20;

    const crawledPages = await crawlWebsite(targetUrl, (msg, count) => {
      telemetry.currentStep = msg;
      telemetry.pagesCrawled = count;
      telemetry.stepProgress = Math.min(50, 20 + count * 6);
      telemetry.elapsedMs = Date.now() - startTime;
    });

    audit.pagesCrawled = crawledPages;
    audit.pagesCrawledCount = crawledPages.length;
    telemetry.pagesCrawled = crawledPages.length;

    // Step 2: Deterministic Rule Analyzers
    audit.status = 'ANALYZING';
    audit.statusMessage = 'Running 8 deterministic conversion, SEO, and technical analyzers...';
    telemetry.status = 'ANALYZING';
    telemetry.currentStep = 'Executing deterministic rule evaluation engine...';
    telemetry.stepProgress = 60;
    telemetry.elapsedMs = Date.now() - startTime;

    const findings = runDeterministicAnalyzers(auditId, crawledPages);
    audit.findings = findings;
    telemetry.findingsCount = findings.length;

    // Compute deterministic scoring
    const scores = computeAuditScores(findings);
    audit.overallScore = scores.overallScore;
    audit.categoryScores = scores.categoryScores;
    audit.totalLeaksCount = scores.totalLeaksCount;

    // Step 3: AI Reasoning & Actionable Prioritization
    audit.status = 'AI_REASONING';
    audit.statusMessage = 'Synthesizing evidence and generating prioritized remediation roadmap...';
    telemetry.status = 'AI_REASONING';
    telemetry.currentStep = 'Formulating copy suggestions & commercial impact analysis...';
    telemetry.stepProgress = 85;
    telemetry.elapsedMs = Date.now() - startTime;

    const aiResults = await runGeminiAnalysis(targetUrl, findings, crawledPages);
    audit.executiveSummary = aiResults.executiveSummary;
    audit.businessProfile = aiResults.businessProfile;
    audit.priorityFixes = aiResults.priorityFixes;
    audit.quickWins = aiResults.quickWins;

    // Step 4: Completion
    audit.status = 'COMPLETED';
    audit.statusMessage = 'Audit completed successfully';
    audit.completedAt = new Date().toISOString();
    audit.durationMs = Date.now() - startTime;

    telemetry.status = 'COMPLETED';
    telemetry.currentStep = 'Audit report ready';
    telemetry.stepProgress = 100;
    telemetry.elapsedMs = audit.durationMs;

    // Update website record if exists
    const domain = new URL(targetUrl).hostname;
    for (const site of db.websites.values()) {
      if (site.organizationId === organizationId && site.domain === domain) {
        site.lastAuditedAt = audit.completedAt;
        site.lastScore = audit.overallScore;
        audit.websiteId = site.id;
        break;
      }
    }

    db.logEvent(organizationId, 'AUDIT_COMPLETED', '127.0.0.1', {
      auditId,
      score: audit.overallScore,
      leaksCount: audit.totalLeaksCount,
      durationMs: audit.durationMs
    });
  } catch (err: any) {
    audit.status = 'FAILED';
    audit.errorMessage = err.message || 'Audit pipeline failed during execution';
    telemetry.status = 'FAILED';
    telemetry.currentStep = `Failed: ${audit.errorMessage}`;
    db.logEvent(organizationId, 'AUDIT_FAILED', '127.0.0.1', { auditId, error: audit.errorMessage });
  }
}
