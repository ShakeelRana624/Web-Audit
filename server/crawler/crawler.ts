import * as cheerio from 'cheerio';
import { URL } from 'url';
import { validateTargetUrl, sanitizeCrawledText } from '../core/security.js';
import { CrawledPage } from '../models/types.js';

const MAX_BYTES_PER_PAGE = 5 * 1024 * 1024; // 5 MB
const MAX_PAGES_TO_CRAWL = 6;
const REQUEST_TIMEOUT_MS = 12000;
const USER_AGENT = 'Mozilla/5.0 (compatible; LeadLeakDetector/1.0; +https://leadleakdetector.com/bot)';

const HIGH_PRIORITY_PATHS = [
  '/',
  '/contact',
  '/contact-us',
  '/pricing',
  '/services',
  '/about',
  '/about-us',
  '/book',
  '/booking',
  '/quote',
  '/free-quote',
  '/schedule'
];

interface FetchResult {
  html: string;
  statusCode: number;
  headers: Record<string, string>;
  loadTimeMs: number;
  byteSize: number;
  finalUrl: string;
}

/**
 * Fetch a single page safely with SSRF protection on each redirect and size enforcement.
 */
async function safeFetch(targetUrl: string, maxRedirects = 5): Promise<FetchResult> {
  let currentUrl = targetUrl;
  let redirectsRemaining = maxRedirects;

  while (redirectsRemaining >= 0) {
    const validation = await validateTargetUrl(currentUrl);
    if (!validation.valid || !validation.normalizedUrl) {
      throw new Error(`Crawl Security Error: ${validation.error || 'Invalid URL'}`);
    }
    currentUrl = validation.normalizedUrl;

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        redirect: 'manual', // handle redirects manually for SSRF inspection
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const loadTimeMs = Date.now() - startTime;

      // Handle Redirects
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error(`Redirect with missing Location header from ${currentUrl}`);
        }
        const resolvedRedirect = new URL(location, currentUrl).toString();
        redirectsRemaining--;
        if (redirectsRemaining < 0) {
          throw new Error('Exceeded maximum redirect hops (5)');
        }
        currentUrl = resolvedRedirect;
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        throw new Error(`Skipping non-HTML resource (${contentType}) at ${currentUrl}`);
      }

      // Read response body with byte cap
      const arrayBuffer = await response.arrayBuffer();
      const byteSize = arrayBuffer.byteLength;
      if (byteSize > MAX_BYTES_PER_PAGE) {
        throw new Error(`Page size exceeds 5MB limit (${byteSize} bytes)`);
      }

      const html = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);
      
      const headersRecord: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        headersRecord[key.toLowerCase()] = val;
      });

      return {
        html,
        statusCode: response.status,
        headers: headersRecord,
        loadTimeMs,
        byteSize,
        finalUrl: currentUrl
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s fetching ${currentUrl}`);
      }
      throw err;
    }
  }

  throw new Error('Too many redirects');
}

/**
 * Extract structured deterministic evidence from raw HTML
 */
export function parsePageHtml(url: string, html: string, statusCode: number, loadTimeMs: number, byteSize: number): CrawledPage {
  const $ = cheerio.load(html);

  const title = sanitizeCrawledText($('title').first().text(), 200);
  const metaDescription = sanitizeCrawledText($('meta[name="description" i]').attr('content') || '', 500);
  const canonical = $('link[rel="canonical" i]').attr('href') || undefined;
  const robotsMeta = $('meta[name="robots" i]').attr('content') || undefined;
  const viewportMeta = $('meta[name="viewport" i]').attr('content') || undefined;
  const language = $('html').attr('lang') || undefined;

  // Headings
  const h1: string[] = [];
  $('h1').each((_, el) => {
    const text = sanitizeCrawledText($(el).text(), 200);
    if (text) h1.push(text);
  });

  const h2: string[] = [];
  $('h2').slice(0, 10).each((_, el) => {
    const text = sanitizeCrawledText($(el).text(), 200);
    if (text) h2.push(text);
  });

  const h3: string[] = [];
  $('h3').slice(0, 10).each((_, el) => {
    const text = sanitizeCrawledText($(el).text(), 200);
    if (text) h3.push(text);
  });

  // CTA Buttons & links
  const ctaButtons: Array<{ text: string; href?: string; type: string }> = [];
  const ctaKeywords = [
    'contact', 'get started', 'book', 'schedule', 'quote', 'estimate',
    'call now', 'order', 'sign up', 'register', 'demo', 'consultation',
    'talk to', 'pricing', 'buy', 'start free', 'try'
  ];

  $('a, button, input[type="submit"], input[type="button"]').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const text = sanitizeCrawledText($(el).text() || $(el).attr('value') || $(el).attr('aria-label') || '', 100);
    const href = $(el).attr('href');
    const lowerText = text.toLowerCase();

    const isClassButton = ($(el).attr('class') || '').toLowerCase().includes('btn') ||
      ($(el).attr('class') || '').toLowerCase().includes('button');
    const matchesKeyword = ctaKeywords.some(kw => lowerText.includes(kw));

    if (text && (tag === 'button' || isClassButton || matchesKeyword)) {
      if (ctaButtons.length < 15) {
        ctaButtons.push({
          text,
          href,
          type: tag
        });
      }
    }
  });

  // Forms
  const forms: CrawledPage['forms'] = [];
  $('form').each((_, el) => {
    const action = $(el).attr('action');
    const method = $(el).attr('method') || 'GET';
    const inputs = $(el).find('input, textarea, select');
    const hasEmail = $(el).find('input[type="email"], input[name*="email" i]').length > 0;
    const hasPhone = $(el).find('input[type="tel"], input[name*="phone" i], input[name*="tel" i]').length > 0;
    const submitBtn = sanitizeCrawledText(
      $(el).find('button[type="submit"], input[type="submit"]').first().text() ||
      $(el).find('button').first().text() ||
      'Submit',
      60
    );

    forms.push({
      action,
      method,
      inputsCount: inputs.length,
      hasEmailInput: hasEmail,
      hasPhoneInput: hasPhone,
      buttonText: submitBtn
    });
  });

  // Phone and mailto links
  const telLinks: string[] = [];
  $('a[href^="tel:" i]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const cleanTel = href.replace(/^tel:/i, '').trim();
    if (cleanTel && !telLinks.includes(cleanTel)) {
      telLinks.push(cleanTel);
    }
  });

  // Also check text for phone number patterns
  const fullText = $('body').text();
  const phonePattern = /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?[2-9]\d{2}[-.\s]?\d{4}/g;
  const textPhones = fullText.match(phonePattern) || [];
  textPhones.slice(0, 3).forEach(p => {
    const clean = p.trim();
    if (!telLinks.includes(clean)) telLinks.push(clean);
  });

  const mailtoLinks: string[] = [];
  $('a[href^="mailto:" i]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const cleanMail = href.replace(/^mailto:/i, '').split('?')[0].trim();
    if (cleanMail && !mailtoLinks.includes(cleanMail)) {
      mailtoLinks.push(cleanMail);
    }
  });

  // Images
  const images: Array<{ src: string; alt: string; hasAlt: boolean }> = [];
  $('img').slice(0, 30).each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    const alt = $(el).attr('alt');
    const hasAlt = typeof alt === 'string' && alt.trim().length > 0;
    images.push({
      src: src.slice(0, 200),
      alt: sanitizeCrawledText(alt || '', 100),
      hasAlt
    });
  });

  // Open Graph
  const openGraph = {
    title: $('meta[property="og:title" i]').attr('content') || undefined,
    description: $('meta[property="og:description" i]').attr('content') || undefined,
    image: $('meta[property="og:image" i]').attr('content') || undefined
  };

  // Structured Data (JSON-LD)
  const jsonLdSchemas: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const rawJson = $(el).html();
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        jsonLdSchemas.push(parsed);
      }
    } catch {
      // Ignore malformed JSON-LD in schema parser
    }
  });

  // Body word count and text snippet for AI context
  const cleanBodyText = $('body')
    .clone()
    .find('script, style, noscript, svg, nav, footer')
    .remove()
    .end()
    .text()
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleanBodyText ? cleanBodyText.split(/\s+/).length : 0;
  const textSnippet = sanitizeCrawledText(cleanBodyText, 2500);

  return {
    url,
    statusCode,
    loadTimeMs,
    byteSize,
    title,
    metaDescription,
    canonical,
    robotsMeta,
    viewportMeta,
    language,
    headings: { h1, h2, h3 },
    ctaButtons,
    forms,
    telLinks,
    mailtoLinks,
    images,
    openGraph,
    jsonLdSchemas,
    wordCount: words,
    textSnippet
  };
}

/**
 * Discover internal page URLs on the same hostname
 */
function extractInternalLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const discovered = new Set<string>();

  $('a[href]').each((_, el) => {
    const rawHref = $(el).attr('href');
    if (!rawHref) return;

    // Ignore javascript, mailto, tel, hashes
    if (
      rawHref.startsWith('#') ||
      rawHref.startsWith('javascript:') ||
      rawHref.startsWith('mailto:') ||
      rawHref.startsWith('tel:')
    ) {
      return;
    }

    try {
      const resolved = new URL(rawHref, baseUrl);
      
      // Must be same origin / same hostname
      if (resolved.hostname.toLowerCase() === base.hostname.toLowerCase()) {
        // Exclude binary / image assets
        const pathname = resolved.pathname.toLowerCase();
        if (
          !pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|pdf|zip|tar|gz|exe|css|js|mp4|mp3|woff|woff2)$/)
        ) {
          resolved.hash = '';
          discovered.add(resolved.toString());
        }
      }
    } catch {
      // Ignore invalid URL
    }
  });

  return Array.from(discovered);
}

/**
 * Multi-page polite crawler orchestrator
 */
export async function crawlWebsite(
  rootUrl: string, 
  onProgress?: (msg: string, count: number) => void
): Promise<CrawledPage[]> {
  const pages: CrawledPage[] = [];
  const visited = new Set<string>();
  const queue: string[] = [rootUrl];

  onProgress?.('Fetching root entry page...', 0);

  // First fetch root
  try {
    const rootFetch = await safeFetch(rootUrl);
    const rootParsed = parsePageHtml(
      rootFetch.finalUrl,
      rootFetch.html,
      rootFetch.statusCode,
      rootFetch.loadTimeMs,
      rootFetch.byteSize
    );
    pages.push(rootParsed);
    visited.add(rootFetch.finalUrl);
    visited.add(rootUrl);

    // Extract links
    const internalLinks = extractInternalLinks(rootFetch.html, rootFetch.finalUrl);
    
    // Sort links: put high-priority paths (/contact, /pricing, etc.) first
    const prioritizedLinks = internalLinks.sort((a, b) => {
      const aPath = new URL(a).pathname.toLowerCase();
      const bPath = new URL(b).pathname.toLowerCase();
      const aPriority = HIGH_PRIORITY_PATHS.findIndex(p => aPath === p || aPath.startsWith(p));
      const bPriority = HIGH_PRIORITY_PATHS.findIndex(p => bPath === p || bPath.startsWith(p));
      return (bPriority === -1 ? 99 : bPriority) - (aPriority === -1 ? 99 : aPriority);
    });

    for (const link of prioritizedLinks) {
      if (!visited.has(link) && queue.length < MAX_PAGES_TO_CRAWL) {
        queue.push(link);
      }
    }
  } catch (err: any) {
    throw new Error(`Failed to crawl root URL: ${err.message || String(err)}`);
  }

  // Crawl subsequent pages up to MAX_PAGES_TO_CRAWL
  let index = 1;
  while (index < queue.length && pages.length < MAX_PAGES_TO_CRAWL) {
    const nextUrl = queue[index];
    index++;

    if (visited.has(nextUrl)) continue;
    visited.add(nextUrl);

    onProgress?.(`Crawling internal page ${pages.length + 1}/${MAX_PAGES_TO_CRAWL}: ${new URL(nextUrl).pathname}`, pages.length);

    try {
      const pageFetch = await safeFetch(nextUrl);
      const parsed = parsePageHtml(
        pageFetch.finalUrl,
        pageFetch.html,
        pageFetch.statusCode,
        pageFetch.loadTimeMs,
        pageFetch.byteSize
      );
      pages.push(parsed);
    } catch {
      // Ignore individual sub-page crawl failures to maintain robustness
    }

    // Polite delay between requests (150ms)
    await new Promise(r => setTimeout(r, 150));
  }

  onProgress?.(`Crawl completed. Discovered ${pages.length} pages.`, pages.length);
  return pages;
}
