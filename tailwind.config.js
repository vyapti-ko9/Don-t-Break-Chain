/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0b12',
        surface: '#12141f',
        surface2: '#1b1e2e',
        line: '#2a2e44',
        primary: '#5b8cff',
        accent: '#00e6c3',
        gold: '#ffd24a',
        danger: '#ff5a6a',
        muted: '#8b90a8',
      },
      fontWeight: {
        400: '400',
        500: '500',
        600: '600',
        700: '700',
        800: '800',
      },
      fontFamily: {
        display: ['"Baloo 2"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(91,140,255,0.45)',
        'glow-accent': '0 0 28px rgba(0,230,195,0.4)',
        'glow-gold': '0 0 28px rgba(255,210,74,0.35)',
        card: '0 8px 30px rgba(0,0,0,0.45)',
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseGlow: {
          '0%,100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        ringPulse: {
          '0%': { transform: 'scale(0.85)', opacity: '0.8' },
          '100%': { transform: 'scale(1.45)', opacity: '0' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.28s cubic-bezier(0.22,1,0.36,1)',
        'slide-up': 'slide-up 0.32s cubic-bezier(0.22,1,0.36,1)',
        'slide-down': 'slide-down 0.35s cubic-bezier(0.22,1,0.36,1)',
        'fade-in': 'fade-in 0.25s ease-out',
        float: 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.4s ease-in-out infinite',
        shimmer: 'shimmer 2.8s linear infinite',
        'ring-pulse': 'ringPulse 1.1s ease-out infinite',
      },
    },
  },
  plugins: [],
};
