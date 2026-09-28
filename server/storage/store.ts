import { 
  User, 
  Organization, 
  OrganizationMember, 
  Website, 
  AuditReport, 
  AuditLog, 
  AuditProgressTelemetry,
  ScheduledAudit
} from '../models/types.js';

class InMemoryDatabase {
  users: Map<string, User> = new Map();
  organizations: Map<string, Organization> = new Map();
  members: Map<string, OrganizationMember> = new Map();
  websites: Map<string, Website> = new Map();
  audits: Map<string, AuditReport> = new Map();
  scheduledAudits: Map<string, ScheduledAudit> = new Map();
  auditLogs: AuditLog[] = [];
  activeTelemetry: Map<string, AuditProgressTelemetry> = new Map();

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Initial User
    const defaultUser: User = {
      id: 'usr_default_01',
      email: 'alex.morgan@growthlabs.io',
      fullName: 'Alex Morgan',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    };
    this.users.set(defaultUser.id, defaultUser);

    // 2. Initial Organization
    const defaultOrg: Organization = {
      id: 'org_growth_labs',
      name: 'Growth Labs Agency',
      slug: 'growth-labs',
      tier: 'PRO',
      maxAuditsPerMonth: 50,
      auditsUsedThisMonth: 12,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    };
    this.organizations.set(defaultOrg.id, defaultOrg);

    // 3. Member link
    const member: OrganizationMember = {
      id: 'mem_01',
      organizationId: defaultOrg.id,
      userId: defaultUser.id,
      role: 'OWNER',
      createdAt: defaultOrg.createdAt
    };
    this.members.set(member.id, member);

    // 4. Sample Website: Apex Plumbing & Heating (Local Service Business Leaking Mobile Leads)
    const site1: Website = {
      id: 'site_apex_01',
      organizationId: defaultOrg.id,
      domain: 'apex-heating-plumbing.com',
      baseUrl: 'https://apex-heating-plumbing.com',
      name: 'Apex Heating & Plumbing',
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      lastAuditedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      lastScore: 54
    };
    this.websites.set(site1.id, site1);

