import { CrawledPage, Finding, FindingCategory } from '../models/types.js';

export function runDeterministicAnalyzers(auditId: string, pages: CrawledPage[]): Finding[] {
  const findings: Finding[] = [];
  const rootPage = pages[0];
  if (!rootPage) return findings;

  const allPages = pages;
  const rootUrl = rootPage.url;

  // -------------------------------------------------------------
  // 1. CONVERSION ANALYZER (Weight: 25%)
  // -------------------------------------------------------------
  const rootCtas = rootPage.ctaButtons;
  const allCtas = allPages.flatMap(p => p.ctaButtons);
  const totalCtaCount = rootCtas.length;

  // Rule CONV-001: Primary CTA presence on root page
  if (totalCtaCount === 0) {
    findings.push({
      id: `${auditId}-CONV-001`,
      auditId,
      category: 'conversion',
      ruleCode: 'CONV_PRIMARY_CTA_MISSING',
      severity: 'critical',
      impactScore: 35,
      passed: false,
      title: 'Missing Primary Call-to-Action (CTA)',
      description: 'The landing page lacks a clear conversion action (e.g. "Get a Quote", "Book Appointment", "Start Free"). Visitors have no immediate path to take action.',
      pageUrl: rootUrl,
      evidence: { ctaCount: 0 }
    });
  } else {
    findings.push({
      id: `${auditId}-CONV-001`,
      auditId,
      category: 'conversion',
      ruleCode: 'CONV_PRIMARY_CTA_PRESENT',
      severity: 'info',
      impactScore: 0,
      passed: true,
      title: 'Primary Call-to-Action Identified',
      description: `Identified ${totalCtaCount} call-to-action button(s) on the main page.`,
      pageUrl: rootUrl,
      evidence: { ctas: rootCtas.slice(0, 3).map(c => c.text) }
    });
  }

  // Rule CONV-002: Click-to-Call Phone Number
  const totalPhones = allPages.flatMap(p => p.telLinks);
  if (totalPhones.length === 0) {
    findings.push({
      id: `${auditId}-CONV-002`,
      auditId,
      category: 'conversion',
      ruleCode: 'CONV_CLICK_TO_CALL_MISSING',
      severity: 'high',
      impactScore: 20,
      passed: false,
      title: 'No Direct "Click-to-Call" Phone Link Found',
      description: 'Mobile visitors cannot tap a phone number to call your business directly. This creates severe friction for high-intent mobile searchers.',
      pageUrl: rootUrl,
      evidence: { telLinksCount: 0 }
    });
  } else {
    findings.push({
      id: `${auditId}-CONV-002`,
      auditId,
      category: 'conversion',
      ruleCode: 'CONV_CLICK_TO_CALL_PRESENT',
      severity: 'info',
      impactScore: 0,
      passed: true,
      title: 'Direct Click-to-Call Configured',
      description: `Found active telephone links: ${totalPhones[0]}`,
      pageUrl: rootUrl,
      evidence: { phone: totalPhones[0] }
    });
  }

  // Rule CONV-003: Lead Capture Form Presence
  const hasForms = allPages.some(p => p.forms.length > 0);
  if (!hasForms) {
    findings.push({
      id: `${auditId}-CONV-003`,
      auditId,
      category: 'conversion',
      ruleCode: 'CONV_LEAD_FORM_MISSING',
      severity: 'high',
      impactScore: 20,
      passed: false,
      title: 'No Direct Lead Capture or Inquire Form Detected',
      description: 'None of the analyzed pages contain an interactive contact or quote inquiry form. Prospective leads must navigate away or manually write an email.',
      pageUrl: rootUrl,
      evidence: { formsDetected: 0 }
    });
  } else {
    findings.push({
      id: `${auditId}-CONV-003`,
      auditId,
      category: 'conversion',
      ruleCode: 'CONV_LEAD_FORM_PRESENT',
      severity: 'info',
      impactScore: 0,
      passed: true,
      title: 'Interactive Lead Form Present',
      description: 'Discovered interactive lead capture form with submit mechanisms.',
      pageUrl: rootUrl,
      evidence: { totalForms: allPages.reduce((acc, p) => acc + p.forms.length, 0) }
    });
  }

  // Rule CONV-004: Social Proof & Trust Signals
  const trustKeywords = ['review', 'testimonial', 'rating', 'guarantee', 'certified', 'trusted by', 'client', 'award', 'licensed'];
  const fullText = allPages.map(p => p.textSnippet.toLowerCase()).join(' ');
  const detectedTrust = trustKeywords.filter(kw => fullText.includes(kw));

  if (detectedTrust.length === 0) {
    findings.push({
      id: `${auditId}-CONV-004`,
      auditId,
      category: 'conversion',
      ruleCode: 'CONV_TRUST_SIGNALS_MISSING',
      severity: 'medium',
      impactScore: 10,
      passed: false,
      title: 'Lack of Visible Social Proof or Guarantees',
      description: 'No explicit customer reviews, ratings, guarantees, or credential statements detected. First-time buyers require social proof before submitting contact info.',
      pageUrl: rootUrl,
      evidence: { detectedKeywords: [] }
    });
  } else {
    findings.push({
      id: `${auditId}-CONV-004`,
      auditId,
      category: 'conversion',
      ruleCode: 'CONV_TRUST_SIGNALS_PRESENT',
      severity: 'info',
      impactScore: 0,
      passed: true,
      title: 'Social Proof & Credibility Indicators Detected',
      description: `Detected credibility terms: ${detectedTrust.slice(0, 4).join(', ')}`,
      pageUrl: rootUrl,
      evidence: { detectedKeywords: detectedTrust }
    });
  }

  // -------------------------------------------------------------
  // 2. SEO & DISCOVERABILITY ANALYZER (Weight: 18%)
  // -------------------------------------------------------------
  // Title Tag
  const title = rootPage.title || '';
  if (!title) {
    findings.push({
      id: `${auditId}-SEO-001`,
      auditId,
      category: 'seo',
      ruleCode: 'SEO_TITLE_MISSING',
      severity: 'critical',
      impactScore: 30,
      passed: false,
      title: 'Missing Page <title> Tag',
      description: 'The root page has no HTML title tag. Search engines cannot identify the topic, hurting rankings and search click-through rates.',
      pageUrl: rootUrl,
      evidence: { titleLength: 0 }
    });
  } else if (title.length < 25 || title.length > 70) {
    findings.push({
      id: `${auditId}-SEO-001`,
      auditId,
      category: 'seo',
      ruleCode: 'SEO_TITLE_LENGTH_SUBOPTIMAL',
      severity: 'medium',
      impactScore: 10,
      passed: false,
      title: `Suboptimal Title Tag Length (${title.length} characters)`,
      description: `Title tag should be between 30 and 60 characters for optimal search snippet display without truncation. Current title: "${title.slice(0, 50)}..."`,
      pageUrl: rootUrl,
      evidence: { title, length: title.length }
    });
  } else {
    findings.push({
      id: `${auditId}-SEO-001`,
      auditId,
      category: 'seo',
      ruleCode: 'SEO_TITLE_OPTIMAL',
      severity: 'info',
      impactScore: 0,
      passed: true,
      title: 'Title Tag is Well Optimized',
      description: `Title length (${title.length} chars) is within search engine snippet bounds.`,
      pageUrl: rootUrl,
      evidence: { title, length: title.length }
    });
  }

  // Meta Description
  const metaDesc = rootPage.metaDescription || '';
  if (!metaDesc) {
    findings.push({
      id: `${auditId}-SEO-002`,
      auditId,
      category: 'seo',
      ruleCode: 'SEO_META_DESC_MISSING',
      severity: 'high',
      impactScore: 20,
      passed: false,
      title: 'Missing Meta Description',
      description: 'The homepage does not define a meta description tag. Google will auto-generate arbitrary snippets which often reduces organic click-through rate.',
      pageUrl: rootUrl,
      evidence: { length: 0 }
    });
  } else if (metaDesc.length < 70 || metaDesc.length > 170) {
    findings.push({
      id: `${auditId}-SEO-002`,
      auditId,
      category: 'seo',
      ruleCode: 'SEO_META_DESC_LENGTH_SUBOPTIMAL',
      severity: 'low',
      impactScore: 5,
      passed: false,
      title: `Meta Description Length Could Be Improved (${metaDesc.length} chars)`,
      description: 'Meta descriptions ideally range from 120 to 160 characters to ensure maximum informative snippet visibility in SERPs.',
      pageUrl: rootUrl,
      evidence: { length: metaDesc.length, snippet: metaDesc.slice(0, 60) }
    });
  } else {
    findings.push({
      id: `${auditId}-SEO-002`,
      auditId,
      category: 'seo',
      ruleCode: 'SEO_META_DESC_OPTIMAL',
      severity: 'info',
      impactScore: 0,
      passed: true,
      title: 'Meta Description is Well Formatted',
      description: `Meta description provides a concise summary (${metaDesc.length} chars).`,
      pageUrl: rootUrl,
      evidence: { length: metaDesc.length }
    });
  }

  // H1 Heading
  const h1s = rootPage.headings.h1;
  if (h1s.length === 0) {
    findings.push({
      id: `${auditId}-SEO-003`,
      auditId,
      category: 'seo',
      ruleCode: 'SEO_H1_MISSING',
      severity: 'high',
      impactScore: 20,
      passed: false,
      title: 'Missing Primary H1 Heading',
      description: 'No <h1> tag was found on the homepage. An H1 is vital for communicating your core value proposition to visitors and search crawlers.',
      pageUrl: rootUrl,
      evidence: { h1Count: 0 }
    });
  } else if (h1s.length > 1) {
    findings.push({
      id: `${auditId}-SEO-003`,
      auditId,
      category: 'seo',
      ruleCode: 'SEO_MULTIPLE_H1',
      severity: 'low',
      impactScore: 5,
      passed: false,
      title: 'Multiple H1 Headings Detected',
      description: `Found ${h1s.length} H1 tags. Best practice recommends a single, definitive H1 per page to maintain clear topical focus.`,
      pageUrl: rootUrl,
      evidence: { count: h1s.length, h1s }
    });
  } else {
    findings.push({
      id: `${auditId}-SEO-003`,
      auditId,
      category: 'seo',
      ruleCode: 'SEO_H1_VALID',
      severity: 'info',
      impactScore: 0,
      passed: true,
      title: 'Valid Single H1 Heading Established',
      description: `Primary H1: "${h1s[0]}"`,
      pageUrl: rootUrl,
      evidence: { h1: h1s[0] }
    });
  }

  // Open Graph
  const og = rootPage.openGraph;
  if (!og.title || !og.image) {
    findings.push({
      id: `${auditId}-SEO-004`,
      auditId,
      category: 'seo',
      ruleCode: 'SEO_OG_TAGS_INCOMPLETE',
      severity: 'low',
      impactScore: 5,
      passed: false,
      title: 'Incomplete Open Graph Social Sharing Cards',
      description: 'Missing og:title or og:image tags. Links shared across LinkedIn, Slack, Twitter, and iMessage will lack attractive visual preview cards.',
      pageUrl: rootUrl,
      evidence: { ogTitle: !!og.title, ogImage: !!og.image }
    });
  }

  // -------------------------------------------------------------
  // 3. TECHNICAL HEALTH (Weight: 15%)
  // -------------------------------------------------------------
  const isHttps = rootUrl.startsWith('https://');
  if (!isHttps) {
    findings.push({
      id: `${auditId}-TECH-001`,
      auditId,
      category: 'technical',
      ruleCode: 'TECH_HTTPS_NOT_ENFORCED',
      severity: 'critical',
      impactScore: 35,
      passed: false,
      title: 'Insecure HTTP Connection (No SSL/HTTPS)',
      description: 'The site operates over unencrypted HTTP. Modern browsers flag this with "Not Secure" warnings, causing immense user distrust and lead abandonment.',
      pageUrl: rootUrl,
      evidence: { protocol: 'http:' }
    });
  } else {
    findings.push({
      id: `${auditId}-TECH-001`,
      auditId,
      category: 'technical',
      ruleCode: 'TECH_HTTPS_SECURE',
      severity: 'info',
      impactScore: 0,
      passed: true,
      title: 'Enforces Secure HTTPS Encryption',
      description: 'Site properly delivers assets over TLS/HTTPS.',
      pageUrl: rootUrl,
      evidence: { protocol: 'https:' }
    });
  }

  // Status code
  if (rootPage.statusCode !== 200) {
    findings.push({
      id: `${auditId}-TECH-002`,
      auditId,
      category: 'technical',
      ruleCode: 'TECH_STATUS_NOT_OK',
      severity: 'critical',
      impactScore: 35,
      passed: false,
      title: `Non-200 Server Response (${rootPage.statusCode})`,
      description: `The entry page returned HTTP status code ${rootPage.statusCode}.`,
      pageUrl: rootUrl,
      evidence: { statusCode: rootPage.statusCode }
    });
  } else {
    findings.push({
      id: `${auditId}-TECH-002`,
      auditId,
      category: 'technical',
      ruleCode: 'TECH_STATUS_OK',
      severity: 'info',
      impactScore: 0,
      passed: true,
      title: 'Clean HTTP 200 Response',
      description: 'Server successfully served requested entry page.',
      pageUrl: rootUrl,
      evidence: { statusCode: 200 }
    });
  }

  // -------------------------------------------------------------
  // 4. UX & MOBILE READINESS (Weight: 12%)
  // -------------------------------------------------------------
  const viewport = rootPage.viewportMeta;
  if (!viewport || !viewport.includes('width=device-width')) {
    findings.push({
      id: `${auditId}-UX-001`,
      auditId,
      category: 'ux',
      ruleCode: 'UX_VIEWPORT_MISSING',
      severity: 'critical',
      impactScore: 35,
      passed: false,
      title: 'Missing Mobile Responsive Viewport Meta Tag',
      description: 'No <meta name="viewport" content="width=device-width"> tag found. Mobile devices will render a tiny desktop version requiring pinch-to-zoom.',
      pageUrl: rootUrl,
      evidence: { viewport: viewport || null }
    });
  } else {
    findings.push({
      id: `${auditId}-UX-001`,
      auditId,
      category: 'ux',
      ruleCode: 'UX_VIEWPORT_CONFIGURED',
      severity: 'info',
      impactScore: 0,
      passed: true,
      title: 'Mobile Responsive Viewport Configured',
      description: 'Page instructs mobile browsers to render responsive layout.',
      pageUrl: rootUrl,
      evidence: { viewport }
    });
  }

  // Email discoverability
  const totalEmails = allPages.flatMap(p => p.mailtoLinks);
  if (totalEmails.length === 0 && totalPhones.length === 0) {
    findings.push({
      id: `${auditId}-UX-002`,
      auditId,
      category: 'ux',
      ruleCode: 'UX_NO_DIRECT_CONTACT_INFO',
      severity: 'high',
      impactScore: 20,
      passed: false,
      title: 'Zero Direct Contact Mechanisms Discovered',
      description: 'Neither a mailto link nor a telephone link was discovered across scanned pages. Visitors who prefer direct communication cannot reach you.',
      pageUrl: rootUrl,
      evidence: { emailCount: 0, phoneCount: 0 }
    });
  } else if (totalEmails.length > 0) {
    findings.push({
      id: `${auditId}-UX-002`,
      auditId,
      category: 'ux',
      ruleCode: 'UX_DIRECT_EMAIL_FOUND',
      severity: 'info',
      impactScore: 0,
      passed: true,
      title: 'Direct Email Contact Available',
      description: `Direct mail link found: ${totalEmails[0]}`,
      pageUrl: rootUrl,
      evidence: { email: totalEmails[0] }
    });
  }

  // -------------------------------------------------------------
  // 5. PERFORMANCE (Weight: 10%)
  // -------------------------------------------------------------
  const loadTime = rootPage.loadTimeMs;
  if (loadTime > 2500) {
    findings.push({
      id: `${auditId}-PERF-001`,
      auditId,
      category: 'performance',
      ruleCode: 'PERF_SLOW_SERVER_RESPONSE',
      severity: 'high',
      impactScore: 25,
      passed: false,
      title: `High Initial Server Latency (${(loadTime / 1000).toFixed(2)}s)`,
      description: 'Server took over 2.5 seconds to return initial HTML. High latency triggers immediate bounce rates from mobile users.',
      pageUrl: rootUrl,
      evidence: { loadTimeMs: loadTime }
    });
  } else if (loadTime > 1200) {
    findings.push({
      id: `${auditId}-PERF-001`,
      auditId,
      category: 'performance',
      ruleCode: 'PERF_MODERATE_LATENCY',
      severity: 'medium',
      impactScore: 10,
      passed: false,
      title: `Moderate Server Latency (${(loadTime / 1000).toFixed(2)}s)`,
      description: 'Target response time for initial HTML document is under 800ms.',
      pageUrl: rootUrl,
      evidence: { loadTimeMs: loadTime }
    });
  } else {
    findings.push({
      id: `${auditId}-PERF-001`,
      auditId,
      category: 'performance',
      ruleCode: 'PERF_FAST_RESPONSE',
      severity: 'info',
      impactScore: 0,
      passed: true,
      title: `Fast Initial Server Response (${loadTime}ms)`,
      description: 'Initial server document response is fast and responsive.',
      pageUrl: rootUrl,
      evidence: { loadTimeMs: loadTime }
    });
  }

  // HTML Payload Weight
  const byteWeight = rootPage.byteSize;
  if (byteWeight > 1.8 * 1024 * 1024) {
    findings.push({
      id: `${auditId}-PERF-002`,
      auditId,
      category: 'performance',
      ruleCode: 'PERF_HEAVY_HTML',
      severity: 'medium',
      impactScore: 10,
      passed: false,
      title: `Heavy HTML Document Size (${(byteWeight / 1024 / 1024).toFixed(2)}MB)`,
      description: 'HTML payload alone exceeds 1.8MB, indicating excessive inline scripts, base64 images, or bloated CSS.',
      pageUrl: rootUrl,
      evidence: { byteSize: byteWeight }
    });
  }

  // -------------------------------------------------------------
  // 6. ACCESSIBILITY (Weight: 8%)
  // -------------------------------------------------------------
  const allImages = allPages.flatMap(p => p.images);
  const imagesWithoutAlt = allImages.filter(img => !img.hasAlt);
  if (allImages.length > 0 && imagesWithoutAlt.length > 0) {
    const missingPercent = Math.round((imagesWithoutAlt.length / allImages.length) * 100);
    findings.push({
      id: `${auditId}-A11Y-001`,
      auditId,
      category: 'accessibility',
      ruleCode: 'A11Y_IMAGES_MISSING_ALT',
      severity: missingPercent > 50 ? 'high' : 'medium',
      impactScore: missingPercent > 50 ? 20 : 10,
      passed: false,
      title: `Missing Alt Text on ${imagesWithoutAlt.length} Image(s) (${missingPercent}%)`,
      description: 'Images without alt attributes prevent screen-reader users from understanding content and degrade Google Image Search ranking potential.',
      pageUrl: rootUrl,
      evidence: { totalImages: allImages.length, missingAltCount: imagesWithoutAlt.length }
    });
  } else if (allImages.length > 0) {
    findings.push({
      id: `${auditId}-A11Y-001`,
      auditId,
      category: 'accessibility',
      ruleCode: 'A11Y_IMAGES_HAVE_ALT',
      severity: 'info',
      impactScore: 0,
      passed: true,
      title: 'Images Include Descriptive Alt Attributes',
      description: 'Images inspected across crawled pages provide accessible text alternatives.',
      pageUrl: rootUrl,
      evidence: { totalImages: allImages.length }
    });
  }

  // HTML Lang attribute
  if (!rootPage.language) {
    findings.push({
      id: `${auditId}-A11Y-002`,
      auditId,
      category: 'accessibility',
      ruleCode: 'A11Y_LANG_MISSING',
      severity: 'low',
      impactScore: 5,
      passed: false,
      title: 'Missing lang Attribute on <html> Tag',
      description: 'Assistive screen readers cannot determine document language automatically.',
      pageUrl: rootUrl,
      evidence: { lang: null }
    });
  }

  // -------------------------------------------------------------
  // 7. CONTENT & VALUE PROPOSITION (Weight: 8%)
  // -------------------------------------------------------------
  if (rootPage.wordCount < 150) {
    findings.push({
      id: `${auditId}-CONT-001`,
      auditId,
      category: 'content',
      ruleCode: 'CONT_THIN_HOMEPAGE',
      severity: 'high',
      impactScore: 20,
      passed: false,
      title: `Thin Landing Page Content (${rootPage.wordCount} words)`,
      description: 'The homepage contains less than 150 words of body copy. Thin content struggles to explain your unique offering and leaves prospective buyers unconvinced.',
      pageUrl: rootUrl,
      evidence: { wordCount: rootPage.wordCount }
    });
  } else {
    findings.push({
      id: `${auditId}-CONT-001`,
      auditId,
      category: 'content',
      ruleCode: 'CONT_SUFFICIENT_DEPTH',
      severity: 'info',
      impactScore: 0,
      passed: true,
      title: 'Substantive Homepage Content Depth',
      description: `Page features ${rootPage.wordCount} words describing products or services.`,
      pageUrl: rootUrl,
      evidence: { wordCount: rootPage.wordCount }
    });
  }

  // -------------------------------------------------------------
  // 8. AI SEARCH & STRUCTURED DATA VISIBILITY (Weight: 5%)
  // -------------------------------------------------------------
  const allSchemas = allPages.flatMap(p => p.jsonLdSchemas);
  if (allSchemas.length === 0) {
    findings.push({
      id: `${auditId}-AI-001`,
      auditId,
      category: 'ai_visibility',
      ruleCode: 'AI_STRUCTURED_DATA_MISSING',
      severity: 'medium',
      impactScore: 15,
      passed: false,
      title: 'No JSON-LD Schema Structured Data Detected',
      description: 'The site lacks Schema.org JSON-LD microdata. Modern AI search agents (e.g. Gemini, Perplexity, ChatGPT Search) rely on structured data to accurately cite and recommend businesses.',
      pageUrl: rootUrl,
      evidence: { schemaCount: 0 }
    });
  } else {
    findings.push({
      id: `${auditId}-AI-001`,
      auditId,
      category: 'ai_visibility',
      ruleCode: 'AI_STRUCTURED_DATA_PRESENT',
      severity: 'info',
      impactScore: 0,
      passed: true,
      title: 'Schema.org JSON-LD Markup Discovered',
      description: `Discovered ${allSchemas.length} structured data block(s).`,
      pageUrl: rootUrl,
      evidence: {
        types: allSchemas.map(s => s['@type'] || 'Object').filter(Boolean)
      }
    });
  }

  return findings;
}
