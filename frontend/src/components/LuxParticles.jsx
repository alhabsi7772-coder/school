import { useEffect, useRef } from 'react';

/**
 * LuxParticles — خلفية "نظام تشغيل ذكاء اصطناعي" فاخرة (ثيم لوكس فقط)
 * مربعات متوهجة صغيرة (1.5-3px) بثلاث طبقات عمق، انجراف عضوي بطيء،
 * مطر رقمي عمودي/قطري خفيف، موجات متدفقة، وتفاعل ناعم مع الماوس (نصف قطر 150px).
 * Canvas 2D محسَّن للأداء (60fps سطح مكتب / عدد أقل على الجوال).
 */
export default function LuxParticles() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const isMobile = window.innerWidth < 768;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w, h, particles = [], raf = 0, running = true, lastFrame = 0;
    const FRAME_INTERVAL = isMobile ? 33 : 0; // ~30fps جوال، كامل السرعة سطح مكتب
    const mouse = { x: -9999, y: -9999 };
    const ripples = [];

    // ثلاث طبقات عمق: خلفية (صغيرة/بطيئة/باهتة) → وسطى → أمامية (أكبر/أسرع/أسطع)
    const LAYERS = [
      { count: isMobile ? 70 : 340, size: [0.8, 1.5], speed: 0.05, alpha: [0.05, 0.13] },
      { count: isMobile ? 90 : 380, size: [1.3, 2.2], speed: 0.13, alpha: [0.10, 0.28] },
      { count: isMobile ? 50 : 180, size: [2.2, 3.0], speed: 0.24, alpha: [0.22, 0.55] },
    ];

    const rand = (a, b) => a + Math.random() * (b - a);

    const makeParticle = (layerIdx) => {
      const L = LAYERS[layerIdx];
      const roll = Math.random();
      let vx, vy, type;
      if (roll < 0.72) { // انجراف عضوي حر
        type = 'drift'; vx = rand(-0.5, 0.5) * L.speed; vy = rand(-0.5, 0.5) * L.speed;
      } else if (roll < 0.88) { // مطر رقمي عمودي
        type = 'rain'; vx = 0; vy = rand(0.6, 1.3) * L.speed * 2.0;
      } else { // انجراف قطري
        type = 'diag';
        vx = rand(0.3, 0.7) * L.speed * 1.5 * (Math.random() < 0.5 ? -1 : 1);
        vy = rand(0.3, 0.7) * L.speed * 1.5;
      }
      return {
        layer: layerIdx, type, vx, vy,
        x: Math.random() * w, y: Math.random() * h,
        size: rand(L.size[0], L.size[1]),
        baseA: rand(L.alpha[0], L.alpha[1]),
        life: Math.random() * Math.PI * 2,       // دورة توهج/خفوت
        lifeSpeed: rand(0.003, 0.010),
        phase: Math.random() * Math.PI * 2,      // طور الموجة
        waveAmp: rand(0.05, 0.35),
        emerald: Math.random() < 0.26,           // نسبة بلمسة زمردية
        ox: 0, oy: 0,                            // إزاحة تفاعل الماوس
      };
    };

    const init = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = [];
      LAYERS.forEach((L, i) => { for (let k = 0; k < L.count; k++) particles.push(makeParticle(i)); });
    };
    init();

    const onResize = () => init();
    window.addEventListener('resize', onResize);

    let lastRipple = 0;
    const onMove = (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY;
      const now = performance.now();
      if (now - lastRipple > 450 && ripples.length < 3) {
        lastRipple = now;
        ripples.push({ x: e.clientX, y: e.clientY, r: 0, alpha: 1 });
      }
    };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);

    const onVis = () => { running = !document.hidden; if (running) { lastFrame = 0; raf = requestAnimationFrame(draw); } };
    document.addEventListener('visibilitychange', onVis);

    const R = 150;       // نصف قطر التفاعل
    let t = 0;

    const draw = (ts) => {
      if (!running) return;
      raf = requestAnimationFrame(draw);
      if (FRAME_INTERVAL && ts - lastFrame < FRAME_INTERVAL) return;
      lastFrame = ts;
      t += 1;

      ctx.clearRect(0, 0, w, h);

      // تمدد الموجات (ripples)
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += 2.4; rp.alpha -= 0.016;
        if (rp.alpha <= 0 || rp.r > R * 1.4) ripples.splice(i, 1);
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!reduced) {
          // حركة أساسية + موجة جيبية عضوية خفيفة
          p.x += p.vx + Math.sin(t * 0.004 + p.phase) * p.waveAmp * 0.06;
          p.y += p.vy + (p.type === 'drift' ? Math.cos(t * 0.003 + p.phase) * p.waveAmp * 0.04 : 0);
          p.life += p.lifeSpeed;

          // تفاعل الماوس: تنافر ناعم
          const dx = p.x - mouse.x, dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R * R && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (1 - d / R) * 1.6;
            p.ox += (dx / d) * f;
            p.oy += (dy / d) * f;
          }
          // دفعة الموجة المتمددة
          for (let k = 0; k < ripples.length; k++) {
            const rp = ripples[k];
            const rdx = p.x - rp.x, rdy = p.y - rp.y;
            const rd = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
            if (Math.abs(rd - rp.r) < 22) {
              const f = rp.alpha * 0.9;
              p.ox += (rdx / rd) * f;
              p.oy += (rdy / rd) * f;
            }
          }
          p.ox *= 0.90; p.oy *= 0.90; // عودة مرنة
        }

        // التفاف الحواف
        if (p.x < -6) p.x = w + 6; else if (p.x > w + 6) p.x = -6;
        if (p.y < -6) p.y = h + 6; else if (p.y > h + 6) p.y = -6;

        // توهج/خفوت دوري
        const a = p.baseA * (0.5 + 0.5 * Math.sin(p.life));
        if (a < 0.012) continue;

        const px = p.x + p.ox, py = p.y + p.oy, s = p.size;
        if (p.emerald) {
          // هالة زمردية خفيفة (مربع أكبر شفاف) ثم النواة
          ctx.fillStyle = `rgba(40,245,167,${a * 0.22})`;
          ctx.fillRect(px - s, py - s, s * 3, s * 3);
          ctx.fillStyle = `rgba(40,245,167,${a})`;
        } else {
          ctx.fillStyle = `rgba(255,255,255,${a})`;
        }
        ctx.fillRect(px, py, s, s);
      }
    };
    raf = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <>
      {/* إضاءة زمردية سينمائية خافتة جداً خلف الجسيمات */}
      <div
        aria-hidden="true"
        data-lux-glow
        style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 55% 45% at 72% 12%, rgba(22,214,122,0.055), transparent 70%),' +
            'radial-gradient(ellipse 48% 40% at 15% 88%, rgba(22,214,122,0.04), transparent 70%)',
        }}
      />
      <canvas
        ref={canvasRef}
        data-lux-particles
        style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 0 }}
      />
    </>
  );
}
