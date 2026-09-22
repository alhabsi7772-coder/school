// Particles with negative delays = start mid-animation = immediately visible at various heights
const PARTICLE_DATA = [
  { left: 3,  size: 3, delay: -2,    dur: 12, opacity: 0.20, drift: 18,  hollow: false },
  { left: 8,  size: 5, delay: -8,    dur: 17, opacity: 0.13, drift: -22, hollow: true  },
  { left: 14, size: 2, delay: -4,    dur: 10, opacity: 0.25, drift: 12,  hollow: false },
  { left: 19, size: 7, delay: -12,   dur: 20, opacity: 0.10, drift: -15, hollow: true  },
  { left: 25, size: 3, delay: -6,    dur: 13, opacity: 0.22, drift: 20,  hollow: false },
  { left: 30, size: 4, delay: -9,    dur: 16, opacity: 0.16, drift: -18, hollow: false },
  { left: 35, size: 6, delay: -14,   dur: 19, opacity: 0.11, drift: 14,  hollow: true  },
  { left: 40, size: 2, delay: -3,    dur: 11, opacity: 0.26, drift: -10, hollow: false },
  { left: 45, size: 4, delay: -7,    dur: 15, opacity: 0.17, drift: 16,  hollow: false },
  { left: 50, size: 8, delay: -16,   dur: 22, opacity: 0.08, drift: -20, hollow: true  },
  { left: 55, size: 3, delay: -5,    dur: 12, opacity: 0.22, drift: 10,  hollow: false },
  { left: 60, size: 5, delay: -13,   dur: 18, opacity: 0.12, drift: -24, hollow: true  },
  { left: 65, size: 2, delay: -1,    dur: 10, opacity: 0.28, drift: 18,  hollow: false },
  { left: 70, size: 6, delay: -10,   dur: 21, opacity: 0.09, drift: -12, hollow: true  },
  { left: 75, size: 3, delay: -11,   dur: 14, opacity: 0.20, drift: 22,  hollow: false },
  { left: 80, size: 4, delay: -4,    dur: 16, opacity: 0.17, drift: -16, hollow: false },
  { left: 85, size: 7, delay: -17,   dur: 23, opacity: 0.09, drift: 10,  hollow: true  },
  { left: 90, size: 2, delay: -7,    dur: 11, opacity: 0.24, drift: -20, hollow: false },
  { left: 94, size: 5, delay: -15,   dur: 18, opacity: 0.13, drift: 14,  hollow: true  },
  { left: 97, size: 3, delay: -9,    dur: 13, opacity: 0.21, drift: -8,  hollow: false },
  { left: 12, size: 4, delay: -6,    dur: 15, opacity: 0.15, drift: 20,  hollow: false },
  { left: 22, size: 2, delay: -3,    dur: 10, opacity: 0.26, drift: -14, hollow: false },
  { left: 33, size: 6, delay: -18,   dur: 20, opacity: 0.10, drift: 12,  hollow: true  },
  { left: 48, size: 3, delay: -10,   dur: 12, opacity: 0.22, drift: -18, hollow: false },
  { left: 58, size: 5, delay: -14,   dur: 17, opacity: 0.12, drift: 16,  hollow: true  },
  { left: 68, size: 2, delay: -8,    dur: 10, opacity: 0.27, drift: -10, hollow: false },
  { left: 78, size: 4, delay: -12,   dur: 14, opacity: 0.18, drift: 18,  hollow: false },
  { left: 88, size: 7, delay: -19,   dur: 22, opacity: 0.09, drift: -22, hollow: true  },
  { left: 5,  size: 3, delay: -5,    dur: 13, opacity: 0.21, drift: 14,  hollow: false },
  { left: 92, size: 4, delay: -16,   dur: 16, opacity: 0.14, drift: -12, hollow: false },
];

export default function Particles() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
      }}
    >
      {PARTICLE_DATA.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            bottom: '-20px',
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background: p.hollow
              ? 'transparent'
              : `rgba(var(--theme-accent-rgb), ${p.opacity})`,
            border: p.hollow
              ? `1px solid rgba(var(--theme-accent-rgb), ${p.opacity + 0.06})`
              : 'none',
            boxShadow: p.hollow
              ? 'none'
              : `0 0 ${p.size * 2}px rgba(var(--theme-accent-rgb), ${p.opacity * 0.7})`,
            animationName: 'bubble-rise',
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationFillMode: 'both',
            '--drift': `${p.drift}px`,
          }}
        />
      ))}

      <style>{`
        @keyframes bubble-rise {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0;
          }
          8% { opacity: 1; }
          50% {
            transform: translateY(-50vh) translateX(var(--drift)) scale(1.08);
            opacity: 0.85;
          }
          88% { opacity: 0.4; }
          100% {
            transform: translateY(-105vh) translateX(calc(var(--drift) * 1.6)) scale(0.75);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
