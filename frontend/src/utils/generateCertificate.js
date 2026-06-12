/**
 * 20 Certificate Templates — 4 visual style groups
 * Each template is a config; 4 style renderers handle the drawing.
 */

// ─── HELPER SHAPES ─────────────────────────────────────────────────────────

function diamond(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - s); ctx.lineTo(x + s, y);
  ctx.lineTo(x, y + s); ctx.lineTo(x - s, y);
  ctx.closePath(); ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── CORNER STYLES ─────────────────────────────────────────────────────────

function cornerDiamond(ctx, W, H, color) {
  const o = 44, ll = 38;
  [[o, o, 1, 1], [W - o, o, -1, 1], [o, H - o, 1, -1], [W - o, H - o, -1, -1]]
    .forEach(([x, y, dx, dy]) => {
      diamond(ctx, x, y, 8, color);
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + dx * 12, y); ctx.lineTo(x + dx * (12 + ll), y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + dy * 12); ctx.lineTo(x, y + dy * (12 + ll)); ctx.stroke();
      diamond(ctx, x + dx * (12 + ll), y, 3, color);
      diamond(ctx, x, y + dy * (12 + ll), 3, color);
    });
}

function cornerCircle(ctx, W, H, color) {
  const o = 44;
  [[o, o], [W - o, o], [o, H - o], [W - o, H - o]].forEach(([x, y]) => {
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = color + '30';
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  });
  // Connecting lines
  [[o + 14, o, W - o - 14, o], [o, o + 14, o, H - o - 14],
   [W - o - 14, H - o, o + 14, H - o], [W - o, H - o - 14, W - o, o + 14]]
    .forEach(([x1, y1, x2, y2]) => {
      ctx.strokeStyle = color + '80'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });
}

function cornerBracket(ctx, W, H, color) {
  const o = 44, l = 45;
  ctx.strokeStyle = color; ctx.lineWidth = 3;
  [[o, o, 1, 1], [W - o, o, -1, 1], [o, H - o, 1, -1], [W - o, H - o, -1, -1]]
    .forEach(([x, y, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(x + dx * l, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * l);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    });
}

function cornerStar(ctx, W, H, color) {
  const o = 44;
  [[o, o], [W - o, o], [o, H - o], [W - o, H - o]].forEach(([cx, cy]) => {
    ctx.fillStyle = color;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? 11 : 5;
      const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
      i === 0 ? (ctx.beginPath(), ctx.moveTo(px, py)) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  });
}

function cornerFloral(ctx, W, H, color) {
  const o = 44;
  [[o, o], [W - o, o], [o, H - o], [W - o, H - o]].forEach(([cx, cy]) => {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = cx + 10 * Math.cos(a), py = cy + 10 * Math.sin(a);
      ctx.fillStyle = color + 'aa';
      ctx.beginPath(); ctx.ellipse(px, py, 5, 3, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
  });
}

const CORNER_FNS = { diamond: cornerDiamond, circle: cornerCircle, bracket: cornerBracket, star: cornerStar, floral: cornerFloral };

// ─── BACKGROUND PATTERNS ───────────────────────────────────────────────────

function patternDiagonal(ctx, W, H, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 1;
  for (let i = -H; i < W + H; i += 45) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
  }
}

function patternDots(ctx, W, H, color) {
  ctx.fillStyle = color;
  for (let x = 0; x < W; x += 28)
    for (let y = 0; y < H; y += 28) {
      ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
    }
}

function patternGrid(ctx, W, H, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

function patternHorizontal(ctx, W, H, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 18) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

function patternWaves(ctx, W, H, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  for (let y = 30; y < H; y += 40) {
    ctx.beginPath();
    for (let x = 0; x <= W; x += 4)
      x === 0 ? ctx.moveTo(x, y + 8 * Math.sin(x / 40)) : ctx.lineTo(x, y + 8 * Math.sin(x / 40));
    ctx.stroke();
  }
}

function patternCrosshatch(ctx, W, H, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 1;
  for (let i = -H; i < W + H; i += 40) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i + H, 0); ctx.lineTo(i, H); ctx.stroke();
  }
}

const PAT_FNS = {
  diagonal: patternDiagonal, dots: patternDots, grid: patternGrid,
  horizontal: patternHorizontal, waves: patternWaves, crosshatch: patternCrosshatch
};

// ─── EMBLEM ────────────────────────────────────────────────────────────────

