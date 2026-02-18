/**
 * Talisay AI — Report Generation Service
 * Generates formal CSV and PDF reports for Admin Dashboard export.
 *
 * PDF layout includes official header:
 *   Republic of the Philippines
 *   TECHNOLOGICAL UNIVERSITY OF THE PHILIPPINES
 *   TAGUIG BRANCH
 *   ELECTRICAL AND ALLIED DEPARTMENT
 */
import { Platform, Alert } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import {
  OIL_YIELD_DATA,
  SEED_TO_OIL,
  NUTRITIONAL_DATA,
  FATTY_ACID_PROFILE,
  DIMENSION_RANGES,
  BOTANICAL_INFO,
  RESEARCH_REFERENCES,
} from '../data/talisayScience';

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const HEADER_LINES = [
  'Republic of the Philippines',
  'TECHNOLOGICAL UNIVERSITY OF THE PHILIPPINES',
  'TAGUIG BRANCH',
  'ELECTRICAL AND ALLIED DEPARTMENT',
];

const CAT_LABELS = {
  GREEN: 'Green / Immature',
  YELLOW: 'Yellow / Mature',
  BROWN: 'Brown / Overripe',
};

const fmt = (v, d = 2) => (v != null && typeof v === 'number' ? v.toFixed(d) : 'N/A');
const pct = (v, d = 1) => (v != null ? `${(v * 100).toFixed(d)}%` : 'N/A');
const fmtDate = (d) => {
  if (!d) return 'N/A';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
};
const fmtDateTime = (d) => {
  if (!d) return 'N/A';
  const dt = new Date(d);
  return dt.toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};
const today = () => fmtDate(new Date());

/* ═══════════════════════════════════════════════════
   CSV GENERATION
   ═══════════════════════════════════════════════════ */

/**
 * Build CSV string from rows (array of arrays).
 */
function buildCSV(headers, rows) {
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) lines.push(row.map(escape).join(','));
  return lines.join('\n');
}

/**
 * Generate category-specific CSV report.
 */
export function generateCategoryCSV(category, historyItems, analytics) {
  const items = historyItems.filter(h => h.category === category);
  const yieldStats = analytics?.avgYieldByCategory?.[category] || {};
  const dimStats = analytics?.dimensionStats?.[category] || {};
  const sci = OIL_YIELD_DATA[category];
  const total = items.length;

  // Summary section
  let csvContent = `TALISAY AI - ${CAT_LABELS[category]} FRUIT ANALYSIS REPORT\n`;
  csvContent += `Generated: ${today()}\n`;
  csvContent += `Category: ${CAT_LABELS[category]}\n`;
  csvContent += `Total Scans: ${total}\n\n`;
  csvContent += `--- SUMMARY STATISTICS ---\n`;
  csvContent += buildCSV(
    ['Metric', 'Value'],
    [
      ['Research Oil Yield Range', `${sci.oilYieldRange[0]}-${sci.oilYieldRange[1]}%`],
      ['Research Oil Yield Mean', `${sci.oilYieldMean}%`],
      ['System Average Oil Yield', `${fmt(yieldStats.avg)}%`],
      ['System Min Oil Yield', `${fmt(yieldStats.min)}%`],
      ['System Max Oil Yield', `${fmt(yieldStats.max)}%`],
      ['System Sample Size', yieldStats.count || 0],
      ['Avg Length (cm)', fmt(dimStats.avgLength)],
      ['Avg Width (cm)', fmt(dimStats.avgWidth)],
      ['Avg Weight (g)', fmt(dimStats.avgWeight)],
      ['Avg Kernel Weight (g)', fmt(dimStats.avgKernelWeight)],
    ]
  );

  // Confidence breakdown
  const confItems = items.filter(h => h.confidence != null);
  const avgConf = confItems.length > 0 ? confItems.reduce((s, h) => s + h.confidence, 0) / confItems.length : 0;
  const highConf = confItems.filter(h => h.confidence >= 0.8).length;
  const lowConf = confItems.filter(h => h.confidence < 0.5).length;

  csvContent += `\n--- CONFIDENCE METRICS ---\n`;
  csvContent += buildCSV(
    ['Metric', 'Value'],
    [
      ['Average Confidence', pct(avgConf)],
      ['High Confidence (>=80%)', highConf],
      ['Low Confidence (<50%)', lowConf],
      ['Total with Confidence Data', confItems.length],
    ]
  );

  // Detail rows
  csvContent += `\n--- SCAN DETAIL RECORDS ---\n`;
  csvContent += buildCSV(
    ['#', 'Date', 'User', 'Category', 'Confidence', 'Color Conf.', 'Oil Conf.', 'Oil Yield %', 'Yield Category', 'Has Spots', 'Spot Coverage', 'Coin Detected', 'Analysis Type'],
    items.map((h, i) => [
      i + 1,
      fmtDateTime(h.createdAt),
      h.userName || h.userEmail || 'N/A',
      h.category,
      pct(h.confidence),
      pct(h.colorConfidence),
      pct(h.oilConfidence),
      fmt(h.oilYieldPercent),
      h.yieldCategory || 'N/A',
      h.hasSpots ? 'Yes' : 'No',
      h.spotCoverage != null ? pct(h.spotCoverage) : 'N/A',
      h.referenceDetected ? 'Yes' : 'No',
      h.analysisType || 'single',
    ])
  );

  return csvContent;
}

/**
 * Generate overall CSV report.
 */
