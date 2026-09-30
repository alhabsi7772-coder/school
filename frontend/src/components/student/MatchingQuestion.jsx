import { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { Link2 } from 'lucide-react';

const COLORS = ['#22c55e', '#38bdf8', '#f59e0b', '#f472b6', '#a78bfa', '#fb7185', '#2dd4bf', '#fbbf24'];

export const MatchingQuestion = ({ left, right, value, onChange }) => {
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [lines, setLines] = useState([]);
  const containerRef = useRef(null);
  const leftRefs = useRef([]);
  const rightRefs = useRef([]);

  const recalcLines = useCallback(() => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    const next = [];
    Object.entries(value || {}).forEach(([li, rightText]) => {
      const rj = right.indexOf(rightText);
      const lEl = leftRefs.current[li];
      const rEl = rightRefs.current[rj];
      if (lEl && rEl) {
        const lb = lEl.getBoundingClientRect();
        const rb = rEl.getBoundingClientRect();
        next.push({
          key: li,
          x1: lb.left - box.left, y1: lb.top + lb.height / 2 - box.top,
          x2: rb.left + rb.width - box.left, y2: rb.top + rb.height / 2 - box.top,
        });
      }
    });
    setLines(next);
  }, [value, right]);

  useLayoutEffect(() => { recalcLines(); }, [recalcLines]);
  useLayoutEffect(() => {
    window.addEventListener('resize', recalcLines);
    return () => window.removeEventListener('resize', recalcLines);
  }, [recalcLines]);

  const colorOf = (li) => COLORS[Number(li) % COLORS.length];

  const clickLeft = (i) => setSelectedLeft(i);
  const clickRight = (j) => {
    if (selectedLeft === null) return;
    const rightText = right[j];
    const next = { ...(value || {}) };
    Object.keys(next).forEach(k => { if (next[k] === rightText) delete next[k]; });
    next[selectedLeft] = rightText;
    onChange(next);
    setSelectedLeft(null);
  };

  return (
    <div ref={containerRef} className="relative grid grid-cols-2 gap-8" data-testid="match-container">
      <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }} data-testid="match-connections-svg">
        {lines.map(l => (
          <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={colorOf(l.key)} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
        ))}
      </svg>

      <div className="space-y-2.5 relative z-10">
        {left.map((text, i) => {
          const connected = value?.[i] !== undefined;
          const isSelected = selectedLeft === i;
          return (
            <button key={i} ref={el => leftRefs.current[i] = el} onClick={() => clickLeft(i)}
              data-testid={`match-left-${i}`}
              className="w-full text-right p-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-between gap-2"
              style={isSelected
                ? { borderColor: '#fff', background: 'rgba(255,255,255,0.12)', color: '#fff' }
                : connected
                ? { borderColor: colorOf(i), background: `${colorOf(i)}1a`, color: '#fff' }
                : { borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', color: 'rgba(226,232,240,0.9)' }}>
              <span>{text}</span>
              {connected && <Link2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colorOf(i) }} />}
            </button>
          );
        })}
      </div>

      <div className="space-y-2.5 relative z-10">
        {right.map((text, j) => {
          const connLeftIdx = Object.keys(value || {}).find(k => value[k] === text);
          const connected = connLeftIdx !== undefined;
          return (
            <button key={j} ref={el => rightRefs.current[j] = el} onClick={() => clickRight(j)}
              data-testid={`match-right-${j}`}
              className="w-full text-right p-3 rounded-xl border-2 text-sm font-medium transition-all"
              style={connected
                ? { borderColor: colorOf(connLeftIdx), background: `${colorOf(connLeftIdx)}1a`, color: '#fff' }
                : selectedLeft !== null
                ? { borderColor: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.08)', color: '#fff' }
                : { borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', color: 'rgba(226,232,240,0.9)' }}>
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
};
