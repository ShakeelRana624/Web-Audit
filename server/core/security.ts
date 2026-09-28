import dns from 'dns/promises';
import { URL } from 'url';

/**
 * Enterprise SSRF Protection & Network Isolation
 * Blocks all private, link-local, loopback, multicast, and metadata addresses.
 */

// Convert IPv4 string to 32-bit unsigned integer
function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
}

// Check if IPv4 is within a given CIDR
function isIpv4InCidr(ip: string, cidrNet: string, cidrMask: number): boolean {
  const ipInt = ipv4ToInt(ip);
  const netInt = ipv4ToInt(cidrNet);
  const mask = (0xffffffff << (32 - cidrMask)) >>> 0;
  return (ipInt & mask) === (netInt & mask);
}

const BLOCKED_IPV4_RANGES: Array<{ net: string; mask: number; desc: string }> = [
  { net: '127.0.0.0', mask: 8, desc: 'IPv4 Loopback' },
  { net: '10.0.0.0', mask: 8, desc: 'RFC 1918 Private Class A' },
  { net: '172.16.0.0', mask: 12, desc: 'RFC 1918 Private Class B' },
  { net: '192.168.0.0', mask: 16, desc: 'RFC 1918 Private Class C' },
  { net: '169.254.0.0', mask: 16, desc: 'Link-Local & Cloud Metadata' },
  { net: '0.0.0.0', mask: 8, desc: 'Current Network' },
  { net: '100.64.0.0', mask: 10, desc: 'Carrier-grade NAT' },
  { net: '192.0.0.0', mask: 24, desc: 'IETF Protocol' },
  { net: '192.0.2.0', mask: 24, desc: 'TEST-NET-1' },
  { net: '198.51.100.0', mask: 24, desc: 'TEST-NET-2' },
  { net: '203.0.113.0', mask: 24, desc: 'TEST-NET-3' },
  { net: '198.18.0.0', mask: 15, desc: 'Benchmark Tests' },
  { net: '224.0.0.0', mask: 4, desc: 'Multicast' },
  { net: '240.0.0.0', mask: 4, desc: 'Reserved' },
  { net: '255.255.255.255', mask: 32, desc: 'Broadcast' }
];

export function isPrivateIpv4(ip: string): { isPrivate: boolean; reason?: string } {
  for (const block of BLOCKED_IPV4_RANGES) {
    if (isIpv4InCidr(ip, block.net, block.mask)) {
      return { isPrivate: true, reason: block.desc };
    }
  }
  return { isPrivate: false };
}

export function isPrivateIpv6(ip: string): { isPrivate: boolean; reason?: string } {
  const normalized = ip.toLowerCase();
  
  // Loopback & Unspecified
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return { isPrivate: true, reason: 'IPv6 Loopback' };
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return { isPrivate: true, reason: 'IPv6 Unspecified' };
  
  // IPv4-mapped IPv6 (::ffff:192.168.1.1)
  if (normalized.startsWith('::ffff:') || normalized.startsWith('0:0:0:0:0:ffff:')) {
    const v4Part = normalized.split(':').pop();
    if (v4Part && v4Part.includes('.')) {
      return isPrivateIpv4(v4Part);
    }
  }

  // Unique Local Addresses (fc00::/7)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return { isPrivate: true, reason: 'IPv6 Unique Local' };
  }

  // Link-Local Unicast (fe80::/10)
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return { isPrivate: true, reason: 'IPv6 Link-Local' };
  }

  // Multicast (ff00::/8)
  if (normalized.startsWith('ff')) {
    return { isPrivate: true, reason: 'IPv6 Multicast' };
  }

  return { isPrivate: false };
}

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  error?: string;
  resolvedIps?: string[];
}

/**
 * Validates target URL against SSRF, dangerous protocols, and private networks.
 */
export async function validateTargetUrl(rawUrl: string): Promise<UrlValidationResult> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL must be a non-empty string' };
  }

  let parsed: URL;
  try {
    // Add https:// protocol if omitted
    const withProto = rawUrl.startsWith('http://') || rawUrl.startsWith('https://') 
      ? rawUrl 
      : `https://${rawUrl}`;
    parsed = new URL(withProto);
  } catch {
    return { valid: false, error: 'Malformed URL format' };
  }

  // Protocol validation
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: `Disallowed protocol: ${parsed.protocol}. Only HTTP and HTTPS are permitted.` };
  }

  // Username/password authentication in URL is forbidden
  if (parsed.username || parsed.password) {
    return { valid: false, error: 'URLs with embedded credentials are not allowed' };
  }

  // Port restrictions
  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    return { valid: false, error: `Disallowed port: ${parsed.port}. Only standard web ports (80, 443) are allowed.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Hostname blocklist
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.corp') ||
    hostname === 'metadata.google.internal' ||
    hostname === 'instance-data'
  ) {
    return { valid: false, error: `Forbidden hostname: ${hostname}` };
  }

  // DNS Pre-flight Check
  try {
    const lookups = await dns.lookup(hostname, { all: true });
    if (!lookups || lookups.length === 0) {
      return { valid: false, error: `DNS lookup failed for host ${hostname}` };
    }

    const resolvedIps: string[] = [];

    for (const record of lookups) {
      resolvedIps.push(record.address);
      if (record.family === 4) {
        const check = isPrivateIpv4(record.address);
        if (check.isPrivate) {
          return { valid: false, error: `SSRF Blocked: Host resolves to private/internal IPv4 address (${record.address} - ${check.reason})` };
        }
      } else if (record.family === 6) {
        const check = isPrivateIpv6(record.address);
        if (check.isPrivate) {
          return { valid: false, error: `SSRF Blocked: Host resolves to private/internal IPv6 address (${record.address} - ${check.reason})` };
        }
      }
    }

    // Clean and normalize URL
    parsed.hash = '';
    const normalized = parsed.toString();

    return {
      valid: true,
      normalizedUrl: normalized,
      resolvedIps
    };
  } catch (err: any) {
    return { valid: false, error: `DNS resolution error: ${err.message || 'Host not found'}` };
  }
}

/**
 * Sanitize untrusted crawled text to prevent control character injection
 */
export function sanitizeCrawledText(raw: string, maxLength: number = 5000): string {
  if (!raw) return '';
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // remove control chars
    .trim()
    .slice(0, maxLength);
}
