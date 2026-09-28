import { Router, Request, Response } from 'express';
import { db } from '../storage/store.js';
import { createAndEnqueueAudit } from '../jobs/orchestrator.js';
import { runSelfVerificationTests } from '../tests/security_and_engine.test.js';
import { generateExecutiveSummaryWithGemini } from '../ai/gemini.js';

export const apiRouter = Router();

// Middleware: Extract tenant context (Multi-tenant authorization isolation)
function getTenantContext(req: Request) {
  // In production, extracted from verified JWT or session cookie
  const orgId = (req.headers['x-organization-id'] as string) || 'org_growth_labs';
  const org = db.organizations.get(orgId) || db.organizations.get('org_growth_labs')!;
  const user = db.users.get('usr_default_01')!;
  return { org, user };
}

// -------------------------------------------------------------
// HEALTH CHECKS & SELF-TEST
// -------------------------------------------------------------
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    scoringVersion: 'v1.0.0-PROD',
    activeAuditsRunning: Array.from(db.activeTelemetry.values()).filter(t => t.status !== 'COMPLETED' && t.status !== 'FAILED').length
  });
});

apiRouter.get('/self-test', async (_req: Request, res: Response) => {
  const testResults = await runSelfVerificationTests();
  res.status(testResults.passed ? 200 : 500).json(testResults);
});

// -------------------------------------------------------------
// AUTH & CONTEXT
// -------------------------------------------------------------
apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const { org, user } = getTenantContext(req);
  res.json({
    user,
    organization: org,
    role: 'OWNER',
    permissions: ['audit:create', 'audit:view', 'audit:delete', 'report:share', 'settings:edit']
  });
});

// -------------------------------------------------------------
// WEBSITES
// -------------------------------------------------------------
apiRouter.get('/websites', (req: Request, res: Response) => {
  const { org } = getTenantContext(req);
  const sites = Array.from(db.websites.values()).filter(w => w.organizationId === org.id);
  res.json({ data: sites });
});

apiRouter.post('/websites', (req: Request, res: Response) => {
  const { org } = getTenantContext(req);
  const { domain, name, baseUrl } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  const siteId = `site_${Date.now()}`;
  const newSite = {
    id: siteId,
    organizationId: org.id,
    domain: cleanDomain,
    baseUrl: baseUrl || `https://${cleanDomain}`,
    name: name || cleanDomain,
    createdAt: new Date().toISOString()
  };

  db.websites.set(siteId, newSite);
  db.logEvent(org.id, 'WEBSITE_REGISTERED', req.ip || '127.0.0.1', { siteId, domain: cleanDomain });

  res.status(201).json({ data: newSite });
});

// -------------------------------------------------------------
// AUDITS
// -------------------------------------------------------------
apiRouter.get('/audits', (req: Request, res: Response) => {
  const { org } = getTenantContext(req);
  const audits = Array.from(db.audits.values())
    .filter(a => a.organizationId === org.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ data: audits });
});

apiRouter.post('/audits', async (req: Request, res: Response) => {
  const { org, user } = getTenantContext(req);
  const { targetUrl } = req.body;

  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).json({ error: 'Target URL is required' });
  }

  // Quota check
  if (org.auditsUsedThisMonth >= org.maxAuditsPerMonth) {
    return res.status(403).json({
      error: `Monthly audit quota reached (${org.auditsUsedThisMonth}/${org.maxAuditsPerMonth}). Please upgrade your tier.`
    });
  }

  try {
    const { auditId, normalizedUrl } = await createAndEnqueueAudit(
      org.id,
      targetUrl,
      user.id,
      req.ip || '127.0.0.1'
    );

    res.status(202).json({
      message: 'Audit successfully queued',
      auditId,
      targetUrl: normalizedUrl,
      status: 'QUEUED'
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to queue audit' });
  }
});

apiRouter.get('/audits/:id', (req: Request, res: Response) => {
  const { org } = getTenantContext(req);
  const audit = db.audits.get(req.params.id);

  if (!audit) {
    return res.status(404).json({ error: 'Audit not found' });
  }

  // Multi-tenant check
  if (audit.organizationId !== org.id) {
    return res.status(403).json({ error: 'Access denied to this audit record' });
  }

  res.json({ data: audit });
});