function drawEmblem(ctx, x, y, colors, isDark) {
  const [ring, center, dots] = colors;
  ctx.strokeStyle = ring; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, 48, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = center + '80'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, 38, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = dots;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath(); ctx.arc(x + 44 * Math.cos(a), y + 44 * Math.sin(a), 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = ring;
  ctx.font = 'bold 34px Tajawal, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('خ', x, y + 2); ctx.textBaseline = 'alphabetic';
}

// ─── SEAL ──────────────────────────────────────────────────────────────────

function drawSeal(ctx, x, y, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 38 : 22;
    const px = x + r * Math.cos(a), py = y + r * Math.sin(a);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.stroke();
  ctx.fillStyle = color + '18'; ctx.fill();
  ctx.strokeStyle = color + '60'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = color + '80';
  ctx.font = '9px Tajawal, Arial'; ctx.textAlign = 'center';
  ctx.fillText('مدرسة الخيرات', x, y - 5);
  ctx.fillText('2025-2026', x, y + 7);
}

// ─── DIVIDER ───────────────────────────────────────────────────────────────

function drawDivider(ctx, W, y, color, accent, dashed = false) {
  ctx.strokeStyle = color; ctx.lineWidth = 1;
  if (dashed) ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(W - 60, y); ctx.stroke();
  ctx.setLineDash([]);
  diamond(ctx, W / 2, y, 6, accent);
  diamond(ctx, W / 2 - 26, y, 3, color);
  diamond(ctx, W / 2 + 26, y, 3, color);
}

// ─── CONTENT RENDERER (SAME FOR ALL TEMPLATES) ────────────────────────────

function drawContent(ctx, W, H, t, student, quiz) {
  ctx.direction = 'rtl';

  // Emblem
  drawEmblem(ctx, 118, 105, t.emblem, t.isDark);

  // School header
  ctx.textAlign = 'right';
  ctx.fillStyle = t.school1;
  ctx.font = 'bold 17px Tajawal, Arial';
  ctx.fillText('سلطنة عمان', W - 58, 78);
  ctx.fillStyle = t.school2;
  ctx.font = '14px Tajawal, Arial';
  ctx.fillText('وزارة التعليم', W - 58, 100);
  ctx.fillText('المديرية العامة بشمال الشرقية', W - 58, 120);
  ctx.fillText('مدرسة الخيرات للتعليم الأساسي', W - 58, 140);
  ctx.fillStyle = t.school3;
  ctx.font = '12px Tajawal, Arial';
  ctx.fillText('العام الدراسي ٢٠٢٥ / ٢٠٢٦', W - 58, 162);

  // Header divider
  drawDivider(ctx, W, 178, t.divider, t.accent);

  // Title shadow + text
  ctx.textAlign = 'center';
  if (t.titleShadow) { ctx.fillStyle = t.titleShadow; ctx.font = 'bold 60px Tajawal, Arial'; ctx.fillText('شهادة إتمام', W / 2 + 2, 252); }
  ctx.fillStyle = t.titleColor;
  ctx.font = 'bold 60px Tajawal, Arial';
  ctx.fillText('شهادة إتمام', W / 2, 250);

  // Title decoration
  ctx.strokeStyle = t.divider; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(W / 2 + 38, 272); ctx.lineTo(W / 2 + 200, 272); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W / 2 - 38, 272); ctx.lineTo(W / 2 - 200, 272); ctx.stroke();
  diamond(ctx, W / 2, 272, 6, t.accent);
  diamond(ctx, W / 2 + 24, 272, 3.5, t.divider);
  diamond(ctx, W / 2 - 24, 272, 3.5, t.divider);

  // Body
  ctx.fillStyle = t.bodyText;
  ctx.font = '19px Tajawal, Arial';
  ctx.fillText('يُشهد بأن الطالب / الطالبة', W / 2, 322);

  // Student name
  ctx.fillStyle = t.nameColor;
  ctx.font = 'bold 40px Tajawal, Arial';
  ctx.fillText(student.student_name, W / 2, 376);

  // Name underline gradient
  const nw = ctx.measureText(student.student_name).width;
  const ulGrad = ctx.createLinearGradient(W / 2 - nw / 2, 0, W / 2 + nw / 2, 0);
  ulGrad.addColorStop(0, t.accent + '00');
  ulGrad.addColorStop(0.2, t.accent);
  ulGrad.addColorStop(0.8, t.accent);
  ulGrad.addColorStop(1, t.accent + '00');
  ctx.strokeStyle = ulGrad; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(W / 2 - nw / 2, 386); ctx.lineTo(W / 2 + nw / 2, 386); ctx.stroke();

  ctx.fillStyle = t.subText;
  ctx.font = '16px Tajawal, Arial';
  ctx.fillText(`الصف: ${student.grade}  ·  الشعبة: ${student.section}`, W / 2, 416);

  ctx.fillStyle = t.bodyText;
  ctx.font = '19px Tajawal, Arial';
  ctx.fillText('قد أتمّ بنجاح اختبار مادة تقنية المعلومات:', W / 2, 452);

  ctx.fillStyle = t.quizColor;
  ctx.font = 'bold 23px Tajawal, Arial';
  ctx.fillText(`" ${quiz.title} "`, W / 2, 490);

  const pct = Math.round(student.percentage || 0);
  ctx.fillStyle = t.scoreColor || (pct >= 80 ? '#15803d' : pct >= 60 ? '#b45309' : '#dc2626');
  ctx.font = 'bold 17px Tajawal, Arial';
  ctx.fillText(`بدرجة: ${student.total_score} من ${student.max_score} درجة  (${pct}%)`, W / 2, 524);

  const dateStr = new Date().toLocaleDateString('ar-OM', { year: 'numeric', month: 'long', day: 'numeric' });
  ctx.fillStyle = t.subText;
  ctx.font = '14px Tajawal, Arial';
  ctx.fillText(`بتاريخ: ${dateStr}`, W / 2, 553);

  // Bottom divider
  drawDivider(ctx, W, 577, t.divider, t.accent, true);

  // Signatures
  ctx.textAlign = 'right';
  ctx.fillStyle = t.bodyText; ctx.font = 'bold 14px Tajawal, Arial';
  ctx.fillText('معلم تقنية المعلومات', W - 100, 615);
  ctx.fillStyle = t.nameColor; ctx.font = 'bold 16px Tajawal, Arial';
  ctx.fillText('عبدالله الحبسي', W - 100, 640);
  ctx.strokeStyle = t.accent; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W - 240, 662); ctx.lineTo(W - 80, 662); ctx.stroke();
  ctx.fillStyle = t.subText; ctx.font = '11px Tajawal, Arial';
  ctx.fillText('التوقيع', W - 100, 675);

  ctx.textAlign = 'left';
  ctx.fillStyle = t.bodyText; ctx.font = 'bold 14px Tajawal, Arial';
  ctx.fillText('مدير المدرسة', 100, 615);
  ctx.fillStyle = t.nameColor; ctx.font = 'bold 16px Tajawal, Arial';
  ctx.fillText('قاسم العزري', 100, 640);
  ctx.beginPath(); ctx.moveTo(80, 662); ctx.lineTo(220, 662); ctx.stroke();
  ctx.fillStyle = t.subText; ctx.font = '11px Tajawal, Arial';
  ctx.fillText('التوقيع', 100, 675);

  // Center seal
  drawSeal(ctx, W / 2, 635, t.sealColor);

  // Bottom bar
  ctx.strokeStyle = t.outerBorder; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, 710); ctx.lineTo(W - 80, 710); ctx.stroke();
  diamond(ctx, W / 2, 710, 5, t.accent);
  diamond(ctx, W / 2 - 32, 710, 3, t.divider);
  diamond(ctx, W / 2 + 32, 710, 3, t.divider);

  ctx.fillStyle = t.subText + 'cc';
  ctx.font = '11px Tajawal, Arial'; ctx.textAlign = 'center';
  ctx.fillText('منصة اختبارات مدرسة الخيرات  —  نظام إدارة التعلم الإلكتروني', W / 2, 727);
}

