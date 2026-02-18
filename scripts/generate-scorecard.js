const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({ layout: 'landscape', size: 'letter', margins: { top: 30, bottom: 30, left: 30, right: 30 } });
const outPath = path.join(__dirname, '..', 'public', 'scorecard.pdf');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
doc.pipe(fs.createWriteStream(outPath));

const W = 792 - 60; // usable width
const LEFT = 30;
const HEADER_BG = '#E5E5E5';
const WHITE = '#FFFFFF';
const BLACK = '#000000';
const DARK = '#1a1a2e';
const GOLD = '#C8A951';

// Title
doc.fontSize(28).font('Helvetica-Bold').fillColor(DARK).text('SANDBAGGER', LEFT, 30, { align: 'center', width: W });
doc.fontSize(9).fillColor('#666').text('Printable Scorecard', LEFT, 60, { align: 'center', width: W });

// Header fields
const fy = 78;
doc.fontSize(11).fillColor(BLACK).font('Helvetica');
doc.text('Course: ________________________________', LEFT, fy);
doc.text('Date: ______________', LEFT + 320, fy);
doc.text('Tees: ______________', LEFT + 480, fy);

const fy2 = fy + 20;
doc.text('Round Type:', LEFT, fy2);
// Checkboxes
const cbx = LEFT + 80;
['Practice', 'Tournament', 'Casual'].forEach((label, i) => {
  const x = cbx + i * 110;
  doc.rect(x, fy2 - 1, 12, 12).lineWidth(1.5).stroke(DARK);
  doc.text(label, x + 16, fy2);
});

// Grid
const gridY = fy2 + 30;
const rowLabels = ['Hole', 'Par', 'Score', 'Putts', 'FW', 'GIR', 'W&I'];
const numDataCols = 9 + 1 + 9 + 1 + 1; // 9 holes + OUT + 9 holes + IN + TOTAL = 21
const labelColW = 42;
const remainW = W - labelColW;
const cellW = Math.floor(remainW / numDataCols);
const cellH = 26;

function drawCell(x, y, w, h, text, opts = {}) {
  const { bg, bold, fontSize: fs, align } = { bg: WHITE, bold: false, fontSize: 10, align: 'center', ...opts };
  doc.save();
  doc.rect(x, y, w, h).fillAndStroke(bg, DARK);
  doc.fillColor(BLACK).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fs);
  doc.text(text, x, y + (h - fs) / 2, { width: w, align: align || 'center' });
  doc.restore();
}

// Column headers for front 9
const colHeaders = [];
for (let i = 1; i <= 9; i++) colHeaders.push(String(i));
colHeaders.push('OUT');
for (let i = 10; i <= 18; i++) colHeaders.push(String(i));
colHeaders.push('IN');
colHeaders.push('TOT');

doc.lineWidth(1);

// Draw header row
drawCell(LEFT, gridY, labelColW, cellH, 'Hole', { bg: HEADER_BG, bold: true });
colHeaders.forEach((h, ci) => {
  const isTotal = h === 'OUT' || h === 'IN' || h === 'TOT';
  drawCell(LEFT + labelColW + ci * cellW, gridY, cellW, cellH, h, { bg: HEADER_BG, bold: true, fontSize: isTotal ? 9 : 10 });
});

// Data rows
rowLabels.slice(1).forEach((label, ri) => {
  const y = gridY + (ri + 1) * cellH;
  drawCell(LEFT, y, labelColW, cellH, label, { bg: HEADER_BG, bold: true, fontSize: 9 });
  colHeaders.forEach((h, ci) => {
    const isTotal = h === 'OUT' || h === 'IN' || h === 'TOT';
    drawCell(LEFT + labelColW + ci * cellW, y, cellW, cellH, '', { bg: isTotal ? '#F0F0F0' : WHITE });
  });
});

// Footer
const footerY = gridY + rowLabels.length * cellH + 20;
doc.font('Helvetica').fontSize(11).fillColor(BLACK);
doc.text('Caption: _______________________________________________', LEFT, footerY);

doc.fontSize(10).fillColor('#888');
doc.text('Scan this scorecard in the Sandbagger app to log your round', LEFT, footerY + 22, { align: 'center', width: W });

doc.end();
console.log('Scorecard PDF generated:', outPath);
