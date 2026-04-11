/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ws: {
          void: '#0a0806',
          deep: '#120f0c',
          surface: '#171310',
          panel: '#1c1814',
          raised: '#262018',
          rail: '#0d0a08',
          line: '#2e2620',
          lineStrong: '#3d342c',
          paper: '#f7f3eb',
          ink: '#a89888',
          mist: '#7d6f62',
          accent: '#af7037',
          'accent-soft': '#c98a4c',
          'accent-muted': '#8b572a',
          'accent-dim': 'rgba(175, 112, 55, 0.22)',
          'accent-glow': 'rgba(201, 138, 76, 0.45)',
          cream: '#faf6ef',
          'cream-dim': '#e8dcc8',
          bear: '#e85d5d',
          'bear-dim': 'rgba(232, 93, 93, 0.14)',
          bull: '#c98a4c',
          'bull-dim': 'rgba(201, 138, 76, 0.18)',
          gold: '#d4a574',
          'gold-dim': 'rgba(212, 165, 116, 0.18)',
          highlight: '#e8c9a0',
          wire: 'rgba(175, 112, 55, 0.42)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        dock: '0 0 0 1px rgba(255,245,230,0.05), 0 25px 50px -12px rgba(0,0,0,0.9)',
        glow: '0 0 48px -12px rgba(201, 138, 76, 0.35)',
        'glow-sm': '0 0 28px -6px rgba(175, 112, 55, 0.4)',
        'nav-orb': '0 0 18px rgba(255, 245, 230, 0.45), 0 4px 14px rgba(0,0,0,0.35)',
        'card-inner': 'inset 0 1px 0 0 rgba(255, 245, 230, 0.06)',
      },
      backgroundImage: {
        'ws-mystic':
          'linear-gradient(180deg, #1a1614 0%, #100d0b 42%, #0a0806 100%)',
        'ws-vignette':
          'radial-gradient(ellipse 75% 45% at 50% -15%, rgba(175, 112, 55, 0.14), transparent 58%), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(139, 87, 42, 0.06), transparent 50%)',
        'ws-noise':
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
        'ws-bronze-card':
          'linear-gradient(145deg, rgba(139, 87, 42, 0.92) 0%, rgba(100, 58, 28, 0.88) 50%, rgba(74, 42, 22, 0.9) 100%)',
      },
    },
  },
  plugins: [],
};
