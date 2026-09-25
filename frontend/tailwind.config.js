export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      boxShadow: {
        'card':        '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
        'card-hover':  '0 4px 16px 0 rgb(0 0 0 / 0.10)',
        'card-lg':     '0 8px 32px 0 rgb(0 0 0 / 0.12)',
        'glow-brand':  '0 0 24px 0 rgb(99 102 241 / 0.35)',
        'glow-sm':     '0 0 12px 0 rgb(99 102 241 / 0.25)',
        'inner-brand': 'inset 0 1px 0 rgb(255 255 255 / 0.1)',
        'glass':       '0 8px 32px 0 rgb(0 0 0 / 0.08), inset 0 1px 0 rgb(255 255 255 / 0.6)',
      },
      backgroundImage: {
        'gradient-brand':    'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
        'gradient-brand-r':  'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
        'gradient-dark':     'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        'gradient-mesh':     'radial-gradient(at 40% 20%, hsla(240,100%,70%,0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,56%,0.1) 0px, transparent 50%)',
        'gradient-radial':   'radial-gradient(circle at center, var(--tw-gradient-from), var(--tw-gradient-to))',
      },
      animation: {
        'fade-in':     'fadeIn 0.2s ease-out',
        'slide-up':    'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-right': 'slideRight 0.25s ease-out',
        'glow-pulse':  'glowPulse 2s ease-in-out infinite',
        'shimmer':     'shimmer 2s linear infinite',
        'float':       'float 3s ease-in-out infinite',
        'count-up':    'countUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn:   { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        slideUp:  { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideRight: { from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 12px 0 rgb(99 102 241 / 0.3)' },
          '50%':      { boxShadow: '0 0 24px 0 rgb(99 102 241 / 0.6)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
        countUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      backdropBlur: { xs: '2px' },
      borderRadius: { '2.5xl': '20px' },
    },
  },
  plugins: [],
};
