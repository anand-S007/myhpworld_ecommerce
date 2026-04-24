/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        hp: {
          blue: '#0096D6',
          dark: '#002F5F',
          navy: '#00205B',
          ink: '#0B1221',
        },
        accent: {
          red: '#E0261B',
          amber: '#F59E0B',
          mint: '#10B981',
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(2,8,23,0.06)',
        lift: '0 10px 30px rgba(0, 47, 95, 0.12)',
      },
      animation: {
        marquee: 'marquee 28s linear infinite',
        fadeUp: 'fadeUp .7s ease both',
        pulseDot: 'pulseDot 1.8s ease-out infinite',
      },
      keyframes: {
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        fadeUp: {
          from: { opacity: 0, transform: 'translateY(14px)' },
          to: { opacity: 1, transform: 'none' },
        },
        pulseDot: {
          '0%': { transform: 'scale(.8)', opacity: 0.6 },
          '70%': { transform: 'scale(2.4)', opacity: 0 },
          '100%': { opacity: 0 },
        },
      },
    },
  },
  plugins: [],
};