// ─── MAIN GENERATOR ────────────────────────────────────────────────────────

export async function generateCertificate(student, quiz, templateId = 'classic_blue') {
  const t = TEMPLATES[templateId] || TEMPLATES.classic_blue;
  const W = 1123, H = 794;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── Background
  let bg;
  if (Array.isArray(t.bg)) {
    bg = ctx.createLinearGradient(0, 0, W, H);
    t.bg.forEach((c, i) => bg.addColorStop(i / (t.bg.length - 1), c));
  } else {
    bg = t.bg;
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  if (t.bgPattern && PAT_FNS[t.bgPattern]) PAT_FNS[t.bgPattern](ctx, W, H, t.bgPatternColor || 'rgba(0,0,0,0.05)');

  // ── Borders
  ctx.strokeStyle = t.outerBorder; ctx.lineWidth = t.outerWidth || 11;
  ctx.strokeRect(15, 15, W - 30, H - 30);
  if (t.outerBorder2) {
    ctx.strokeStyle = t.outerBorder2; ctx.lineWidth = 2.5;
    ctx.strokeRect(28, 28, W - 56, H - 56);
  }
  if (t.innerBorder) {
    ctx.strokeStyle = t.innerBorder; ctx.lineWidth = t.innerWidth || 2.5;
    ctx.strokeRect(28, 28, W - 56, H - 56);
  }
  if (t.dashBorder) {
    ctx.strokeStyle = t.dashBorder; ctx.lineWidth = 1;
    ctx.setLineDash([7, 4]);
    ctx.strokeRect(38, 38, W - 76, H - 76);
    ctx.setLineDash([]);
  }
  if (t.outerBorder2 && t.innerBorder) {
    // already drawn above
  }

  // ── Header wash
  if (t.headerBg) {
    const hg = ctx.createLinearGradient(0, 44, 0, 175);
    hg.addColorStop(0, t.headerBg); hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg; ctx.fillRect(44, 44, W - 88, 135);
  }

  // ── Corners
  if (CORNER_FNS[t.cornerStyle]) CORNER_FNS[t.cornerStyle](ctx, W, H, t.cornerColor);

  // ── All text content
  drawContent(ctx, W, H, t, student, quiz);

  return canvas;
}

export function certFileName(student) {
  return `شهادة_${student.student_name}_${student.grade}-${student.section}.png`;
}

export async function downloadCertificate(student, quiz, templateId) {
  const canvas = await generateCertificate(student, quiz, templateId);
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = certFileName(student); a.click();
      URL.revokeObjectURL(url); resolve();
    }, 'image/png');
  });
}

