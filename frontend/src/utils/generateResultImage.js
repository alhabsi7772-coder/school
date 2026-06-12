/**
 * Generates a student result image as a Canvas and returns it as a Blob.
 * Uses pure Canvas 2D API (no external libs) for reliable Arabic text rendering.
 */

const COLORS = {
  primary: '#7c3aed',
  indigo: '#4f46e5',
  green: '#16a34a',
  greenBg: '#dcfce7',
  red: '#dc2626',
  redBg: '#fee2e2',
  orange: '#ea580c',
  orangeBg: '#fed7aa',
  slate900: '#0f172a',
  slate700: '#334155',
  slate500: '#64748b',
  slate200: '#e2e8f0',
  white: '#ffffff',
};

function wrapText(ctx, text, maxWidth) {
  if (!text) return [''];
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function calcHeight(student, qMap) {
  const answers = student.answers || [];
  // rough estimate: header(160) + score(120) + per answer(100 base + 40 per wrapped line)
  let h = 320;
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.font = '15px Tajawal, Arial';
  for (const ans of answers) {
    const qq = qMap[ans.question_id] || {};
    const lines = wrapText(tempCtx, ans.answer_text || '(لم يجب)', 580);
    h += 90 + lines.length * 22;
    if (qq.correct_answer && !ans.is_correct && ans.is_correct !== null) h += 50;
  }
  return Math.max(h + 60, 500);
}

export async function generateStudentResultCanvas(student, quiz) {
  const qMap = {};
  (quiz.questions || []).forEach(q => { qMap[q.id] = q; });

  const W = 794;
  const H = calcHeight(student, qMap);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  // Background
  ctx.fillStyle = '#f8f9ff';
  ctx.fillRect(0, 0, W, H);

  // Subtle grid
  ctx.strokeStyle = 'rgba(99,102,241,0.07)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Header gradient
  const grad = ctx.createLinearGradient(0, 0, W, 140);
  grad.addColorStop(0, '#7c3aed');
  grad.addColorStop(1, '#4338ca');
  ctx.fillStyle = grad;
  roundRect(ctx, 20, 20, W - 40, 130, 16);
  ctx.fill();

  // School name
  ctx.fillStyle = COLORS.white;
  ctx.font = 'bold 22px Tajawal, Arial';
  ctx.fillText('مدرسة الخيرات للتعليم الأساسي', W - 30, 62);

  // Quiz title
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = '16px Tajawal, Arial';
  ctx.fillText(quiz.title || 'الاختبار', W - 30, 92);

  // Student name
  ctx.fillStyle = COLORS.white;
  ctx.font = 'bold 20px Tajawal, Arial';
  ctx.fillText(student.student_name, W - 30, 126);

  // Grade/section (left side of header)
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '15px Tajawal, Arial';
  ctx.fillText(`الصف: ${student.grade} / الشعبة ${student.section}`, 30, 92);

  // Score circle
  const pct = Math.round(student.percentage || 0);
  const circleX = 70;
  const circleY = 100;
  const scoreColor = pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626';
  const scoreBg = pct >= 80 ? '#dcfce7' : pct >= 60 ? '#fef3c7' : '#fee2e2';

  ctx.textAlign = 'right';
  ctx.direction = 'rtl';

  // Score card
  ctx.fillStyle = COLORS.white;
  roundRect(ctx, 20, 168, W - 40, 90, 14);
  ctx.fill();

  ctx.fillStyle = scoreBg;
  roundRect(ctx, 35, 180, 120, 65, 12);
  ctx.fill();

  ctx.fillStyle = scoreColor;
  ctx.font = 'bold 28px Tajawal, Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${pct}%`, 95, 210);
  ctx.font = '13px Tajawal, Arial';
  ctx.fillStyle = COLORS.slate500;
  ctx.fillText('النسبة', 95, 230);

  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.slate900;
  ctx.font = 'bold 26px Tajawal, Arial';
  ctx.fillText(`${student.total_score} / ${student.max_score}`, W - 45, 210);
  ctx.font = '14px Tajawal, Arial';
  ctx.fillStyle = COLORS.slate500;
  ctx.fillText('الدرجة الكلية', W - 45, 232);

  // Answers section title
  let y = 280;
  ctx.fillStyle = COLORS.slate900;
  ctx.font = 'bold 17px Tajawal, Arial';
  ctx.fillText('تفاصيل الإجابات', W - 30, y);
  y += 20;

  // Divider
  ctx.strokeStyle = COLORS.slate200;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(W - 20, y); ctx.stroke();
  y += 16;

  // Answers
  const answers = student.answers || [];
  for (let i = 0; i < answers.length; i++) {
    const ans = answers[i];
    const qq = qMap[ans.question_id] || {};
    const isCorrect = ans.is_correct === true;
    const isPending = ans.is_correct === null;

    // Card bg
    const cardBg = isCorrect ? '#f0fdf4' : isPending ? '#fff7ed' : '#fef2f2';
    const borderColor = isCorrect ? '#86efac' : isPending ? '#fdba74' : '#fca5a5';
    ctx.fillStyle = cardBg;
    const answerLines = wrapText(ctx, ans.answer_text || '(لم يجب)', 560);
    const correctLines = (!isCorrect && !isPending && qq.correct_answer)
      ? wrapText(ctx, qq.correct_answer, 560) : [];
    const cardH = 65 + answerLines.length * 22 + (correctLines.length ? 40 + correctLines.length * 22 : 0);

    if (y + cardH > H - 20) break;

    roundRect(ctx, 20, y, W - 40, cardH, 12);
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Question number + status icon
    const statusText = isCorrect ? '✓ صحيح' : isPending ? '⏳ قيد التصحيح' : '✗ خطأ';
    const statusColor = isCorrect ? COLORS.green : isPending ? COLORS.orange : COLORS.red;
    ctx.fillStyle = statusColor;
    ctx.font = 'bold 13px Tajawal, Arial';
    ctx.textAlign = 'right';
    ctx.fillText(statusText, W - 34, y + 22);

    // Score badge
    ctx.fillStyle = COLORS.slate500;
    ctx.font = '13px Tajawal, Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${ans.score}/${qq.points || 1}`, 34, y + 22);

    ctx.fillStyle = COLORS.slate500;
    ctx.font = '12px Tajawal, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`س ${i + 1}`, W / 2, y + 22);

    // Question text (abbreviated)
    ctx.fillStyle = COLORS.slate900;
    ctx.font = 'bold 14px Tajawal, Arial';
    ctx.textAlign = 'right';
    const qLines = wrapText(ctx, qq.text || '', W - 80);
    const qDisplay = qLines[0] + (qLines.length > 1 ? '...' : '');
    ctx.fillText(qDisplay, W - 34, y + 43);

    // Answer
    ctx.fillStyle = COLORS.slate700;
    ctx.font = '14px Tajawal, Arial';
    let ay = y + 62;
    for (const line of answerLines) {
      ctx.fillText(line, W - 34, ay);
      ay += 22;
    }

    // Correct answer (if wrong)
    if (correctLines.length) {
      ctx.fillStyle = COLORS.green;
      ctx.font = '13px Tajawal, Arial';
      ctx.fillText('الإجابة الصحيحة:', W - 34, ay + 8);
      ay += 24;
      for (const line of correctLines) {
        ctx.fillText(line, W - 34, ay);
        ay += 22;
      }
    }

    y += cardH + 10;
  }

  // Footer
  ctx.fillStyle = COLORS.slate500;
  ctx.font = '12px Tajawal, Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`منصة اختبارات مدرسة الخيرات  •  ${new Date().toLocaleDateString('ar-KW')}`, W / 2, H - 18);

  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function canvasToBlob(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

export function buildFileName(student) {
  return `${student.student_name} ${student.grade}-${student.section}.png`;
}