export function generateOverallCSV(historyItems, analytics, users) {
  const ov = analytics?.overview || {};
  const catDist = analytics?.categoryDistribution || {};
  const yieldData = analytics?.avgYieldByCategory || {};
  const yieldOverall = analytics?.avgYieldOverall || {};
  const conf = analytics?.confidenceStats || {};
  const dimStats = analytics?.dimensionStats || {};
  const coinDet = analytics?.coinDetection || {};
  const spots = analytics?.spotStats || {};

  let csv = `TALISAY AI - OVERALL ANALYSIS REPORT\n`;
  csv += `Generated: ${today()}\n\n`;

  // Overview
  csv += `--- SYSTEM OVERVIEW ---\n`;
  csv += buildCSV(
    ['Metric', 'Value'],
    [
      ['Total Users', ov.totalUsers || users.length],
      ['Total Scans', ov.totalHistory || historyItems.length],
      ['Scans Today', ov.scansToday || 0],
      ['Scans This Week', ov.scansThisWeek || 0],
      ['New Users This Month', ov.newUsersThisMonth || 0],
    ]
  );

  // Category Distribution
  csv += `\n--- MATURITY CATEGORY DISTRIBUTION ---\n`;
  const total = (catDist.GREEN || 0) + (catDist.YELLOW || 0) + (catDist.BROWN || 0) || historyItems.length;
  csv += buildCSV(
    ['Category', 'Count', 'Percentage'],
    ['GREEN', 'YELLOW', 'BROWN'].map(c => [
      CAT_LABELS[c], catDist[c] || 0,
      total > 0 ? `${(((catDist[c] || 0) / total) * 100).toFixed(1)}%` : '0%',
    ])
  );

  // Oil Yield
  csv += `\n--- OIL YIELD ANALYSIS BY CATEGORY ---\n`;
  csv += buildCSV(
    ['Category', 'Avg Yield %', 'Min Yield %', 'Max Yield %', 'Sample Size', 'Research Range'],
    ['GREEN', 'YELLOW', 'BROWN'].map(c => {
      const y = yieldData[c] || {};
      const sci = OIL_YIELD_DATA[c];
      return [CAT_LABELS[c], fmt(y.avg), fmt(y.min), fmt(y.max), y.count || 0, `${sci.oilYieldRange[0]}-${sci.oilYieldRange[1]}%`];
    })
  );

  csv += buildCSV(
    ['Overall', 'Value'],
    [
      ['Overall Average Yield', `${fmt(yieldOverall.avgYield)}%`],
      ['Overall Min Yield', `${fmt(yieldOverall.minYield)}%`],
      ['Overall Max Yield', `${fmt(yieldOverall.maxYield)}%`],
    ]
  );

  // Confidence
  csv += `\n--- MODEL CONFIDENCE METRICS ---\n`;
  csv += buildCSV(
    ['Metric', 'Value'],
    [
      ['Average Overall Confidence', pct(conf.avgConfidence)],
      ['Max Confidence', pct(conf.maxConfidence)],
      ['Min Confidence', pct(conf.minConfidence)],
      ['Avg Color Confidence', pct(conf.avgColorConfidence)],
      ['Avg Oil Confidence', pct(conf.avgOilConfidence)],
      ['Avg Fruit Detection Confidence', pct(conf.avgFruitConfidence)],
      ['High Confidence Count (>=80%)', conf.highConfidenceCount || 0],
      ['Low Confidence Count (<50%)', conf.lowConfidenceCount || 0],
    ]
  );

  // Dimensions
  csv += `\n--- SIZE ESTIMATOR BY CATEGORY ---\n`;
  csv += buildCSV(
    ['Category', 'Avg Length (cm)', 'Avg Width (cm)', 'Avg Weight (g)', 'Avg Kernel (g)', 'Samples'],
    ['GREEN', 'YELLOW', 'BROWN'].map(c => {
      const d = dimStats[c] || {};
      return [CAT_LABELS[c], fmt(d.avgLength), fmt(d.avgWidth), fmt(d.avgWeight), fmt(d.avgKernelWeight), d.count || 0];
    })
  );

  // Coin & Spots
  csv += `\n--- DETECTION QUALITY ---\n`;
  csv += buildCSV(
    ['Metric', 'Value'],
    [
      ['Coin Detected', coinDet.withCoin || 0],
      ['No Coin', (coinDet.totalScans || 0) - (coinDet.withCoin || 0)],
      ['Coin Detection Rate', coinDet.totalScans > 0 ? `${((coinDet.withCoin / coinDet.totalScans) * 100).toFixed(1)}%` : 'N/A'],
      ['Scans with Spots', spots.withSpots || 0],
      ['Avg Spot Coverage', spots.avgSpotCoverage != null ? `${(spots.avgSpotCoverage * 100).toFixed(1)}%` : 'N/A'],
    ]
  );

  // User list
  csv += `\n--- REGISTERED USERS ---\n`;
  csv += buildCSV(
    ['#', 'Name', 'Email', 'Role', 'Verified', 'Date Joined'],
    users.map((u, i) => [
      i + 1,
      [u.firstName, u.lastName].filter(Boolean).join(' ') || 'N/A',
      u.email, u.role, u.isVerified ? 'Yes' : 'No',
      fmtDate(u.createdAt),
    ])
  );

  // All scan records
  csv += `\n--- ALL SCAN RECORDS ---\n`;
  csv += buildCSV(
    ['#', 'Date', 'User', 'Category', 'Confidence', 'Oil Yield %', 'Yield Category', 'Has Spots', 'Coin Detected'],
    historyItems.map((h, i) => [
      i + 1,
      fmtDateTime(h.createdAt),
      h.userName || h.userEmail || 'N/A',
      h.category, pct(h.confidence),
      fmt(h.oilYieldPercent),
      h.yieldCategory || 'N/A',
      h.hasSpots ? 'Yes' : 'No',
      h.referenceDetected ? 'Yes' : 'No',
    ])
  );

  return csv;
}


/* ═══════════════════════════════════════════════════
   PDF GENERATION
   ═══════════════════════════════════════════════════ */

let _tupLogoBase64 = null;

/**
 * Load and cache the TUP logo as base64 for PDF embedding.
 * Platform-specific handling for web vs native.
 */
async function loadTUPLogo() {
  if (_tupLogoBase64) return _tupLogoBase64;
  
  try {
    if (Platform.OS === 'web') {
      // For web platform: load image via Image element and convert using canvas
      const logoUrl = require('../assets/images/logos/tup-t-logo.png');
      
      const base64 = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            // Create canvas to convert image
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // Convert to JPEG format which jsPDF handles better
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            resolve(dataUrl);
          } catch (err) {
            reject(err);
          }
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = logoUrl;
      });
      
      _tupLogoBase64 = base64;
      return _tupLogoBase64;
    } else {
      // For native platforms: use expo-asset and expo-file-system
      const logoAsset = Asset.fromModule(require('../assets/images/logos/tup-t-logo.png'));
      await logoAsset.downloadAsync();
      const base64 = await FileSystem.readAsStringAsync(logoAsset.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      _tupLogoBase64 = `data:image/png;base64,${base64}`;
      return _tupLogoBase64;
    }
  } catch (error) {
    console.warn('Failed to load TUP logo for PDF:', error);
    return null;
  }
}