// ─── 20 TEMPLATES ──────────────────────────────────────────────────────────

export const TEMPLATES = {

  // ════════════════ GROUP 1: FORMAL (رسمي) ════════════════

  classic_blue: {
    name: 'الكلاسيكي الأزرق', group: 'رسمي',
    preview: ['#fafbff', '#1e3a8a'],
    bg: ['#fafbff', '#fffef8', '#f0f4ff'], bgPattern: 'diagonal', bgPatternColor: 'rgba(59,130,246,0.035)',
    outerBorder: '#1e3a8a', innerBorder: '#2563eb', dashBorder: 'rgba(37,99,235,0.4)',
    headerBg: 'rgba(219,234,254,0.5)', cornerStyle: 'diamond', cornerColor: '#1e3a8a',
    divider: '#2563eb', accent: '#d97706',
    titleColor: '#1e3a8a', titleShadow: 'rgba(30,58,138,0.1)',
    nameColor: '#1e3a8a', bodyText: '#475569', subText: '#64748b',
    quizColor: '#1e40af', sealColor: 'rgba(30,58,138,0.3)',
    school1: '#1e3a8a', school2: '#1e40af', school3: '#3b82f6',
    emblem: ['#1e3a8a', '#2563eb', '#1e3a8a'],
  },

  royal_gold: {
    name: 'الذهبي الملكي', group: 'رسمي',
    preview: ['#fffbf0', '#b45309'],
    bg: ['#fffdf5', '#fef9e7', '#fffbf0'], bgPattern: 'diagonal', bgPatternColor: 'rgba(180,83,9,0.04)',
    outerBorder: '#92400e', innerBorder: '#d97706', dashBorder: 'rgba(217,119,6,0.4)',
    headerBg: 'rgba(254,243,199,0.6)', cornerStyle: 'diamond', cornerColor: '#92400e',
    divider: '#d97706', accent: '#1e3a8a',
    titleColor: '#78350f', titleShadow: 'rgba(120,53,15,0.12)',
    nameColor: '#78350f', bodyText: '#57534e', subText: '#78716c',
    quizColor: '#92400e', sealColor: 'rgba(146,64,14,0.3)',
    school1: '#78350f', school2: '#92400e', school3: '#d97706',
    emblem: ['#92400e', '#d97706', '#92400e'],
  },

  emerald_pride: {
    name: 'الزمردي الفاخر', group: 'رسمي',
    preview: ['#f0fdf4', '#065f46'],
    bg: ['#f0fdf4', '#ecfdf5', '#d1fae5'], bgPattern: 'horizontal', bgPatternColor: 'rgba(6,95,70,0.04)',
    outerBorder: '#065f46', innerBorder: '#059669', dashBorder: 'rgba(5,150,105,0.4)',
    headerBg: 'rgba(167,243,208,0.45)', cornerStyle: 'floral', cornerColor: '#065f46',
    divider: '#059669', accent: '#d97706',
    titleColor: '#064e3b', titleShadow: 'rgba(6,78,59,0.12)',
    nameColor: '#064e3b', bodyText: '#374151', subText: '#4b5563',
    quizColor: '#065f46', sealColor: 'rgba(6,95,70,0.3)',
    school1: '#064e3b', school2: '#065f46', school3: '#059669',
    emblem: ['#065f46', '#059669', '#065f46'],
  },

  crimson_honor: {
    name: 'القرمزي الشريف', group: 'رسمي',
    preview: ['#fff1f2', '#991b1b'],
    bg: ['#fff8f8', '#fff1f2', '#fce7f3'], bgPattern: 'crosshatch', bgPatternColor: 'rgba(153,27,27,0.03)',
    outerBorder: '#991b1b', innerBorder: '#dc2626', dashBorder: 'rgba(220,38,38,0.35)',
    headerBg: 'rgba(254,202,202,0.4)', cornerStyle: 'star', cornerColor: '#991b1b',
    divider: '#dc2626', accent: '#d97706',
    titleColor: '#7f1d1d', titleShadow: 'rgba(127,29,29,0.12)',
    nameColor: '#7f1d1d', bodyText: '#374151', subText: '#6b7280',
    quizColor: '#991b1b', sealColor: 'rgba(153,27,27,0.3)',
    school1: '#7f1d1d', school2: '#991b1b', school3: '#dc2626',
    emblem: ['#991b1b', '#dc2626', '#991b1b'],
  },

  purple_royal: {
    name: 'البنفسجي الملكي', group: 'رسمي',
    preview: ['#f5f3ff', '#4c1d95'],
    bg: ['#f5f3ff', '#ede9fe', '#ddd6fe'], bgPattern: 'dots', bgPatternColor: 'rgba(76,29,149,0.05)',
    outerBorder: '#4c1d95', innerBorder: '#7c3aed', dashBorder: 'rgba(124,58,237,0.4)',
    headerBg: 'rgba(196,181,253,0.4)', cornerStyle: 'diamond', cornerColor: '#4c1d95',
    divider: '#7c3aed', accent: '#d97706',
    titleColor: '#3b0764', titleShadow: 'rgba(59,7,100,0.12)',
    nameColor: '#3b0764', bodyText: '#374151', subText: '#6b7280',
    quizColor: '#4c1d95', sealColor: 'rgba(76,29,149,0.3)',
    school1: '#3b0764', school2: '#4c1d95', school3: '#7c3aed',
    emblem: ['#4c1d95', '#7c3aed', '#4c1d95'],
  },

  // ════════════════ GROUP 2: DARK (داكن) ════════════════

  dark_premium: {
    name: 'الداكن الفاخر', group: 'داكن', isDark: true,
    preview: ['#0f172a', '#d97706'],
    bg: ['#0f172a', '#1e1b4b'], bgPattern: 'dots', bgPatternColor: 'rgba(255,255,255,0.04)',
    outerBorder: '#d97706', innerBorder: '#fbbf24', dashBorder: 'rgba(251,191,36,0.25)',
    headerBg: 'rgba(217,119,6,0.1)', cornerStyle: 'diamond', cornerColor: '#d97706',
    divider: '#fbbf24', accent: '#d97706',
    titleColor: '#fde68a', titleShadow: 'rgba(253,230,138,0.15)',
    nameColor: '#fde68a', bodyText: '#cbd5e1', subText: '#94a3b8',
    quizColor: '#fbbf24', sealColor: 'rgba(251,191,36,0.4)',
    school1: '#fde68a', school2: '#fbbf24', school3: '#d97706',
    emblem: ['#d97706', '#fbbf24', '#d97706'],
  },

  midnight_navy: {
    name: 'الليلي البحري', group: 'داكن', isDark: true,
    preview: ['#172554', '#e2e8f0'],
    bg: ['#0f172a', '#172554'], bgPattern: 'dots', bgPatternColor: 'rgba(148,163,184,0.06)',
    outerBorder: '#475569', innerBorder: '#94a3b8', dashBorder: 'rgba(148,163,184,0.2)',
    headerBg: 'rgba(148,163,184,0.08)', cornerStyle: 'circle', cornerColor: '#94a3b8',
    divider: '#94a3b8', accent: '#38bdf8',
    titleColor: '#e2e8f0', titleShadow: 'rgba(226,232,240,0.1)',
    nameColor: '#f1f5f9', bodyText: '#cbd5e1', subText: '#64748b',
    quizColor: '#38bdf8', sealColor: 'rgba(148,163,184,0.35)',
    school1: '#e2e8f0', school2: '#94a3b8', school3: '#475569',
    emblem: ['#94a3b8', '#38bdf8', '#94a3b8'],
  },

  forest_night: {
    name: 'ليل الغابة', group: 'داكن', isDark: true,
    preview: ['#052e16', '#bbf7d0'],
    bg: ['#052e16', '#14532d'], bgPattern: 'crosshatch', bgPatternColor: 'rgba(187,247,208,0.04)',
    outerBorder: '#16a34a', innerBorder: '#4ade80', dashBorder: 'rgba(74,222,128,0.2)',
    headerBg: 'rgba(22,163,74,0.1)', cornerStyle: 'floral', cornerColor: '#4ade80',
    divider: '#4ade80', accent: '#fde047',
    titleColor: '#bbf7d0', titleShadow: 'rgba(187,247,208,0.12)',
    nameColor: '#bbf7d0', bodyText: '#86efac', subText: '#4ade80',
    quizColor: '#4ade80', sealColor: 'rgba(74,222,128,0.35)',
    school1: '#bbf7d0', school2: '#86efac', school3: '#4ade80',
    emblem: ['#16a34a', '#4ade80', '#16a34a'],
  },

  charcoal_elite: {
    name: 'الفحمي الراقي', group: 'داكن', isDark: true,
    preview: ['#111827', '#22d3ee'],
    bg: ['#111827', '#1f2937'], bgPattern: 'grid', bgPatternColor: 'rgba(34,211,238,0.05)',
    outerBorder: '#374151', innerBorder: '#22d3ee', dashBorder: 'rgba(34,211,238,0.2)',
    headerBg: 'rgba(34,211,238,0.07)', cornerStyle: 'bracket', cornerColor: '#22d3ee',
    divider: '#22d3ee', accent: '#f59e0b',
    titleColor: '#e0f2fe', titleShadow: 'rgba(224,242,254,0.1)',
    nameColor: '#e0f2fe', bodyText: '#9ca3af', subText: '#6b7280',
    quizColor: '#22d3ee', sealColor: 'rgba(34,211,238,0.3)',
    school1: '#e0f2fe', school2: '#67e8f9', school3: '#22d3ee',
    emblem: ['#374151', '#22d3ee', '#374151'],
  },

  imperial_purple: {
    name: 'الأرجواني الإمبراطوري', group: 'داكن', isDark: true,
    preview: ['#2e1065', '#e879f9'],
    bg: ['#1a0533', '#2e1065'], bgPattern: 'diagonal', bgPatternColor: 'rgba(232,121,249,0.04)',
    outerBorder: '#7e22ce', innerBorder: '#a855f7', dashBorder: 'rgba(168,85,247,0.25)',
    headerBg: 'rgba(126,34,206,0.15)', cornerStyle: 'star', cornerColor: '#a855f7',
    divider: '#a855f7', accent: '#f0abfc',
    titleColor: '#f5d0fe', titleShadow: 'rgba(245,208,254,0.12)',
    nameColor: '#f5d0fe', bodyText: '#d8b4fe', subText: '#a855f7',
    quizColor: '#e879f9', sealColor: 'rgba(168,85,247,0.35)',
    school1: '#f5d0fe', school2: '#e879f9', school3: '#a855f7',
    emblem: ['#7e22ce', '#a855f7', '#7e22ce'],
  },

  // ════════════════ GROUP 3: MODERN (عصري) ════════════════

  teal_modern: {
    name: 'التيل العصري', group: 'عصري',
    preview: ['#f0fdfa', '#0f766e'],
    bg: ['#f0fdfa', '#ccfbf1'], bgPattern: 'waves', bgPatternColor: 'rgba(15,118,110,0.05)',
    outerBorder: '#0f766e', innerBorder: '#14b8a6', dashBorder: 'rgba(20,184,166,0.35)',
    headerBg: 'rgba(153,246,228,0.4)', cornerStyle: 'bracket', cornerColor: '#0f766e',
    divider: '#14b8a6', accent: '#f59e0b',
    titleColor: '#134e4a', titleShadow: 'rgba(19,78,74,0.1)',
    nameColor: '#134e4a', bodyText: '#374151', subText: '#6b7280',
    quizColor: '#0f766e', sealColor: 'rgba(15,118,110,0.3)',
    school1: '#134e4a', school2: '#0f766e', school3: '#14b8a6',
    emblem: ['#0f766e', '#14b8a6', '#0f766e'],
  },

  sky_fresh: {
    name: 'السماوي المنعش', group: 'عصري',
    preview: ['#f0f9ff', '#0369a1'],
    bg: ['#f0f9ff', '#e0f2fe'], bgPattern: 'horizontal', bgPatternColor: 'rgba(3,105,161,0.04)',
    outerBorder: '#0369a1', innerBorder: '#0ea5e9', dashBorder: 'rgba(14,165,233,0.35)',
    headerBg: 'rgba(186,230,253,0.4)', cornerStyle: 'circle', cornerColor: '#0369a1',
    divider: '#0ea5e9', accent: '#f59e0b',
    titleColor: '#0c4a6e', titleShadow: 'rgba(12,74,110,0.1)',
    nameColor: '#0c4a6e', bodyText: '#374151', subText: '#6b7280',
    quizColor: '#0369a1', sealColor: 'rgba(3,105,161,0.3)',
    school1: '#0c4a6e', school2: '#0369a1', school3: '#0ea5e9',
    emblem: ['#0369a1', '#0ea5e9', '#0369a1'],
  },

  graphite_tech: {
    name: 'الجرافيت التقني', group: 'عصري',
    preview: ['#f8fafc', '#334155'],
    bg: ['#f8fafc', '#f1f5f9'], bgPattern: 'grid', bgPatternColor: 'rgba(51,65,85,0.06)',
    outerBorder: '#334155', innerBorder: '#475569', dashBorder: 'rgba(71,85,105,0.3)',
    headerBg: 'rgba(203,213,225,0.35)', cornerStyle: 'bracket', cornerColor: '#334155',
    divider: '#64748b', accent: '#3b82f6',
    titleColor: '#0f172a', titleShadow: 'rgba(15,23,42,0.1)',
    nameColor: '#0f172a', bodyText: '#334155', subText: '#64748b',
    quizColor: '#475569', sealColor: 'rgba(51,65,85,0.3)',
    school1: '#0f172a', school2: '#334155', school3: '#475569',
    emblem: ['#334155', '#3b82f6', '#334155'],
  },

  indigo_wave: {
    name: 'النيلي المتدفق', group: 'عصري',
    preview: ['#eef2ff', '#3730a3'],
    bg: ['#eef2ff', '#e0e7ff'], bgPattern: 'waves', bgPatternColor: 'rgba(55,48,163,0.05)',
    outerBorder: '#3730a3', innerBorder: '#6366f1', dashBorder: 'rgba(99,102,241,0.35)',
    headerBg: 'rgba(199,210,254,0.45)', cornerStyle: 'diamond', cornerColor: '#3730a3',
    divider: '#6366f1', accent: '#f59e0b',
    titleColor: '#1e1b4b', titleShadow: 'rgba(30,27,75,0.12)',
    nameColor: '#1e1b4b', bodyText: '#374151', subText: '#6b7280',
    quizColor: '#3730a3', sealColor: 'rgba(55,48,163,0.3)',
    school1: '#1e1b4b', school2: '#3730a3', school3: '#6366f1',
    emblem: ['#3730a3', '#6366f1', '#3730a3'],
  },

  olive_digital: {
    name: 'الزيتوني الرقمي', group: 'عصري',
    preview: ['#f7fee7', '#3f6212'],
    bg: ['#f7fee7', '#ecfccb'], bgPattern: 'crosshatch', bgPatternColor: 'rgba(63,98,18,0.04)',
    outerBorder: '#3f6212', innerBorder: '#65a30d', dashBorder: 'rgba(101,163,13,0.35)',
    headerBg: 'rgba(190,242,100,0.35)', cornerStyle: 'star', cornerColor: '#3f6212',
    divider: '#65a30d', accent: '#d97706',
    titleColor: '#1a2e05', titleShadow: 'rgba(26,46,5,0.1)',
    nameColor: '#1a2e05', bodyText: '#374151', subText: '#6b7280',
    quizColor: '#3f6212', sealColor: 'rgba(63,98,18,0.3)',
    school1: '#1a2e05', school2: '#3f6212', school3: '#65a30d',
    emblem: ['#3f6212', '#65a30d', '#3f6212'],
  },

  // ════════════════ GROUP 4: WARM & SPECIAL (دافئ وخاص) ════════════════

  rose_garden: {
    name: 'حديقة الورد', group: 'دافئ',
    preview: ['#fff1f2', '#9f1239'],
    bg: ['#fff8f8', '#fff1f2', '#fce7f3'], bgPattern: 'dots', bgPatternColor: 'rgba(159,18,57,0.04)',
    outerBorder: '#9f1239', innerBorder: '#e11d48', dashBorder: 'rgba(225,29,72,0.35)',
    headerBg: 'rgba(254,205,211,0.4)', cornerStyle: 'floral', cornerColor: '#9f1239',
    divider: '#e11d48', accent: '#d97706',
    titleColor: '#881337', titleShadow: 'rgba(136,19,55,0.1)',
    nameColor: '#881337', bodyText: '#374151', subText: '#6b7280',
    quizColor: '#9f1239', sealColor: 'rgba(159,18,57,0.3)',
    school1: '#881337', school2: '#9f1239', school3: '#e11d48',
    emblem: ['#9f1239', '#e11d48', '#9f1239'],
  },

  sunset_glow: {
    name: 'توهج الغروب', group: 'دافئ',
    preview: ['#fff7ed', '#c2410c'],
    bg: ['#fff7ed', '#ffedd5', '#fed7aa'], bgPattern: 'horizontal', bgPatternColor: 'rgba(194,65,12,0.04)',
    outerBorder: '#c2410c', innerBorder: '#ea580c', dashBorder: 'rgba(234,88,12,0.35)',
    headerBg: 'rgba(253,186,116,0.35)', cornerStyle: 'circle', cornerColor: '#c2410c',
    divider: '#ea580c', accent: '#1e3a8a',
    titleColor: '#7c2d12', titleShadow: 'rgba(124,45,18,0.12)',
    nameColor: '#7c2d12', bodyText: '#374151', subText: '#6b7280',
    quizColor: '#c2410c', sealColor: 'rgba(194,65,12,0.3)',
    school1: '#7c2d12', school2: '#c2410c', school3: '#ea580c',
    emblem: ['#c2410c', '#ea580c', '#c2410c'],
  },

  lavender_grace: {
    name: 'رونق اللافندر', group: 'دافئ',
    preview: ['#faf5ff', '#6b21a8'],
    bg: ['#faf5ff', '#f3e8ff'], bgPattern: 'dots', bgPatternColor: 'rgba(107,33,168,0.04)',
    outerBorder: '#6b21a8', innerBorder: '#9333ea', dashBorder: 'rgba(147,51,234,0.35)',
    headerBg: 'rgba(233,213,255,0.45)', cornerStyle: 'floral', cornerColor: '#6b21a8',
    divider: '#9333ea', accent: '#d97706',
    titleColor: '#581c87', titleShadow: 'rgba(88,28,135,0.1)',
    nameColor: '#581c87', bodyText: '#374151', subText: '#6b7280',
    quizColor: '#6b21a8', sealColor: 'rgba(107,33,168,0.3)',
    school1: '#581c87', school2: '#6b21a8', school3: '#9333ea',
    emblem: ['#6b21a8', '#9333ea', '#6b21a8'],
  },

  coral_vivid: {
    name: 'المرجاني الحيوي', group: 'دافئ',
    preview: ['#fff4f0', '#c2410c'],
    bg: ['#fff4f0', '#ffe4de'], bgPattern: 'waves', bgPatternColor: 'rgba(194,65,12,0.04)',
    outerBorder: '#b45309', innerBorder: '#f97316', dashBorder: 'rgba(249,115,22,0.35)',
    headerBg: 'rgba(254,215,170,0.45)', cornerStyle: 'star', cornerColor: '#b45309',
    divider: '#f97316', accent: '#1e3a8a',
    titleColor: '#7c2d12', titleShadow: 'rgba(124,45,18,0.12)',
    nameColor: '#7c2d12', bodyText: '#374151', subText: '#6b7280',
    quizColor: '#b45309', sealColor: 'rgba(180,83,9,0.3)',
    school1: '#7c2d12', school2: '#b45309', school3: '#f97316',
    emblem: ['#b45309', '#f97316', '#b45309'],
  },

  aurora_spectrum: {
    name: 'طيف قوس قزح', group: 'خاص',
    preview: ['#f0f9ff', '#7c3aed'],
    bg: ['#faf5ff', '#eff6ff', '#f0fdfa'], bgPattern: 'diagonal', bgPatternColor: 'rgba(99,102,241,0.04)',
    outerBorder: '#7c3aed', outerBorder2: '#06b6d4',
    innerBorder: '#a855f7', dashBorder: 'rgba(168,85,247,0.3)',
    headerBg: 'rgba(196,181,253,0.3)', cornerStyle: 'diamond', cornerColor: '#7c3aed',
    divider: '#a855f7', accent: '#f59e0b',
    titleColor: '#3b0764', titleShadow: 'rgba(59,7,100,0.12)',
    nameColor: '#1e1b4b', bodyText: '#374151', subText: '#6b7280',
    quizColor: '#7c3aed', sealColor: 'rgba(124,58,237,0.3)',
    school1: '#3b0764', school2: '#4c1d95', school3: '#7c3aed',
    emblem: ['#7c3aed', '#06b6d4', '#a855f7'],
  },
};

export const TEMPLATE_LIST = Object.entries(TEMPLATES).map(([id, t]) => ({
  id, name: t.name, group: t.group,
  preview: t.preview, isDark: t.isDark || false,
}));
