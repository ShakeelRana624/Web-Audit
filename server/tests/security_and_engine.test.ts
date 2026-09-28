import { isPrivateIpv4, isPrivateIpv6, validateTargetUrl, sanitizeCrawledText } from '../core/security.js';
import { parsePageHtml } from '../crawler/crawler.js';
import { runDeterministicAnalyzers } from '../analyzers/rules.js';
import { computeAuditScores, SCORE_VERSION } from '../findings/scoring.js';

/**
 * Self-Testing Verification Suite
 * Executes unit & adversarial security tests directly to guarantee production readiness.
 */
export async function runSelfVerificationTests(): Promise<{ passed: boolean; results: string[] }> {
  const results: string[] = [];
  let allPassed = true;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      results.push(`[PASS] ${testName}`);
    } else {
      results.push(`[FAIL] ${testName}`);
      allPassed = false;
      console.error(`Assertion failed: ${testName}`);
    }
  }

  // -----------------------------------------------------------------
  // 1. SSRF & Network Security Suite
  // -----------------------------------------------------------------
  assert(isPrivateIpv4('127.0.0.1').isPrivate, 'Blocks 127.0.0.1 loopback');
  assert(isPrivateIpv4('127.255.255.254').isPrivate, 'Blocks entire 127.0.0.0/8 loopback range');
  assert(isPrivateIpv4('10.0.0.1').isPrivate, 'Blocks 10.0.0.0/8 RFC1918 class A');
  assert(isPrivateIpv4('172.16.0.1').isPrivate, 'Blocks 172.16.0.0/12 RFC1918 class B');
  assert(isPrivateIpv4('192.168.1.1').isPrivate, 'Blocks 192.168.0.0/16 RFC1918 class C');
  assert(isPrivateIpv4('169.254.169.254').isPrivate, 'Blocks AWS/GCP cloud metadata IP 169.254.169.254');
  assert(isPrivateIpv4('0.0.0.0').isPrivate, 'Blocks 0.0.0.0 current network');
  assert(!isPrivateIpv4('8.8.8.8').isPrivate, 'Allows public IPv4 8.8.8.8');
  assert(!isPrivateIpv4('1.1.1.1').isPrivate, 'Allows public IPv4 1.1.1.1');

  assert(isPrivateIpv6('::1').isPrivate, 'Blocks IPv6 loopback ::1');
  assert(isPrivateIpv6('fe80::1').isPrivate, 'Blocks IPv6 link-local fe80::1');
  assert(isPrivateIpv6('fc00::1').isPrivate, 'Blocks IPv6 unique local fc00::1');
  assert(isPrivateIpv6('::ffff:127.0.0.1').isPrivate, 'Blocks IPv4-mapped IPv6 loopback');
  assert(isPrivateIpv6('::ffff:169.254.169.254').isPrivate, 'Blocks IPv4-mapped cloud metadata');

  // URL Syntax & Hostname Filter
  const fileProto = await validateTargetUrl('file:///etc/passwd');
  assert(!fileProto.valid, 'Blocks file:// protocol traversal');

  const gopherProto = await validateTargetUrl('gopher://127.0.0.1:70');
  assert(!gopherProto.valid, 'Blocks gopher:// protocol');

  const credUrl = await validateTargetUrl('http://admin:secret@example.com');
  assert(!credUrl.valid, 'Blocks URLs with embedded credentials');

  const portUrl = await validateTargetUrl('http://example.com:22');
  assert(!portUrl.valid, 'Blocks non-web port 22');

  const localHost = await validateTargetUrl('http://localhost:3000');
  assert(!localHost.valid, 'Blocks localhost hostnames');

  // Control Character Sanitization
  const dirtyString = 'Hello\u0000World\u0007!';
  assert(sanitizeCrawledText(dirtyString) === 'HelloWorld!', 'Strips ASCII control characters to prevent injection');

  // -----------------------------------------------------------------
  // 2. Deterministic Parsing & Rules Suite
  // -----------------------------------------------------------------
  const mockHtmlWithLeaks = `
    <!DOCTYPE html>
    <html>
      <head>
        <!-- Missing Title, Viewport, Meta Description -->
      </head>
      <body>
        <p>Short paragraph without call to action.</p>
      </body>
    </html>
  `;

  const parsedLeakyPage = parsePageHtml('https://test-leak-site.com/', mockHtmlWithLeaks, 200, 300, 500);
  const findingsLeaky = runDeterministicAnalyzers('test_audit_1', [parsedLeakyPage]);

  const hasMissingCta = findingsLeaky.some(f => f.ruleCode === 'CONV_PRIMARY_CTA_MISSING' && !f.passed);
  assert(hasMissingCta, 'Deterministic Rule detects missing Call-to-Action');

  const hasMissingViewport = findingsLeaky.some(f => f.ruleCode === 'UX_VIEWPORT_MISSING' && !f.passed);
  assert(hasMissingViewport, 'Deterministic Rule detects missing mobile responsive viewport');

  const hasMissingTitle = findingsLeaky.some(f => f.ruleCode === 'SEO_TITLE_MISSING' && !f.passed);
  assert(hasMissingTitle, 'Deterministic Rule detects missing <title> tag');

  // -----------------------------------------------------------------
  // 3. Scoring System Reproducibility & Mathematical Integrity
  // -----------------------------------------------------------------
  const scoresLeaky = computeAuditScores(findingsLeaky);
  assert(scoresLeaky.overallScore < 60, `Calculated score for broken page is appropriately low (${scoresLeaky.overallScore}/100)`);
  assert(scoresLeaky.scoreVersion === SCORE_VERSION, `Scoring engine tracks version: ${SCORE_VERSION}`);
  assert(scoresLeaky.healthTier === 'Critical Risk' || scoresLeaky.healthTier === 'Leaking Leads', 'Health tier categorizes low-scoring properties accurately');

  // Repeat calculation to ensure 100% determinism (no random floating numbers)
  const scoresRepeat = computeAuditScores(findingsLeaky);
  assert(scoresLeaky.overallScore === scoresRepeat.overallScore, 'Scoring engine is strictly deterministic and repeatable across runs');

  return { passed: allPassed, results };
}
