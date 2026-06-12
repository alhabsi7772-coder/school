import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function MatrixBackground() {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const { theme } = useTheme();

  // Track actual DOM class (responds to both teacher AND student mode changes)
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
    // Disable matrix entirely in light mode — replaced by BubblesBackground
    if (isLight) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const FONT_SIZE = 13;
    const CHARS     = ['0', '1'];
    let w, h, cols, drops;

    const init = () => {
      w     = canvas.width  = window.innerWidth;
      h     = canvas.height = window.innerHeight;
      cols  = Math.ceil(w / FONT_SIZE);
      drops = Array.from({ length: cols }, () => -(Math.random() * (h / FONT_SIZE)));
      ctx.clearRect(0, 0, w, h);
    };

    init();
    window.addEventListener('resize', init);

    ctx.font = `${FONT_SIZE}px "Courier New", monospace`;

    const rgb       = theme.accentRgb;
    const charAlpha = 0.22;
    const fadeBg    = 'rgba(11, 17, 32, 0.07)';

    let last = 0;
    const INTERVAL = 45; // ~22fps — slow & elegant

    const draw = (ts) => {
      animRef.current = requestAnimationFrame(draw);
      if (ts - last < INTERVAL) return;
      last = ts;

      // Fade old characters
      ctx.fillStyle = fadeBg;
      ctx.fillRect(0, 0, w, h);

      drops.forEach((row, i) => {
        const char = CHARS[Math.floor(Math.random() * 2)];
        const px   = i * FONT_SIZE;
        const py   = row * FONT_SIZE;

        // Lead character — slightly brighter
        ctx.fillStyle = `rgba(${rgb}, ${charAlpha * 1.9})`;
        ctx.fillText(char, px, py);

        // Move down
        drops[i] += 1;
        // Reset when off-screen
        if (py > h && Math.random() > 0.975) {
          drops[i] = -(Math.floor(Math.random() * 25) + 5);
        }
      });
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', init);
    };
  }, [theme, isLight]);

  // Hide matrix completely in light mode
  if (isLight) return null;

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
