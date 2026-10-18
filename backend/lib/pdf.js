// Generates the discount token PDF (the original site filled a template with the same fields).
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const LOGO = path.join(__dirname, '..', 'assets', 'logo.png');
const BLUE = rgb(0, 0.451, 0.824);      // --primary #0073d2
const INK = rgb(0.055, 0.09, 0.118);    // --foreground
const MUTED = rgb(0.35, 0.396, 0.431);
const GREEN = rgb(0, 0.5, 0);
const AMBER_BG = rgb(1, 0.973, 0.882);
const AMBER = rgb(0.71, 0.33, 0.04);

// Helvetica (WinAnsi) can't encode every character; replace anything unsupported.
const safe = (s) => String(s ?? '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');

async function buildTokenPdf({ tokenId, issuedDate, studentName, phone, collegeName, pgName, sharingType, price }) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`VJ-PGs Discount Token ${tokenId}`);
  pdf.setAuthor('VJ-PGs');
  const page = pdf.addPage([595.28, 841.89]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const { width } = page.getSize();

  // Header with logo
  page.drawRectangle({ x: 0, y: 760, width, height: 82, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 0, y: 756, width, height: 4, color: BLUE });
  if (fs.existsSync(LOGO)) {
    const logo = await pdf.embedPng(fs.readFileSync(LOGO));
    const h = 56, w = (logo.width / logo.height) * h;
    page.drawImage(logo, { x: 50, y: 772, width: w, height: h });
  }
  page.drawText('VJ-PGs', { x: 400, y: 806, size: 20, font: bold, color: BLUE });
  page.drawText('Student Housing & Brokerage', { x: 400, y: 790, size: 9, font: reg, color: MUTED });

  // Title
  page.drawText('DISCOUNT TOKEN', { x: 50, y: 715, size: 24, font: bold, color: INK });
  page.drawText('Flat Rs. 2,000 OFF on your first month', { x: 50, y: 695, size: 11, font: reg, color: GREEN });

  // Table
  const rows = [
    ['TOKEN ID:', tokenId],
    ['ISSUED DATE:', issuedDate],
    ['STUDENT NAME:', studentName],
    ['PHONE NUMBER:', phone],
    ['COLLEGE NAME:', collegeName],
    ['PG PROPERTY NAME:', pgName],
    ['SHARING TYPE:', sharingType],
    ['FINAL PRICE (1st MONTH):', `Rs. ${Number(price).toLocaleString('en-IN')}/-`],
  ];
  const x0 = 50, x1 = 545, split = 230, rowH = 30;
  let y = 660;
  page.drawLine({ start: { x: x0, y }, end: { x: x1, y }, thickness: 0.8, color: INK });
  rows.forEach(([k, v], i) => {
    const last = i === rows.length - 1;
    if (i % 2 === 0) page.drawRectangle({ x: x0, y: y - rowH, width: x1 - x0, height: rowH, color: rgb(0.96, 0.97, 0.98) });
    page.drawText(safe(k), { x: x0 + 10, y: y - 19, size: 9.5, font: bold, color: INK });
    page.drawText(safe(v).slice(0, 48), { x: split + 10, y: y - 19, size: last ? 12 : 10, font: bold, color: last ? GREEN : INK });
    y -= rowH;
    page.drawLine({ start: { x: x0, y }, end: { x: x1, y }, thickness: 0.8, color: INK });
  });
  const top = 660;
  [x0, split, x1].forEach((x) => page.drawLine({ start: { x, y: top }, end: { x, y }, thickness: 0.8, color: INK }));

  // Action required note
  const ny = y - 30;
  page.drawRectangle({ x: x0, y: ny - 62, width: x1 - x0, height: 62, color: AMBER_BG });
  page.drawRectangle({ x: x0, y: ny - 62, width: 4, height: 62, color: rgb(0.98, 0.75, 0.14) });
  page.drawText('ACTION REQUIRED', { x: x0 + 16, y: ny - 20, size: 10, font: bold, color: AMBER });
  page.drawText('To claim your discount, you MUST take a physical printout of this token', { x: x0 + 16, y: ny - 36, size: 9.5, font: reg, color: AMBER });
  page.drawText('and submit it to the PG Owner during your visit.', { x: x0 + 16, y: ny - 49, size: 9.5, font: reg, color: AMBER });

  // Terms + footer
  const t = ny - 100;
  page.drawText('Terms', { x: x0, y: t, size: 10, font: bold, color: INK });
  [
    '1. This token is valid only for bookings made through VJ-PGs; it is not valid for walk-ins.',
    '2. The discount applies to the first month\'s rent only and is non-transferable.',
    '3. VJ-PGs may verify your phone number via WhatsApp. Invalid details void the discount.',
  ].forEach((line, i) => page.drawText(line, { x: x0, y: t - 16 - i * 14, size: 8.5, font: reg, color: MUTED }));

  page.drawLine({ start: { x: x0, y: 70 }, end: { x: x1, y: 70 }, thickness: 0.5, color: MUTED });
  page.drawText('VJ-PGs | WhatsApp: 97410 10710 | vjpgs.official@gmail.com', { x: x0, y: 52, size: 8.5, font: reg, color: MUTED });

  return Buffer.from(await pdf.save());
}

module.exports = { buildTokenPdf };