    // 5. Seed Audit for Apex Plumbing: Demonstrates Realistic Leaks
    const audit1: AuditReport = {
      id: 'audit_apex_seed_01',
      organizationId: defaultOrg.id,
      websiteId: site1.id,
      targetUrl: 'https://apex-heating-plumbing.com',
      status: 'COMPLETED',
      statusMessage: 'Audit completed successfully',
      overallScore: 54,
      scoreVersion: 'v1.0.0-PROD',
      categoryScores: {
        conversion: {
          category: 'conversion',
          score: 45,
          weight: 0.25,
          criticalCount: 1,
          highCount: 1,
          mediumCount: 1,
          lowCount: 0,
          passedCount: 1
        },
        seo: {
          category: 'seo',
          score: 65,
          weight: 0.18,
          criticalCount: 0,
          highCount: 1,
          mediumCount: 1,
          lowCount: 1,
          passedCount: 2
        },
        technical: {
          category: 'technical',
          score: 95,
          weight: 0.15,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 1,
          passedCount: 3
        },
        ux: {
          category: 'ux',
          score: 50,
          weight: 0.12,
          criticalCount: 1,
          highCount: 0,
          mediumCount: 1,
          lowCount: 0,
          passedCount: 2
        },
        performance: {
          category: 'performance',
          score: 60,
          weight: 0.10,
          criticalCount: 0,
          highCount: 1,
          mediumCount: 1,
          lowCount: 0,
          passedCount: 1
        },
        accessibility: {
          category: 'accessibility',
          score: 55,
          weight: 0.08,
          criticalCount: 0,
          highCount: 1,
          mediumCount: 1,
          lowCount: 0,
          passedCount: 1
        },
        content: {
          category: 'content',
          score: 70,
          weight: 0.05,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 1,
          lowCount: 0,
          passedCount: 1
        },
        local_business: {
          category: 'local_business',
          score: 50,
          weight: 0.04,
          criticalCount: 0,
          highCount: 1,
          mediumCount: 1,
          lowCount: 0,
          passedCount: 2
        },
        ai_visibility: {
          category: 'ai_visibility',
          score: 30,
          weight: 0.03,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 2,
          lowCount: 0,
          passedCount: 1
        }
      },
      findings: [
        {
          id: 'f-apex-01',
          auditId: 'audit_apex_seed_01',
          category: 'conversion',
          ruleCode: 'CONV_CLICK_TO_CALL_MISSING',
          severity: 'high',
          impactScore: 20,
          passed: false,
          title: 'No Direct "Click-to-Call" Link for Mobile Callers',
          description: 'The website displays a phone number in an image graphic, but no clickable tel: link exists. Over 70% of emergency plumbing searches occur on smartphones where visitors cannot copy-paste.',
          pageUrl: 'https://apex-heating-plumbing.com/',
          evidence: { rawPhoneText: '(555) 234-8900', isClickable: false },
        },
        {
          id: 'f-apex-02',
          auditId: 'audit_apex_seed_01',
          category: 'conversion',
          ruleCode: 'CONV_PRIMARY_CTA_MISSING',
          severity: 'critical',
          impactScore: 35,
          passed: false,
          title: 'Missing Hero Call-To-Action (CTA) Button',
          description: 'The homepage hero section contains a headline and photo, but zero buttons or inquiry triggers. Visitors must scroll past 4 screens to find a quote form.',
          pageUrl: 'https://apex-heating-plumbing.com/',
          evidence: { ctaCountAboveFold: 0 }
        },
        {
          id: 'f-apex-03',
          auditId: 'audit_apex_seed_01',
          category: 'ux',
          ruleCode: 'UX_VIEWPORT_MISSING',
          severity: 'critical',
          impactScore: 35,
          passed: false,
          title: 'Missing Mobile Viewport Meta Tag',
          description: 'The webpage does not declare a responsive viewport tag, causing iOS and Android devices to render a miniature 1200px desktop grid requiring manual zoom.',
          pageUrl: 'https://apex-heating-plumbing.com/',
          evidence: { viewportTag: null }
        },
        {
          id: 'f-apex-04',
          auditId: 'audit_apex_seed_01',
          category: 'performance',
          ruleCode: 'PERF_SLOW_SERVER_RESPONSE',
          severity: 'high',
          impactScore: 25,
          passed: false,
          title: 'Sluggish Initial Response (2.41s TTFB)',
          description: 'Initial server response exceeded 2.4 seconds due to unoptimized database queries on the hosting provider.',
          pageUrl: 'https://apex-heating-plumbing.com/',
          evidence: { loadTimeMs: 2410 }
        },
        {
          id: 'f-apex-05',
          auditId: 'audit_apex_seed_01',
          category: 'ai_visibility',
          ruleCode: 'AI_STRUCTURED_DATA_MISSING',
          severity: 'medium',
          impactScore: 15,
          passed: false,
          title: 'Missing LocalBusiness Schema.org Microdata',
          description: 'No structured JSON-LD data was found. AI search engines (Gemini, ChatGPT) cannot reliably discern opening hours, service radius, or customer review rating.',
          pageUrl: 'https://apex-heating-plumbing.com/',
          evidence: { schemasFound: 0 }
        },
        {
          id: 'f-apex-06',
          auditId: 'audit_apex_seed_01',
          category: 'technical',
          ruleCode: 'TECH_HTTPS_SECURE',
          severity: 'info',
          impactScore: 0,
          passed: true,
          title: 'Secure HTTPS Encryption Active',
          description: 'Valid TLS certificate installed and enforced.',
          pageUrl: 'https://apex-heating-plumbing.com/',
          evidence: { protocol: 'https:' }
        }
      ],
      priorityFixes: [
        {
          priority: 1,
          ruleCode: 'CONV_CLICK_TO_CALL_MISSING',
          category: 'conversion',
          leakExplanation: '73% of emergency local service seekers abandon sites where tapping the phone number does not launch their phone dialer immediately.',
          recommendedFix: 'Convert the header telephone number into an active `<a href="tel:5552348900" class="btn-call">` button with high visual contrast.',
          suggestedCopy: 'Call 24/7 Emergency Dispatch: (555) 234-8900'
        },
        {
          priority: 2,
          ruleCode: 'CONV_PRIMARY_CTA_MISSING',
          category: 'conversion',
          leakExplanation: 'Visitors make a bounce decision in under 4 seconds. Without an immediate action button, intent drops by 55%.',
          recommendedFix: 'Place a prominent, high-contrast button directly inside the hero banner.',
          suggestedCopy: 'Schedule Same-Day Service · Fast & Licensed'
        },
        {
          priority: 3,
          ruleCode: 'UX_VIEWPORT_MISSING',
          category: 'ux',
          leakExplanation: 'Mobile traffic accounts for 68% of home service leads. Without responsive viewport scaling, the site appears unreadable on phones.',
          recommendedFix: 'Add `<meta name="viewport" content="width=device-width, initial-scale=1.0">` to the HTML `<head>`.',
          suggestedCopy: undefined
        }
      ],
      executiveSummary: 'Apex Heating & Plumbing has a strong reputation but suffers from critical mobile friction. Lack of clickable telephone links and missing hero CTAs cause high-intent emergency searchers to bounce to competitor websites.',
      businessProfile: {
        businessType: 'Local Emergency Home Services',
        primaryOffering: 'Plumbing, Boiler Repair & Heating Installation',
        targetAudience: 'Residential Homeowners & Property Managers',
        locationSummary: 'Local Metro Area Service Radius'
      },
      quickWins: [
        'Add a sticky floating "Call Now" button for all mobile screen sizes.',
        'Insert 3-field "Request Estimate" form in the above-the-fold hero grid.',
        'Add LocalBusiness JSON-LD schema with opening hours and emergency service status.'
      ],
      pagesCrawled: [],
      pagesCrawledCount: 4,
      totalLeaksCount: 5,
      shareToken: 'apex-leak-report-2026',
      shareEnabled: true,
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      completedAt: new Date(Date.now() - 2 * 3600000 + 12000).toISOString(),
      durationMs: 12450
    };
    this.audits.set(audit1.id, audit1);

