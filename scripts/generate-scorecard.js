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

// Caption
const captionY = gridY + rowLabels.length * cellH + 16;
doc.font('Helvetica').fontSize(11).fillColor(BLACK);
doc.text('Caption: _______________________________________________', LEFT, captionY);

// Instructions box
const instrY = captionY + 30;
const instrW = W;
const instrPad = 10;
doc.save();
doc.roundedRect(LEFT, instrY, instrW, 120, 6).fillAndStroke('#FAFAFA', '#CCCCCC');
doc.restore();

doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK);
doc.text('📋 HOW TO FILL OUT THIS SCORECARD', LEFT + instrPad, instrY + instrPad, { width: instrW - instrPad * 2 });

doc.font('Helvetica').fontSize(8.5).fillColor('#333');
const instrLines = [
  '• Course / Date / Tees — Write clearly. Date as MM/DD/YYYY or any clear format.',
  '• Round Type — Check ONE box: Practice, Tournament, or Casual.',
  '• Par — Write the par for each hole (3, 4, or 5).',
  '• Score — Write your total strokes for each hole. Fill in OUT (holes 1-9 total), IN (holes 10-18 total), and TOT (grand total).',
  '• Putts — Number of putts per hole.',
  '• FW (Fairway Hit) — Write ✓ or Y for yes, ✗ or N for no. Leave blank for par 3s or if not tracking.',
  '• GIR (Green in Regulation) — Write ✓ or Y if you hit the green in regulation, ✗ or N if not.',
  '• W&I (Wedge & In) — Number of shots hit with a wedge or shorter club (inside ~130 yds). Leave blank if not tracking.',
  '• Caption — Optional note about your round (shows on your feed if shared).',
  '',
  '📷 To scan: Open the Sandbagger app → Log tab → tap "Scan Scores" → take a photo of this sheet. Review before saving!',
];
instrLines.forEach((line, i) => {
  doc.text(line, LEFT + instrPad, instrY + instrPad + 14 + i * 10, { width: instrW - instrPad * 2 });
});

doc.end();
console.log('Scorecard PDF generated:', outPath);
