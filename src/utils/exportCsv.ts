import { AuditReport, Finding } from '../types.js';

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  // Double quotes inside fields must be escaped by another double quote
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function exportAuditLeaksToCsv(report: AuditReport): void {
  // Get all leaks (findings where passed === false)
  const leaks = report.findings.filter((f) => !f.passed);

  // Headers
  const headers = [
    'Severity',
    'Category',
    'Rule Code',
    'Title',
    'Description',
    'Penalty Impact Score',
    'Page URL',
    'Evidence Details',
    'Target Website',
    'Overall Health Score',
    'Audit Date'
  ];

  const auditDate = report.completedAt || report.createdAt;

  const rows = leaks.map((f: Finding) => [
    escapeCsvField(f.severity.toUpperCase()),
    escapeCsvField(f.category),
    escapeCsvField(f.ruleCode),
    escapeCsvField(f.title),
    escapeCsvField(f.description),
    escapeCsvField(f.impactScore),
    escapeCsvField(f.pageUrl || report.targetUrl),
    escapeCsvField(f.evidence ? JSON.stringify(f.evidence) : ''),
    escapeCsvField(report.targetUrl),
    escapeCsvField(report.overallScore),
    escapeCsvField(auditDate)
  ]);

  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.join(','))
  ].join('\r\n');

  // Trigger download with UTF-8 BOM so Excel and other spreadsheet viewers preserve character encoding
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const cleanDomain = new URL(report.targetUrl).hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `Lead-Leaks-${cleanDomain}-${new Date().toISOString().slice(0, 10)}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
