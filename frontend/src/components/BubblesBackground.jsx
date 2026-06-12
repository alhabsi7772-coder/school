import { useEffect, useRef, useState } from 'react';

/**
 * BubblesBackground — floating gold bubbles for LIGHT mode only.
 * Calm, elegant, eye-friendly. Renders nothing in dark mode.
 */
export default function BubblesBackground() {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  const [isLight, setIsLight] = useState(
    () => document.documentElement.classList.contains('mode-light')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.classList.contains('mode-light'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isLight) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w, h, bubbles;
    const COUNT = 38; // small floating bubbles
    const GOLD  = '201, 169, 97'; // antique gold rgb

    const reset = (b, fromBottom = true) => {
      b.x  = Math.random() * w;
      b.y  = fromBottom ? h + Math.random() * 80 : Math.random() * h;
      b.r  = 3 + Math.random() * 9;             // 3–12 px radius
      b.vy = 0.15 + Math.random() * 0.35;        // slow rise
      b.vx = (Math.random() - 0.5) * 0.18;       // gentle drift
      b.a  = 0.18 + Math.random() * 0.30;        // soft opacity
      b.wob = Math.random() * Math.PI * 2;       // wobble phase
    };

    const init = () => {
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
      bubbles = Array.from({ length: COUNT }, () => {
        const b = {};
        reset(b, false);
        return b;
      });
    };

    init();
    window.addEventListener('resize', init);

    let last = 0;
    const INTERVAL = 33; // ~30fps — smooth but light

    const draw = (ts) => {
      animRef.current = requestAnimationFrame(draw);
      if (ts - last < INTERVAL) return;
      last = ts;

      ctx.clearRect(0, 0, w, h);

      bubbles.forEach(b => {
        b.wob += 0.02;
        b.y   -= b.vy;
        b.x   += b.vx + Math.sin(b.wob) * 0.25;

        // recycle when bubble floats off top
        if (b.y + b.r < -10) reset(b, true);

        // soft radial gradient (gold core → transparent edge)
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grad.addColorStop(0,    `rgba(${GOLD}, ${b.a})`);
        grad.addColorStop(0.7,  `rgba(${GOLD}, ${b.a * 0.35})`);
        grad.addColorStop(1,    `rgba(${GOLD}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();

        // crisp highlight dot for "bubble" feel
        ctx.fillStyle = `rgba(255, 248, 225, ${b.a * 0.55})`;
        ctx.beginPath();
        ctx.arc(b.x - b.r * 0.30, b.y - b.r * 0.30, Math.max(0.6, b.r * 0.18), 0, Math.PI * 2);
        ctx.fill();
      });
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', init);
    };
  }, [isLight]);

  if (!isLight) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
