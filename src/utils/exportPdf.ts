import { jsPDF } from 'jspdf';
import { AuditReport } from '../types.js';

export function exportAuditReportToPdf(report: AuditReport): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkPageBreak(requiredHeight: number) {
    if (y + requiredHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeaderFooter();
    }
  }

  function drawHeaderFooter() {
    // Small running header
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('AI Website Lead Leak Detector - Executive Audit Summary', margin, 10);
    doc.text(`Scoring v${report.scoreVersion || '1.0'}`, pageWidth - margin, 10, { align: 'right' });
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.2);
    doc.line(margin, 12, pageWidth - margin, 12);

    // Running footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Confidential Audit - Target: ${report.targetUrl}`, margin, pageHeight - 8);
    const pageNum = doc.getNumberOfPages();
    doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  // --- Cover / Header Banner ---
  drawHeaderFooter();
  y = 20;

  // Header Box
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, y, contentWidth, 34, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('EXECUTIVE LEAD LEAK AUDIT REPORT', margin + 8, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Target URL: ${report.targetUrl}`, margin + 8, y + 19);

  const scannedDate = report.completedAt || report.createdAt;
  doc.text(
    `Audited Date: ${new Date(scannedDate).toLocaleDateString()} | Duration: ${report.durationMs ? (report.durationMs / 1000).toFixed(1) + 's' : 'N/A'} | Pages: ${report.pagesCrawledCount || 1}`,
    margin + 8,
    y + 26
  );

  y += 40;

  // --- Score Summary Cards ---
  const scoreCardWidth = (contentWidth - 6) / 3;

  // Health Score Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, scoreCardWidth, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('LEAD CONVERSION SCORE', margin + 5, y + 7);

  doc.setFontSize(18);
  let scoreColor: [number, number, number] = [239, 68, 68]; // rose
  if (report.overallScore >= 85) scoreColor = [16, 185, 129]; // emerald
  else if (report.overallScore >= 70) scoreColor = [56, 189, 248]; // sky
  else if (report.overallScore >= 50) scoreColor = [245, 158, 11]; // amber
  
  doc.setTextColor(...scoreColor);
  doc.text(`${report.overallScore} / 100`, margin + 5, y + 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const healthTier = report.overallScore >= 85 ? 'High Converting' : report.overallScore >= 70 ? 'Moderate Health' : report.overallScore >= 50 ? 'Leaking Leads' : 'Critical Risk';
  doc.text(`Status: ${healthTier}`, margin + 5, y + 22);

  // Leaks Found Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin + scoreCardWidth + 3, y, scoreCardWidth, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('IDENTIFIED LEAKS', margin + scoreCardWidth + 8, y + 7);

  doc.setFontSize(18);
  doc.setTextColor(225, 29, 72); // rose-600
  doc.text(`${report.totalLeaksCount || report.findings.filter(f => !f.passed).length}`, margin + scoreCardWidth + 8, y + 17);

  const criticalCount = report.findings.filter(f => !f.passed && f.severity === 'critical').length;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${criticalCount} Critical Priority Leaks`, margin + scoreCardWidth + 8, y + 22);

  // Verification Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin + (scoreCardWidth + 3) * 2, y, scoreCardWidth, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('VERIFICATION ENGINE', margin + (scoreCardWidth + 3) * 2 + 5, y + 7);

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('8 Analyzers', margin + (scoreCardWidth + 3) * 2 + 5, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const passedCount = report.findings.filter(f => f.passed).length;
  doc.text(`${passedCount} Tests Passed`, margin + (scoreCardWidth + 3) * 2 + 5, y + 22);

  y += 32;

  // --- Executive Diagnosis Section ---
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Executive Commercial Diagnosis', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85); // slate-700
  const splitSummary = doc.splitTextToSize(report.executiveSummary || 'Audit completed without summary.', contentWidth);
  doc.text(splitSummary, margin, y);
  y += splitSummary.length * 4.2 + 6;

  // Business Context Box (if available)
  if (report.businessProfile) {
    checkPageBreak(20);
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(margin, y, contentWidth, 18, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('DETECTED BUSINESS CONTEXT', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`Model: ${report.businessProfile.businessType || 'Commercial'}`, margin + 4, y + 10);
    doc.text(`Core Offering: ${report.businessProfile.primaryOffering || 'Professional Services'}`, margin + 4, y + 14);
    doc.text(`Audience: ${report.businessProfile.targetAudience || 'Consumers'}`, margin + contentWidth / 2, y + 10);
    doc.text(`Contact: ${report.businessProfile.locationSummary || 'Active'}`, margin + contentWidth / 2, y + 14);
    y += 24;
  }

  // --- Quick Wins Section ---
  if (report.quickWins && report.quickWins.length > 0) {
    checkPageBreak(25);
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.roundedRect(margin, y, contentWidth, 8 + report.quickWins.length * 5, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(4, 120, 87); // emerald-700
    doc.text('HIGH-IMPACT QUICK WINS (< 30 MINUTES TO IMPLEMENT)', margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    let qwY = y + 11;
    report.quickWins.forEach(qw => {
      doc.text(`> ${qw}`, margin + 6, qwY);
      qwY += 4.8;
    });

    y += 12 + report.quickWins.length * 5;
  }

  // --- Priority Actions Roadmap ---
  if (report.priorityFixes && report.priorityFixes.length > 0) {
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Top Priority Action Items (Ranked by Lost Lead Impact)', margin, y);
    y += 6;

    report.priorityFixes.slice(0, 5).forEach((fix, index) => {
      checkPageBreak(30);

      // Card Container
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240); // slate-200
      
      const title = `#${fix.priority || index + 1} - ${fix.ruleCode?.replace(/_/g, ' ') || 'Conversion Friction Point'} (${(fix.category || 'conversion').toUpperCase()})`;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(225, 29, 72); // rose-600
      doc.text(title, margin + 2, y + 4);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Why this loses leads:', margin + 2, y + 9);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const splitExplanation = doc.splitTextToSize(fix.leakExplanation, contentWidth - 4);
      doc.text(splitExplanation, margin + 2, y + 13);

      let cardY = y + 13 + splitExplanation.length * 3.8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(4, 120, 87); // emerald-700
      doc.text('Recommended fix:', margin + 2, cardY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const splitFix = doc.splitTextToSize(fix.recommendedFix, contentWidth - 4);
      doc.text(splitFix, margin + 2, cardY + 4);

      cardY += 4 + splitFix.length * 3.8;

      if (fix.suggestedCopy) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(180, 83, 9); // amber-700
        doc.text('Suggested high-converting copy:', margin + 2, cardY);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(`"${fix.suggestedCopy}"`, margin + 2, cardY + 3.8);
        cardY += 8;
      }

      // Border separator
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, cardY + 2, margin + contentWidth, cardY + 2);
      y = cardY + 6;
    });
  }

  // --- Dimension Score Breakdown ---
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('8-Dimension Deterministic Health Breakdown', margin, y);
  y += 6;

  const categories = Object.values(report.categoryScores || {});
  if (categories.length > 0) {
    const colW = contentWidth / 2;
    categories.forEach((catScore, i) => {
      const col = i % 2;
      const posX = margin + col * colW;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const catLabel = catScore.category.replace(/_/g, ' ').toUpperCase();
      doc.text(`${catLabel} (${Math.round((catScore.weight || 0) * 100)}% Weight)`, posX, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      let catColor: [number, number, number] = [239, 68, 68];
      if (catScore.score >= 80) catColor = [16, 185, 129];
      else if (catScore.score >= 60) catColor = [245, 158, 11];
      doc.setTextColor(...catColor);
      doc.text(`Score: ${catScore.score}/100`, posX + 60, y);

      if (col === 1 || i === categories.length - 1) {
        y += 6;
        checkPageBreak(12);
      }
    });
  }

  // Save PDF
  const cleanDomain = new URL(report.targetUrl).hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `Lead-Leak-Audit-${cleanDomain}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