/**
 * Draw the formal institutional header on a jsPDF page.
 * Returns the Y position after the header.
 */
function drawHeader(doc, pageWidth, logoBase64) {
  const cx = pageWidth / 2;
  let y = 15;

  // TUP Logo - Official institutional logo
  if (logoBase64) {
    try {
      const logoSize = 24; // 24mm width/height for the logo
      const logoX = 15;
      const logoY = y;
      doc.addImage(logoBase64, 'JPEG', logoX, logoY, logoSize, logoSize);
    } catch (error) {
      console.warn('Failed to add TUP logo to PDF:', error);
      // Fallback to placeholder circle if image fails
      const logoR = 12;
      doc.setDrawColor(139, 0, 0);
      doc.setLineWidth(1.5);
      doc.circle(25, y + logoR, logoR);
      doc.setFontSize(5);
      doc.setTextColor(139, 0, 0);
      doc.text('TUP', 25, y + logoR + 1.5, { align: 'center' });
      doc.setFontSize(6);
      doc.text('1901', 25, y + logoR + 4, { align: 'center' });
    }
  }

  // Header text
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Republic of the Philippines', cx, y, { align: 'center' });
  y += 5;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TECHNOLOGICAL UNIVERSITY OF THE PHILIPPINES', cx, y, { align: 'center' });
  y += 5;
  doc.setFontSize(11);
  doc.text('TAGUIG BRANCH', cx, y, { align: 'center' });
  y += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ELECTRICAL AND ALLIED DEPARTMENT', cx, y, { align: 'center' });
  y += 3;

  // Divider line
  doc.setDrawColor(139, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(15, y, pageWidth - 15, y);
  y += 2;

  return y;
}

/**
 * Draw page footer with page number.
 */
function drawFooter(doc, pageNum, totalPages, pageWidth, pageHeight) {
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  doc.text(`Talisay AI — Analysis Report`, 15, pageHeight - 8);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 15, pageHeight - 8, { align: 'right' });
  doc.text(`Generated: ${today()}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
}

/**
 * Add section title to PDF.
 */
function addSectionTitle(doc, text, y, pageWidth) {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(27, 67, 50); // dark green
  doc.text(text, 15, y);
  y += 1;
  doc.setDrawColor(27, 67, 50);
  doc.setLineWidth(0.3);
  doc.line(15, y, pageWidth - 15, y);
  return y + 4;
}

/**
 * Add a key-value table to the PDF.
 */
function addKVTable(doc, data, startY) {
  _autoTable(doc, {
    startY,
    head: [['Metric', 'Value']],
    body: data,
    theme: 'grid',
    headStyles: {
      fillColor: [27, 67, 50],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
    alternateRowStyles: { fillColor: [245, 250, 245] },
    styles: { cellPadding: 2.5, lineWidth: 0.2, lineColor: [200, 200, 200] },
    margin: { left: 15, right: 15 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 65 } },
  });
  return doc.lastAutoTable.finalY + 6;
}

/**
 * Add a data table to the PDF.
 */
function addDataTable(doc, head, body, startY, options = {}) {
  _autoTable(doc, {
    startY,
    head: [head],
    body,
    theme: 'grid',
    headStyles: {
      fillColor: options.headerColor || [27, 67, 50],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
    },
    bodyStyles: { fontSize: 7, textColor: [40, 40, 40], halign: 'center' },
    alternateRowStyles: { fillColor: [245, 250, 245] },
    styles: { cellPadding: 2, lineWidth: 0.2, lineColor: [200, 200, 200], overflow: 'linebreak' },
    margin: { left: 15, right: 15 },
    ...options,
  });
  return doc.lastAutoTable.finalY + 6;
}

/**
 * Check if we need a new page.
 */
function checkPage(doc, y, needed, pageHeight, pageWidth, logoBase64) {
  if (y + needed > pageHeight - 20) {
    doc.addPage();
    return drawHeader(doc, pageWidth, logoBase64);
  }
  return y;
}

/* ───────────────────────────────────
   CATEGORY-SPECIFIC PDF
   ─────────────────────────────────── */

/**
 * Generate category-specific PDF report.
 */
// Helper: strip non-latin1 characters to avoid jsPDF encoding errors
function sanitizeText(str) {
  if (!str) return '';
  return String(str).replace(/[^\x00-\xFF]/g, '?');
}

/* ═══════════════════════════════════════════════════
   NATIVE HTML REPORT GENERATOR
   Generates a styled HTML string for mobile sharing.
   Used on native (iOS/Android) instead of jsPDF.
   ═══════════════════════════════════════════════════ */

function htmlTable(headers, rows) {
  const ths = headers.map(h => `<th>${h}</th>`).join('');
  const trs = rows.map((row, ri) =>
    `<tr class="${ri % 2 === 0 ? 'even' : 'odd'}">${row.map(c => `<td>${c ?? ''}</td>`).join('')}</tr>`
  ).join('');
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

function htmlSection(title) {
  return `<h2>${title}</h2>`;
}

function htmlKV(rows) {
  return htmlTable(['Metric', 'Value'], rows);
}

function buildNativeHTMLReport(title, subtitle, sections) {
  const style = `
    body { font-family: Arial, sans-serif; font-size: 13px; color: #222; margin: 0; padding: 16px; }
    .header { background: #1b4332; color: #fff; padding: 16px; margin-bottom: 20px; text-align: center; border-radius: 6px; }
    .header h1 { margin: 0 0 4px; font-size: 17px; }
    .header p { margin: 2px 0; font-size: 12px; opacity: 0.85; }
    h2 { font-size: 14px; color: #1b4332; border-bottom: 2px solid #1b4332; padding-bottom: 4px; margin-top: 22px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { background: #1b4332; color: #fff; padding: 6px 8px; font-size: 11px; text-align: left; }
    td { padding: 5px 8px; font-size: 11px; border: 1px solid #d0e8d8; }
    tr.even td { background: #f0faf4; }
    tr.odd td { background: #fff; }
    .footer { margin-top: 28px; text-align: center; font-size: 10px; color: #888; border-top: 1px solid #ccc; padding-top: 8px; }
  `;
  const sectionsHTML = sections.map(s => `${htmlSection(s.title)}${s.content}`).join('\n');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${style}</style></head><body>
    <div class="header">
      <p>Republic of the Philippines</p>
      <h1>TECHNOLOGICAL UNIVERSITY OF THE PHILIPPINES</h1>
      <p>TAGUIG BRANCH &mdash; ELECTRICAL AND ALLIED DEPARTMENT</p>
      <p style="margin-top:10px;font-size:14px;font-weight:bold;">${title}</p>
      <p>${subtitle}</p>
    </div>
    ${sectionsHTML}
    <div class="footer">Talisay AI Oil Yield Analysis System &mdash; ${today()}</div>
  </body></html>`;
}

// ── Lazy jsPDF loader — web only. On native, jsPDF cannot run (latin1/encoding errors). ──
let _JsPDF = null;
let _autoTable = null;
async function loadJsPDFLibs() {
  if (Platform.OS !== 'web') {
    throw new Error('jsPDF is only supported on web. Use HTML export on native.');
  }
  if (!_JsPDF) {
    const jspdfMod = await import('jspdf');
    _JsPDF = jspdfMod.jsPDF || jspdfMod.default;
    const atMod = await import('jspdf-autotable');
    _autoTable = atMod.default;
  }
  return { JsPDF: _JsPDF, autoTable: _autoTable };
}

export async function generateCategoryPDF(category, historyItems, analytics) {
  // Native: generate a styled HTML report shared via expo-sharing
  if (Platform.OS !== 'web') {
    const items = historyItems.filter(h => h.category === category);
    const yieldStats = analytics?.avgYieldByCategory?.[category] || {};
    const dimStats = analytics?.dimensionStats?.[category] || {};
    const sci = OIL_YIELD_DATA[category];
    const confItems = items.filter(h => h.confidence != null);
    const avgConf = confItems.length > 0 ? confItems.reduce((s, h) => s + h.confidence, 0) / confItems.length : 0;
    const spotsInCat = items.filter(h => h.hasSpots);
    const coinInCat = items.filter(h => h.referenceDetected);

    const sections = [
      {
        title: '1. Executive Summary',
        content: `<p>${CAT_LABELS[category]} Talisay Fruit Analysis — ${items.length} scan(s). Research oil yield range: ${sci.oilYieldRange[0]}&ndash;${sci.oilYieldRange[1]}% (mean ${sci.oilYieldMean}%). System average: ${fmt(yieldStats.avg)}%.</p>`,
      },
      {
        title: '2. Oil Yield Statistics',
        content: htmlKV([
          ['Research Oil Yield Range', `${sci.oilYieldRange[0]}-${sci.oilYieldRange[1]}%`],
          ['Research Oil Yield Mean', `${sci.oilYieldMean}%`],
          ['System Average Oil Yield', `${fmt(yieldStats.avg)}%`],
          ['System Minimum Oil Yield', `${fmt(yieldStats.min)}%`],
          ['System Maximum Oil Yield', `${fmt(yieldStats.max)}%`],
          ['Total Samples', yieldStats.count || 0],
        ]),
      },
      {
        title: '3. Physical Dimensions',
        content: htmlKV([
          ['Average Fruit Length', `${fmt(dimStats.avgLength)} cm`],
          ['Average Fruit Width', `${fmt(dimStats.avgWidth)} cm`],
          ['Average Whole Fruit Weight', `${fmt(dimStats.avgWeight)} g`],
          ['Average Kernel Weight', `${fmt(dimStats.avgKernelWeight)} g`],
        ]),
      },
      {
        title: '4. Model Confidence',
        content: htmlKV([
          ['Average Confidence', pct(avgConf)],
          ['High Confidence Scans (>=80%)', confItems.filter(h => h.confidence >= 0.8).length],
          ['Low Confidence Scans (<50%)', confItems.filter(h => h.confidence < 0.5).length],
          ['Total with Confidence Data', confItems.length],
        ]),
      },
      {
        title: '5. Quality Indicators',
        content: htmlKV([
          ['Scans with Spots Detected', spotsInCat.length],
          ['Average Spot Coverage', spotsInCat.length > 0 ? `${(spotsInCat.reduce((s, h) => s + (h.spotCoverage || 0), 0) / spotsInCat.length * 100).toFixed(1)}%` : 'N/A'],
          ['Reference Coin Detected', coinInCat.length],
          ['Coin Detection Rate', items.length > 0 ? `${((coinInCat.length / items.length) * 100).toFixed(1)}%` : 'N/A'],
        ]),
      },
      {
        title: '6. Detailed Scan Records',
        content: items.length > 0
          ? htmlTable(
              ['#', 'Date', 'User', 'Confidence', 'Oil Yield %', 'Yield Cat.', 'Spots', 'Coin'],
              items.map((h, i) => [
                i + 1,
                fmtDateTime(h.createdAt),
                h.userName || h.userEmail || 'N/A',
                pct(h.confidence),
                fmt(h.oilYieldPercent),
                h.yieldCategory || 'N/A',
                h.hasSpots ? 'Yes' : 'No',
                h.referenceDetected ? 'Yes' : 'No',
              ])
            )
          : '<p>No scan records found for this category.</p>',
      },
    ];

    const html = buildNativeHTMLReport(
      `${CAT_LABELS[category]} Fruit — Analysis Report`,
      `Report Date: ${today()} | Total Scans: ${items.length} | Category: ${category}`,
      sections
    );
    return { _nativeHtmlReport: true, content: html };
  }

  const { JsPDF } = await loadJsPDFLibs();
  const logoBase64 = await loadTUPLogo();
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', putOnlyUsedFonts: true, compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const items = historyItems.filter(h => h.category === category);
  const yieldStats = analytics?.avgYieldByCategory?.[category] || {};
  const dimStats = analytics?.dimensionStats?.[category] || {};
  const sci = OIL_YIELD_DATA[category];
  const confItems = items.filter(h => h.confidence != null);
  const avgConf = confItems.length > 0 ? confItems.reduce((s, h) => s + h.confidence, 0) / confItems.length : 0;

  // ── Page 1: Header + Title ──
  let y = drawHeader(doc, pageWidth, logoBase64);
  y += 4;

  // Report title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`${CAT_LABELS[category]} Talisay Fruit — Analysis Report`, pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Report Date: ${today()}  |  Total Scans: ${items.length}  |  Category: ${category}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  // ── Section: Executive Summary ──
  y = addSectionTitle(doc, '1. Executive Summary', y, pageWidth);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  const summaryText = `This report presents a detailed analysis of ${items.length} Talisay fruit scan(s) classified as ${CAT_LABELS[category]}. ` +
    `${sci.description} Research literature indicates an oil yield range of ${sci.oilYieldRange[0]}-${sci.oilYieldRange[1]}% for this maturity stage ` +
    `(mean: ${sci.oilYieldMean}%). The system recorded an average oil yield of ${fmt(yieldStats.avg)}% across ${yieldStats.count || 0} sample(s).`;
  const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 30);
  doc.text(splitSummary, 15, y);
  y += splitSummary.length * 4 + 4;

  // ── Section: Oil Yield Statistics ──
  y = checkPage(doc, y, 50, pageHeight, pageWidth, logoBase64);
  y = addSectionTitle(doc, '2. Oil Yield Statistics', y, pageWidth);
  y = addKVTable(doc, [
    ['Research Oil Yield Range', `${sci.oilYieldRange[0]}-${sci.oilYieldRange[1]}%`],
    ['Research Oil Yield Mean', `${sci.oilYieldMean}%`],
    ['System Average Oil Yield', `${fmt(yieldStats.avg)}%`],
    ['System Minimum Oil Yield', `${fmt(yieldStats.min)}%`],
    ['System Maximum Oil Yield', `${fmt(yieldStats.max)}%`],
    ['Total Samples', String(yieldStats.count || 0)],
  ], y);

  // ── Section: Physical Dimensions ──
  y = checkPage(doc, y, 50, pageHeight, pageWidth, logoBase64);
  y = addSectionTitle(doc, '3. Physical Dimension Statistics', y, pageWidth);
  y = addKVTable(doc, [
    ['Average Fruit Length', `${fmt(dimStats.avgLength)} cm`],
    ['Average Fruit Width', `${fmt(dimStats.avgWidth)} cm`],
    ['Average Whole Fruit Weight', `${fmt(dimStats.avgWeight)} g`],
    ['Average Kernel Weight', `${fmt(dimStats.avgKernelWeight)} g`],
    ['Expected Length Range', `${DIMENSION_RANGES.fruitLength.min}-${DIMENSION_RANGES.fruitLength.max} cm`],
    ['Expected Width Range', `${DIMENSION_RANGES.fruitWidth.min}-${DIMENSION_RANGES.fruitWidth.max} cm`],
    ['Expected Fruit Weight Range', `${DIMENSION_RANGES.wholeFruitWeight.min}-${DIMENSION_RANGES.wholeFruitWeight.max} g`],
  ], y);

  // ── Section: Confidence Metrics ──
  y = checkPage(doc, y, 50, pageHeight, pageWidth, logoBase64);
  y = addSectionTitle(doc, '4. Model Confidence Metrics', y, pageWidth);
  y = addKVTable(doc, [
    ['Average Confidence', pct(avgConf)],
    ['High Confidence Scans (>=80%)', String(confItems.filter(h => h.confidence >= 0.8).length)],
    ['Low Confidence Scans (<50%)', String(confItems.filter(h => h.confidence < 0.5).length)],
    ['Total Scans with Confidence Data', String(confItems.length)],
  ], y);

  // ── Section: Spot Detection ──
  const spotsInCat = items.filter(h => h.hasSpots);
  const coinInCat = items.filter(h => h.referenceDetected);
  y = checkPage(doc, y, 40, pageHeight, pageWidth, logoBase64);
  y = addSectionTitle(doc, '5. Quality Indicators', y, pageWidth);
  y = addKVTable(doc, [
    ['Scans with Spots Detected', String(spotsInCat.length)],
    ['Average Spot Coverage', spotsInCat.length > 0 ? `${(spotsInCat.reduce((s, h) => s + (h.spotCoverage || 0), 0) / spotsInCat.length * 100).toFixed(1)}%` : 'N/A'],
    ['Reference Coin Detected', String(coinInCat.length)],
    ['Coin Detection Rate', items.length > 0 ? `${((coinInCat.length / items.length) * 100).toFixed(1)}%` : 'N/A'],
  ], y);

  // ── Section: Detailed Scan Records ──
  y = checkPage(doc, y, 30, pageHeight, pageWidth, logoBase64);
  y = addSectionTitle(doc, '6. Detailed Scan Records', y, pageWidth);

  if (items.length > 0) {
    const catColor = category === 'GREEN' ? [34, 197, 94] : category === 'YELLOW' ? [234, 179, 8] : [161, 98, 7];
    y = addDataTable(doc,
      ['#', 'Date', 'User', 'Confidence', 'Oil Yield %', 'Yield Cat.', 'Spots', 'Coin'],
      items.map((h, i) => [
        i + 1,
        fmtDateTime(h.createdAt),
        sanitizeText(h.userName || h.userEmail || 'N/A'),
        pct(h.confidence),
        fmt(h.oilYieldPercent),
        sanitizeText(h.yieldCategory || 'N/A'),
        h.hasSpots ? 'Yes' : 'No',
        h.referenceDetected ? 'Yes' : 'No',
      ]),
      y,
      { headerColor: catColor }
    );
  } else {
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('No scan records found for this category.', 15, y);
    y += 6;
  }

  // ── Footer on all pages ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages, pageWidth, pageHeight);
  }

  return doc;
}


/* ───────────────────────────────────
   OVERALL PDF
   ─────────────────────────────────── */

/**
 * Generate comprehensive overall PDF report.
 */
export async function generateOverallPDF(historyItems, analytics, users) {
  // Native: generate a styled HTML report shared via expo-sharing
  if (Platform.OS !== 'web') {
    const ov = analytics?.overview || {};
    const catDist = analytics?.categoryDistribution || {};
    const yieldData = analytics?.avgYieldByCategory || {};
    const yieldOverall = analytics?.avgYieldOverall || {};
    const conf = analytics?.confidenceStats || {};
    const dimStats = analytics?.dimensionStats || {};
    const coinDet = analytics?.coinDetection || {};
    const spots = analytics?.spotStats || {};
    const totalScans = ov.totalHistory || historyItems.length;
    const catTotal = (catDist.GREEN || 0) + (catDist.YELLOW || 0) + (catDist.BROWN || 0);

    const sections = [
      {
        title: '1. Executive Summary',
        content: `<p>This report provides a comprehensive overview of the Talisay AI Oil Yield Analysis System. The system has processed ${totalScans} fruit scan(s) from ${ov.totalUsers || users.length} registered user(s). The overall average oil yield across all categories is ${fmt(yieldOverall.avgYield)}%.</p>`,
      },
      {
        title: '2. System Overview',
        content: htmlKV([
          ['Total Registered Users', ov.totalUsers || users.length],
          ['Total Fruit Scans', totalScans],
          ['Scans Today', ov.scansToday || 0],
          ['Scans This Week', ov.scansThisWeek || 0],
          ['New Users This Month', ov.newUsersThisMonth || 0],
          ['High Yield Scans (Yellow + Brown)', ov.highYieldCount || 0],
          ['Low Yield Scans (Green)', ov.lowYieldCount || 0],
        ]),
      },
      {
        title: '3. Maturity Category Distribution',
        content: htmlTable(
          ['Category', 'Count', 'Percentage', 'Oil Yield Range (Research)'],
          ['GREEN', 'YELLOW', 'BROWN'].map(c => {
            const sci = OIL_YIELD_DATA[c];
            return [CAT_LABELS[c], catDist[c] || 0, catTotal > 0 ? `${(((catDist[c] || 0) / catTotal) * 100).toFixed(1)}%` : '0%', `${sci.oilYieldRange[0]}-${sci.oilYieldRange[1]}%`];
          })
        ),
      },
      {
        title: '4. Oil Yield Analysis by Category',
        content: htmlTable(
          ['Category', 'Avg Yield', 'Min Yield', 'Max Yield', 'Samples', 'Research Mean'],
          ['GREEN', 'YELLOW', 'BROWN'].map(c => {
            const yd = yieldData[c] || {};
            const sci = OIL_YIELD_DATA[c];
            return [CAT_LABELS[c], `${fmt(yd.avg)}%`, `${fmt(yd.min)}%`, `${fmt(yd.max)}%`, yd.count || 0, `${sci.oilYieldMean}%`];
          })
        ) + htmlKV([
          ['Overall Average Oil Yield', `${fmt(yieldOverall.avgYield)}%`],
          ['Overall Minimum Oil Yield', `${fmt(yieldOverall.minYield)}%`],
          ['Overall Maximum Oil Yield', `${fmt(yieldOverall.maxYield)}%`],
        ]),
      },
      {
        title: '5. Model Confidence Metrics',
        content: htmlKV([
          ['Average Overall Confidence', pct(conf.avgConfidence)],
          ['Maximum Confidence', pct(conf.maxConfidence)],
          ['Minimum Confidence', pct(conf.minConfidence)],
          ['Average Color Classifier Confidence', pct(conf.avgColorConfidence)],
          ['Average Oil Predictor Confidence', pct(conf.avgOilConfidence)],
          ['Average Fruit Detection Confidence', pct(conf.avgFruitConfidence)],
          ['High Confidence Count (>=80%)', conf.highConfidenceCount || 0],
          ['Low Confidence Count (<50%)', conf.lowConfidenceCount || 0],
        ]),
      },
      {
        title: '6. Physical Dimensions by Category',
        content: htmlTable(
          ['Category', 'Avg Length (cm)', 'Avg Width (cm)', 'Avg Weight (g)', 'Avg Kernel (g)', 'Samples'],
          ['GREEN', 'YELLOW', 'BROWN'].map(c => {
            const d = dimStats[c] || {};
            return [CAT_LABELS[c], fmt(d.avgLength), fmt(d.avgWidth), fmt(d.avgWeight), fmt(d.avgKernelWeight), d.count || 0];
          })
        ),
      },
      {
        title: '7. Detection Quality Indicators',
        content: htmlKV([
          ['Scans with Spot Detection', spots.withSpots || 0],
          ['Average Spot Coverage', spots.avgSpotCoverage != null ? `${(spots.avgSpotCoverage * 100).toFixed(1)}%` : 'N/A'],
          ['Reference Coin Detected', coinDet.withCoin || 0],
          ['Coin Detection Rate', coinDet.totalScans > 0 ? `${((coinDet.withCoin / coinDet.totalScans) * 100).toFixed(1)}%` : 'N/A'],
        ]),
      },
      {
        title: '8. Registered Users',
        content: htmlTable(
          ['#', 'Name', 'Email', 'Role', 'Verified', 'Date Joined'],
          users.map((u, i) => [
            i + 1,
            [u.firstName, u.lastName].filter(Boolean).join(' ') || 'N/A',
            u.email,
            u.role,
            u.isVerified ? 'Yes' : 'No',
            fmtDate(u.createdAt),
          ])
        ),
      },
    ];

    const html = buildNativeHTMLReport(
      'Talisay Fruit Oil Yield Analysis — Comprehensive System Report',
      `Report Date: ${today()} | Total Scans: ${totalScans} | Total Users: ${ov.totalUsers || users.length}`,
      sections
    );
    return { _nativeHtmlReport: true, content: html };
  }

  const { JsPDF } = await loadJsPDFLibs();
  const logoBase64 = await loadTUPLogo();
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', putOnlyUsedFonts: true, compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const ov = analytics?.overview || {};
  const catDist = analytics?.categoryDistribution || {};
  const yieldData = analytics?.avgYieldByCategory || {};
  const yieldOverall = analytics?.avgYieldOverall || {};
  const conf = analytics?.confidenceStats || {};
  const dimStats = analytics?.dimensionStats || {};
  const coinDet = analytics?.coinDetection || {};
  const spots = analytics?.spotStats || {};
  const totalScans = ov.totalHistory || historyItems.length;

  // ── Page 1: Title Page ──
  let y = drawHeader(doc, pageWidth, logoBase64);
  y += 8;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Talisay Fruit Oil Yield Analysis', pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Comprehensive System Report', pageWidth / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Report Date: ${today()}`, pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text(`Total Scans: ${totalScans}  |  Total Users: ${ov.totalUsers || users.length}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // ── Section 1: Executive Summary ──
  y = addSectionTitle(doc, '1. Executive Summary', y, pageWidth);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  const execSummary = `This report provides a comprehensive overview of the Talisay AI Oil Yield Analysis System. ` +
    `The system has processed ${totalScans} fruit scan(s) from ${ov.totalUsers || users.length} registered user(s). ` +
    `Scans are classified into three maturity stages: Green (Immature), Yellow (Mature), and Brown (Overripe). ` +
    `The overall average oil yield across all categories is ${fmt(yieldOverall.avgYield)}%. ` +
    `The system employs a multi-model ML pipeline including MobileNetV2 for color classification, YOLOv8n for object detection, ` +
    `and a Random Forest + Gradient Boosting ensemble for oil yield prediction.`;
  const splitExec = doc.splitTextToSize(execSummary, pageWidth - 30);
  doc.text(splitExec, 15, y);
  y += splitExec.length * 4 + 6;

  // ── Section 2: System Overview ──
  y = checkPage(doc, y, 55, pageHeight, pageWidth, logoBase64);
  y = addSectionTitle(doc, '2. System Overview', y, pageWidth);
  y = addKVTable(doc, [
    ['Total Registered Users', String(ov.totalUsers || users.length)],
    ['Total Fruit Scans', String(totalScans)],
    ['Scans Today', String(ov.scansToday || 0)],
    ['Scans This Week', String(ov.scansThisWeek || 0)],
    ['New Users This Month', String(ov.newUsersThisMonth || 0)],
    ['High Yield Scans (Yellow + Brown)', String(ov.highYieldCount || 0)],
    ['Low Yield Scans (Green)', String(ov.lowYieldCount || 0)],
  ], y);

  // ── Section 3: Category Distribution ──
  y = checkPage(doc, y, 40, pageHeight, pageWidth, logoBase64);
  y = addSectionTitle(doc, '3. Maturity Category Distribution', y, pageWidth);
  const catTotal = (catDist.GREEN || 0) + (catDist.YELLOW || 0) + (catDist.BROWN || 0);
  y = addDataTable(doc,
    ['Category', 'Count', 'Percentage', 'Oil Yield Range (Research)'],
    ['GREEN', 'YELLOW', 'BROWN'].map(c => {
      const sci = OIL_YIELD_DATA[c];
      return [
        CAT_LABELS[c],
        catDist[c] || 0,
        catTotal > 0 ? `${(((catDist[c] || 0) / catTotal) * 100).toFixed(1)}%` : '0%',
        `${sci.oilYieldRange[0]}-${sci.oilYieldRange[1]}%`,
      ];
    }),
    y
  );

  // ── Section 4: Oil Yield Analysis ──
  y = checkPage(doc, y, 55, pageHeight, pageWidth, logoBase64);
  y = addSectionTitle(doc, '4. Oil Yield Analysis by Category', y, pageWidth);
  y = addDataTable(doc,
    ['Category', 'Avg Yield', 'Min Yield', 'Max Yield', 'Samples', 'Research Mean'],
    ['GREEN', 'YELLOW', 'BROWN'].map(c => {
      const yd = yieldData[c] || {};
      const sci = OIL_YIELD_DATA[c];
      return [
        CAT_LABELS[c],
        `${fmt(yd.avg)}%`, `${fmt(yd.min)}%`, `${fmt(yd.max)}%`,
        yd.count || 0, `${sci.oilYieldMean}%`,
      ];
    }),
    y
  );

  y = addKVTable(doc, [
    ['Overall Average Oil Yield', `${fmt(yieldOverall.avgYield)}%`],
    ['Overall Minimum Oil Yield', `${fmt(yieldOverall.minYield)}%`],
    ['Overall Maximum Oil Yield', `${fmt(yieldOverall.maxYield)}%`],
  ], y);

  // ── Section 5: Confidence Metrics ──
  y = checkPage(doc, y, 55, pageHeight, pageWidth, logoBase64);
  y = addSectionTitle(doc, '5. Model Confidence Metrics', y, pageWidth);
  y = addKVTable(doc, [
    ['Average Overall Confidence', pct(conf.avgConfidence)],
    ['Maximum Confidence', pct(conf.maxConfidence)],
    ['Minimum Confidence', pct(conf.minConfidence)],
    ['Average Color Classifier Confidence', pct(conf.avgColorConfidence)],
    ['Average Oil Predictor Confidence', pct(conf.avgOilConfidence)],
    ['Average Fruit Detection Confidence', pct(conf.avgFruitConfidence)],
    ['High Confidence Count (>=80%)', String(conf.highConfidenceCount || 0)],
    ['Low Confidence Count (<50%)', String(conf.lowConfidenceCount || 0)],
  ], y);

  // ── Section 6: Physical Dimensions ──
  y = checkPage(doc, y, 50, pageHeight, pageWidth, logoBase64);
  y = addSectionTitle(doc, '6. Physical Dimension Statistics by Category', y, pageWidth);
  y = addDataTable(doc,
    ['Category', 'Avg Length (cm)', 'Avg Width (cm)', 'Avg Weight (g)', 'Avg Kernel (g)', 'Samples'],
    ['GREEN', 'YELLOW', 'BROWN'].map(c => {
      const d = dimStats[c] || {};
      return [CAT_LABELS[c], fmt(d.avgLength), fmt(d.avgWidth), fmt(d.avgWeight), fmt(d.avgKernelWeight), d.count || 0];
    }),
    y
  );

  // ── Section 7: Detection Quality ──
  y = checkPage(doc, y, 50, pageHeight, pageWidth, logoBase64);
  y = addSectionTitle(doc, '7. Detection Quality Indicators', y, pageWidth);
  y = addKVTable(doc, [
    ['Total Scans', String(spots.totalScans || totalScans)],
    ['Scans with Spot Detection', String(spots.withSpots || 0)],
    ['Average Spot Coverage', spots.avgSpotCoverage != null ? `${(spots.avgSpotCoverage * 100).toFixed(1)}%` : 'N/A'],
    ['Reference Coin Detected', String(coinDet.withCoin || 0)],
    ['No Coin Detected', String((coinDet.totalScans || 0) - (coinDet.withCoin || 0))],
    ['Coin Detection Rate', coinDet.totalScans > 0 ? `${((coinDet.withCoin / coinDet.totalScans) * 100).toFixed(1)}%` : 'N/A'],
  ], y);

  // ── Section 8: Nutritional Composition ──
  y = checkPage(doc, y, 60, pageHeight, pageWidth, logoBase64);
  y = addSectionTitle(doc, '8. Kernel Nutritional Composition (per 100g)', y, pageWidth);
  y = addDataTable(doc,
    ['Nutrient', 'Value', 'Unit'],
    Object.values(NUTRITIONAL_DATA).map(n => [n.label, n.value, n.unit]),
    y
  );

  // ── Section 9: Fatty Acid Profile ──
  y = checkPage(doc, y, 60, pageHeight, pageWidth, logoBase64);
  y = addSectionTitle(doc, '9. Fatty Acid Profile of Kernel Oil', y, pageWidth);
  y = addDataTable(doc,
    ['Fatty Acid', 'Percentage (%)', 'Type'],
    FATTY_ACID_PROFILE.map(fa => [fa.name, fa.percentage.toFixed(2), fa.type]),
    y
  );

  // ── Section 10: Seed-to-Oil Extraction ──
  y = checkPage(doc, y, 55, pageHeight, pageWidth, logoBase64);
  y = addSectionTitle(doc, '10. Seed-to-Oil Extraction Data', y, pageWidth);
  y = addKVTable(doc, [
    ['Kernel Oil Content', `${SEED_TO_OIL.overallKernelOilContent}%`],
    ['Kernel-to-Fruit Ratio', `${(SEED_TO_OIL.kernelToFruitRatio * 100).toFixed(0)}%`],
    ['Oil Recovery Efficiency', `${(SEED_TO_OIL.oilRecoveryEfficiency * 100).toFixed(0)}%`],
    ['Fruit Yield per Tree/Year', `${SEED_TO_OIL.typicalYieldPerTree.kgFruitPerYear} kg`],
    ['Oil Yield per Tree/Year', `~${SEED_TO_OIL.typicalYieldPerTree.litersOilPerYear} L`],
  ], y);

  y = checkPage(doc, y, 40, pageHeight, pageWidth, logoBase64);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text('Extraction Methods:', 15, y);
  y += 4;
  y = addDataTable(doc,
    ['Method', 'Yield', 'Quality'],
    SEED_TO_OIL.extractionMethods.map(m => [m.method, m.yield, m.quality]),
    y
  );

  // ── Section 11: Registered Users ──
  y = checkPage(doc, y, 30, pageHeight, pageWidth, logoBase64);
  y = addSectionTitle(doc, '11. Registered Users', y, pageWidth);
  y = addDataTable(doc,
    ['#', 'Name', 'Email', 'Role', 'Verified', 'Date Joined'],
    users.map((u, i) => [
      i + 1,
      sanitizeText([u.firstName, u.lastName].filter(Boolean).join(' ') || 'N/A'),
      sanitizeText(u.email),
      sanitizeText(u.role),
      u.isVerified ? 'Yes' : 'No',
      fmtDate(u.createdAt),
    ]),
    y
  );

  // ── Section 12: References ──
  y = checkPage(doc, y, 40, pageHeight, pageWidth, logoBase64);
  y = addSectionTitle(doc, '12. Research References', y, pageWidth);
  y = addDataTable(doc,
    ['Author', 'Year', 'Title', 'Journal', 'Origin'],
    RESEARCH_REFERENCES.map(r => [r.author, r.year, r.title, r.journal, r.origin]),
    y,
    { bodyStyles: { fontSize: 6.5, textColor: [40, 40, 40], halign: 'left' } }
  );

  // ── Footer on all pages ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages, pageWidth, pageHeight);
  }

  return doc;
}


/* ═══════════════════════════════════════════════════
   DOWNLOAD TRIGGERS
   ═══════════════════════════════════════════════════ */

/**
 * Trigger file download (web) or share (mobile).
 */
export async function downloadFile(content, filename, mimeType) {
  if (Platform.OS === 'web') {
    // Add UTF-8 BOM for Excel compatibility with CSV files
    const bom = mimeType.includes('csv') ? '\uFEFF' : '';
    const blob = new Blob([bom + content], { type: mimeType + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    // Mobile: write to temp file then share via system share sheet
    try {
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: mimeType || 'text/csv',
          dialogTitle: `Export ${filename}`,
        });
      } else {
        Alert.alert('Exported', `File saved to: ${fileUri}`);
      }
    } catch (err) {
      Alert.alert('Export Error', `Failed to save file: ${err.message}`);
    }
  }
}

/**
 * Download a jsPDF document (web) or generate a real PDF from HTML (native).
 * On native, uses expo-print to convert the styled HTML into an actual PDF file,
 * then shares it via expo-sharing.
 */
export async function downloadPDF(doc, filename) {
  // Native: doc is a {_nativeHtmlReport, content} object — convert HTML → real PDF
  if (doc && doc._nativeHtmlReport) {
    try {
      // expo-print converts HTML to a real PDF file on the device
      const { uri: pdfUri } = await Print.printToFileAsync({
        html: doc.content,
        base64: false,
      });

      // Rename from the temp path to a user-friendly filename
      const pdfFilename = filename.endsWith('.pdf') ? filename : filename.replace(/\.[^.]+$/, '.pdf');
      const destUri = FileSystem.documentDirectory + pdfFilename;

      // Move the generated PDF to documentDirectory with the correct filename
      await FileSystem.moveAsync({ from: pdfUri, to: destUri });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(destUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Export ${pdfFilename}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Exported', `PDF saved to: ${destUri}`);
      }
    } catch (err) {
      Alert.alert('Export Error', `Failed to generate PDF: ${err.message}`);
    }
    return;
  }

  if (Platform.OS === 'web') {
    doc.save(filename);
  } else {
    // Fallback: try base64 PDF (should not reach here for native normally)
    try {
      const base64 = doc.output('datauristring').split(',')[1];
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Export ${filename}`,
        });
      } else {
        Alert.alert('Exported', `PDF saved to: ${fileUri}`);
      }
    } catch (err) {
      Alert.alert('Export Error', `Failed to save PDF: ${err.message}`);
    }
  }
}
