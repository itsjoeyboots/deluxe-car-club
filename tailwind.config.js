/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // DSC brand palette — see /lib/theme.ts for the canonical source
        terracotta: {
          DEFAULT: '#C4622D',
          deep: '#8B3A1B',
        },
        sand: {
          DEFAULT: '#F5E6C8',
          light: '#FAF0DC',
        },
        ink: {
          DEFAULT: '#1C1008',
          muted: '#2A2418',
        },
        gold: {
          DEFAULT: '#C8982A',
          bright: '#E8C060',
        },
      },
      fontFamily: {
        serif: ['PlayfairDisplay_700Bold', 'Georgia', 'serif'],
        'serif-regular': ['PlayfairDisplay_400Regular', 'Georgia', 'serif'],
        sans: ['Inter_400Regular', 'system-ui', 'sans-serif'],
        'sans-medium': ['Inter_500Medium', 'system-ui', 'sans-serif'],
        'sans-bold': ['Inter_700Bold', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        stamped: '0.08em',
      },
    },
  },
  plugins: [],
};
