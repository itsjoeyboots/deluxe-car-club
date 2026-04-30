/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // DCC brand palette — see /lib/theme.ts for the canonical source.
        // Token names retained from the DSC era; values pivoted dark luxury.
        terracotta: {
          DEFAULT: '#22D3DA', // turquoise primary accent
          deep: '#0EA8B5',
        },
        sand: {
          DEFAULT: '#13131A', // dark surface
          light: '#1C1C26',
        },
        ink: {
          DEFAULT: '#0B0B0D',
          muted: '#15151B',
        },
        gold: {
          DEFAULT: '#E5E5E2', // metallic silver / ivory
          bright: '#7AECEF', // bright cyan glow
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