apiRouter.post('/audits/:id/ai-summary', async (req: Request, res: Response) => {
  const { org } = getTenantContext(req);
  const audit = db.audits.get(req.params.id);

  if (!audit) {
    return res.status(404).json({ error: 'Audit not found' });
  }

  if (audit.organizationId !== org.id) {
    return res.status(403).json({ error: 'Access denied to this audit record' });
  }

  try {
    const aiSummaryResult = await generateExecutiveSummaryWithGemini(
      audit.targetUrl,
      audit.overallScore,
      audit.findings,
      audit.businessProfile
    );

    // Save and persist the updated executive summary onto the audit record
    audit.executiveSummary = aiSummaryResult.executiveSummary;
    (audit as any).aiExecutiveSummary = aiSummaryResult;

    db.logEvent(org.id, 'AI_EXECUTIVE_SUMMARY_GENERATED', req.ip || '127.0.0.1', {
      auditId: audit.id,
      targetUrl: audit.targetUrl,
      criticalLeaksCount: aiSummaryResult.topCriticalLeaks.length
    });

    res.json({
      data: {
        auditId: audit.id,
        aiExecutiveSummary: aiSummaryResult,
        executiveSummary: audit.executiveSummary
      }
    });
  } catch (err: any) {
    console.error('Failed generating AI Executive Summary:', err);
    res.status(500).json({ error: err.message || 'Failed to generate AI executive summary' });
  }
});

apiRouter.get('/audits/:id/telemetry', (req: Request, res: Response) => {
  const telemetry = db.activeTelemetry.get(req.params.id);
  if (!telemetry) {
    const audit = db.audits.get(req.params.id);
    if (audit) {
      return res.json({
        data: {
          auditId: audit.id,
          status: audit.status,
          currentStep: audit.statusMessage || audit.status,
          stepProgress: audit.status === 'COMPLETED' ? 100 : 0,
          pagesCrawled: audit.pagesCrawledCount,
          findingsCount: audit.findings.length,
          elapsedMs: audit.durationMs || 0
        }
      });
    }
    return res.status(404).json({ error: 'Telemetry not found for this audit' });
  }

  res.json({ data: telemetry });
});

apiRouter.post('/audits/:id/share', (req: Request, res: Response) => {
  const { org } = getTenantContext(req);
  const audit = db.audits.get(req.params.id);

  if (!audit || audit.organizationId !== org.id) {
    return res.status(404).json({ error: 'Audit not found' });
  }

  const { enabled } = req.body;
  audit.shareEnabled = typeof enabled === 'boolean' ? enabled : !audit.shareEnabled;

  db.logEvent(org.id, 'AUDIT_SHARE_TOGGLED', req.ip || '127.0.0.1', {
    auditId: audit.id,
    shareEnabled: audit.shareEnabled,
    shareToken: audit.shareToken
  });

  res.json({
    data: {
      shareEnabled: audit.shareEnabled,
      shareToken: audit.shareToken,
      shareUrl: `/share/${audit.shareToken}`
    }
  });
});

// -------------------------------------------------------------
// PUBLIC SHAREABLE REPORT (No Auth Required if Enabled)
// -------------------------------------------------------------
apiRouter.get('/reports/share/:token', (req: Request, res: Response) => {
  const token = req.params.token;
  const audit = Array.from(db.audits.values()).find(a => a.shareToken === token);

  if (!audit) {
    return res.status(404).json({ error: 'Report not found or invalid link' });
  }

  if (!audit.shareEnabled) {
    return res.status(403).json({ error: 'This report link has been deactivated by the owner' });
  }

  // Return public safe view (strip internal org identifiers if needed)
  res.json({ data: audit });
});

// -------------------------------------------------------------
// AUDIT LOGS
// -------------------------------------------------------------
apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  const { org } = getTenantContext(req);
  const logs = db.auditLogs.filter(l => l.organizationId === org.id);
  res.json({ data: logs });
});

// -------------------------------------------------------------
// SCHEDULED AUDITS
// -------------------------------------------------------------
apiRouter.get('/scheduled-audits', (req: Request, res: Response) => {
  const { org } = getTenantContext(req);
  const schedules = Array.from(db.scheduledAudits.values())
    .filter(s => s.organizationId === org.id)
    .sort((a, b) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime());

  res.json({ data: schedules });
});