    // Additional historical seed audits for realistic trend visualization
    const historicalSeeds = [
      { id: 'audit_hist_09', domain: 'apex-heating-plumbing.com', score: 48, leaks: 7, daysAgo: 18 },
      { id: 'audit_hist_08', domain: 'summit-dental-care.com', score: 62, leaks: 5, daysAgo: 16 },
      { id: 'audit_hist_07', domain: 'peak-law-partners.com', score: 58, leaks: 6, daysAgo: 14 },
      { id: 'audit_hist_06', domain: 'metro-hvac-services.com', score: 71, leaks: 4, daysAgo: 12 },
      { id: 'audit_hist_05', domain: 'apex-heating-plumbing.com', score: 50, leaks: 6, daysAgo: 10 },
      { id: 'audit_hist_04', domain: 'beacon-accounting.io', score: 78, leaks: 3, daysAgo: 8 },
      { id: 'audit_hist_03', domain: 'cloudscale-saas.com', score: 86, leaks: 2, daysAgo: 6 },
      { id: 'audit_hist_02', domain: 'metro-hvac-services.com', score: 74, leaks: 3, daysAgo: 4 },
      { id: 'audit_hist_01', domain: 'summit-dental-care.com', score: 81, leaks: 2, daysAgo: 2 }
    ];

    historicalSeeds.forEach(h => {
      const histAudit: AuditReport = {
        ...audit1,
        id: h.id,
        targetUrl: `https://${h.domain}`,
        overallScore: h.score,
        totalLeaksCount: h.leaks,
        pagesCrawledCount: 5,
        shareToken: `share_${h.id}`,
        createdAt: new Date(Date.now() - h.daysAgo * 86400000).toISOString(),
        completedAt: new Date(Date.now() - h.daysAgo * 86400000 + 8000).toISOString()
      };
      this.audits.set(histAudit.id, histAudit);
    });

    // 7. Seed Initial Scheduled Audits
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
    nextMonday.setHours(9, 0, 0, 0);

    const nextMonthFirst = new Date();
    nextMonthFirst.setMonth(nextMonthFirst.getMonth() + 1, 1);
    nextMonthFirst.setHours(8, 0, 0, 0);

    const schedule1: ScheduledAudit = {
      id: 'sched_apex_weekly',
      organizationId: defaultOrg.id,
      websiteId: site1.id,
      domain: site1.domain,
      targetUrl: site1.baseUrl,
      frequency: 'weekly',
      dayOfWeek: 1, // Monday
      notifyEmail: defaultUser.email,
      enabled: true,
      lastRunAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      nextRunAt: nextMonday.toISOString(),
      lastRunStatus: 'SUCCESS',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    };
    this.scheduledAudits.set(schedule1.id, schedule1);

    const schedule2: ScheduledAudit = {
      id: 'sched_apex_monthly',
      organizationId: defaultOrg.id,
      websiteId: site1.id,
      domain: site1.domain,
      targetUrl: site1.baseUrl,
      frequency: 'monthly',
      dayOfMonth: 1,
      notifyEmail: defaultUser.email,
      enabled: true,
      lastRunAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      nextRunAt: nextMonthFirst.toISOString(),
      lastRunStatus: 'SUCCESS',
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString()
    };
    this.scheduledAudits.set(schedule2.id, schedule2);
  }

  // Audit Logs
  logEvent(organizationId: string, action: string, ipAddress: string, details: Record<string, any>, userId?: string) {
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId,
      userId,
      action,
      ipAddress,
      details,
      createdAt: new Date().toISOString()
    };
    this.auditLogs.unshift(log);
    // Keep max 500 logs in memory
    if (this.auditLogs.length > 500) this.auditLogs.pop();
  }
}

export const db = new InMemoryDatabase();
