/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        tajawal: ['Tajawal', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))', '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))', '4': 'hsl(var(--chart-4))', '5': 'hsl(var(--chart-5))'
        },
        neon: {
          cyan: '#00E5FF',
          fuchsia: '#D500F9',
          green: '#00E676',
          amber: '#FFEA00',
        },
        cosmos: {
          950: '#0B1120',
          900: '#111827',
          800: '#1E2A3A',
          700: '#263347',
        }
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'orb-float': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)', opacity: '0.6' },
          '33%': { transform: 'translate(40px, -60px) scale(1.15)', opacity: '0.8' },
          '66%': { transform: 'translate(-30px, 40px) scale(0.9)', opacity: '0.5' },
        },
        'orb-float-2': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)', opacity: '0.5' },
          '33%': { transform: 'translate(-50px, 30px) scale(1.1)', opacity: '0.7' },
          '66%': { transform: 'translate(30px, -50px) scale(0.95)', opacity: '0.4' },
        },
        'grid-pulse': {
          '0%, 100%': { opacity: '0.03' },
          '50%': { opacity: '0.07' },
        },
        'float-y': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(0, 229, 255, 0.3), 0 0 40px rgba(0, 229, 255, 0.1)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 229, 255, 0.6), 0 0 80px rgba(0, 229, 255, 0.2)' },
        },
        'slide-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'icon-3d-hover': {
          '0%': { transform: 'perspective(400px) rotateY(0deg) rotateX(0deg)' },
          '100%': { transform: 'perspective(400px) rotateY(15deg) rotateX(-10deg)' },
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'orb-float': 'orb-float 12s ease-in-out infinite',
        'orb-float-2': 'orb-float-2 16s ease-in-out infinite',
        'grid-pulse': 'grid-pulse 4s ease-in-out infinite',
        'float-y': 'float-y 3s ease-in-out infinite',
        'spin-slow': 'spin-slow 20s linear infinite',
        'glow-pulse': 'glow-pulse 2.5s ease-in-out infinite',
        'slide-in-up': 'slide-in-up 0.5s ease-out forwards',
        'shimmer': 'shimmer 3s linear infinite',
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 229, 255, 0.4), 0 0 40px rgba(0, 229, 255, 0.15)',
        'neon-fuchsia': '0 0 15px rgba(213, 0, 249, 0.4), 0 0 40px rgba(213, 0, 249, 0.15)',
        'neon-green': '0 0 15px rgba(0, 230, 118, 0.4), 0 0 40px rgba(0, 230, 118, 0.15)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'card-dark': '0 4px 24px rgba(0, 0, 0, 0.3)',
      },
      backgroundImage: {
        'grid-cosmos': "linear-gradient(rgba(0,229,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.04) 1px, transparent 1px)",
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(0,229,255,0.08) 50%, transparent 100%)',
      },
      backdropBlur: {
        xs: '2px',
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};