apiRouter.post('/scheduled-audits', (req: Request, res: Response) => {
  const { org, user } = getTenantContext(req);
  const { websiteId, frequency, dayOfWeek, dayOfMonth, notifyEmail } = req.body;

  if (!websiteId) {
    return res.status(400).json({ error: 'websiteId is required' });
  }

  const website = db.websites.get(websiteId);
  if (!website || website.organizationId !== org.id) {
    return res.status(404).json({ error: 'Website not found or not owned by your organization' });
  }

  const validFrequency = frequency === 'monthly' ? 'monthly' : 'weekly';

  // Compute next run date based on frequency
  const now = new Date();
  const nextRun = new Date(now);

  if (validFrequency === 'weekly') {
    const targetDay = typeof dayOfWeek === 'number' && dayOfWeek >= 0 && dayOfWeek <= 6 ? dayOfWeek : 1; // default Monday
    const currentDay = now.getDay();
    let daysUntil = (targetDay - currentDay + 7) % 7;
    if (daysUntil === 0) daysUntil = 7; // schedule for next week if today
    nextRun.setDate(now.getDate() + daysUntil);
    nextRun.setHours(9, 0, 0, 0);
  } else {
    // monthly
    const targetDate = typeof dayOfMonth === 'number' && dayOfMonth >= 1 && dayOfMonth <= 28 ? dayOfMonth : 1;
    if (now.getDate() < targetDate) {
      nextRun.setDate(targetDate);
    } else {
      nextRun.setMonth(now.getMonth() + 1, targetDate);
    }
    nextRun.setHours(8, 0, 0, 0);
  }

  const schedId = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newSchedule = {
    id: schedId,
    organizationId: org.id,
    websiteId: website.id,
    domain: website.domain,
    targetUrl: website.baseUrl,
    frequency: validFrequency as 'weekly' | 'monthly',
    dayOfWeek: validFrequency === 'weekly' ? (typeof dayOfWeek === 'number' ? dayOfWeek : 1) : undefined,
    dayOfMonth: validFrequency === 'monthly' ? (typeof dayOfMonth === 'number' ? dayOfMonth : 1) : undefined,
    notifyEmail: notifyEmail || user.email,
    enabled: true,
    nextRunAt: nextRun.toISOString(),
    lastRunStatus: 'PENDING' as const,
    createdAt: new Date().toISOString()
  };

  db.scheduledAudits.set(schedId, newSchedule);
  db.logEvent(org.id, 'AUDIT_SCHEDULE_CREATED', req.ip || '127.0.0.1', {
    scheduleId: schedId,
    domain: website.domain,
    frequency: validFrequency,
    nextRunAt: nextRun.toISOString()
  });

  res.status(201).json({ data: newSchedule });
});

apiRouter.patch('/scheduled-audits/:id', (req: Request, res: Response) => {
  const { org } = getTenantContext(req);
  const schedule = db.scheduledAudits.get(req.params.id);

  if (!schedule || schedule.organizationId !== org.id) {
    return res.status(404).json({ error: 'Scheduled audit not found' });
  }

  const { enabled, frequency, dayOfWeek, dayOfMonth, notifyEmail } = req.body;

  if (typeof enabled === 'boolean') {
    schedule.enabled = enabled;
  }
  if (frequency && (frequency === 'weekly' || frequency === 'monthly')) {
    schedule.frequency = frequency;
  }
  if (typeof dayOfWeek === 'number') {
    schedule.dayOfWeek = dayOfWeek;
  }
  if (typeof dayOfMonth === 'number') {
    schedule.dayOfMonth = dayOfMonth;
  }
  if (typeof notifyEmail === 'string') {
    schedule.notifyEmail = notifyEmail;
  }

  db.logEvent(org.id, 'AUDIT_SCHEDULE_UPDATED', req.ip || '127.0.0.1', {
    scheduleId: schedule.id,
    enabled: schedule.enabled,
    frequency: schedule.frequency
  });

  res.json({ data: schedule });
});

apiRouter.delete('/scheduled-audits/:id', (req: Request, res: Response) => {
  const { org } = getTenantContext(req);
  const schedule = db.scheduledAudits.get(req.params.id);

  if (!schedule || schedule.organizationId !== org.id) {
    return res.status(404).json({ error: 'Scheduled audit not found' });
  }

  db.scheduledAudits.delete(req.params.id);
  db.logEvent(org.id, 'AUDIT_SCHEDULE_DELETED', req.ip || '127.0.0.1', {
    scheduleId: req.params.id,
    domain: schedule.domain
  });

  res.json({ message: 'Scheduled audit successfully removed', id: req.params.id });
});

// Trigger a scheduled audit immediately
apiRouter.post('/scheduled-audits/:id/run-now', async (req: Request, res: Response) => {
  const { org, user } = getTenantContext(req);
  const schedule = db.scheduledAudits.get(req.params.id);

  if (!schedule || schedule.organizationId !== org.id) {
    return res.status(404).json({ error: 'Scheduled audit not found' });
  }

  try {
    const { auditId, normalizedUrl } = await createAndEnqueueAudit(
      org.id,
      schedule.targetUrl,
      user.id,
      req.ip || '127.0.0.1'
    );

    schedule.lastRunAt = new Date().toISOString();
    schedule.lastRunStatus = 'SUCCESS';

    // Recalculate next run date
    const nextDate = new Date();
    if (schedule.frequency === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    schedule.nextRunAt = nextDate.toISOString();

    db.logEvent(org.id, 'SCHEDULED_AUDIT_MANUAL_TRIGGER', req.ip || '127.0.0.1', {
      scheduleId: schedule.id,
      auditId,
      domain: schedule.domain
    });

    res.status(202).json({
      message: 'Scheduled audit triggered successfully',
      auditId,
      schedule
    });
  } catch (err: any) {
    schedule.lastRunStatus = 'FAILED';
    res.status(400).json({ error: err.message || 'Failed to trigger scheduled audit' });
  }
});

