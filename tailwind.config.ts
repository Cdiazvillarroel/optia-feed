import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#BE5529',
          dark: '#9C4420',
          deep: '#7E3518',
          light: '#D4683F',
          hover: '#CB5E33',
          dim: 'rgba(190, 85, 41, 0.12)',
        },
        forest: {
          DEFAULT: '#2E6B42',
          mid: '#3D8555',
          light: '#4FA06A',
          deep: '#1F4F30',
          dim: 'rgba(46, 107, 66, 0.12)',
        },
        teal: {
          DEFAULT: '#1E4A5A',
          mid: '#2A6578',
          light: '#378496',
        },
        gold: {
          DEFAULT: '#C9A043',
          deep: '#A88430',
        },
        surface: {
          bg: '#171410',
          card: '#262019',
          sidebar: '#110F0C',
          deep: '#1E1A15',
          hover: '#312B26',
        },
        border: {
          DEFAULT: '#3B342E',
          light: '#4A423A',
          focus: 'rgba(190, 85, 41, 0.4)',
        },
        text: {
          DEFAULT: '#F4EFE9',
          dim: '#E6DDD0',
          muted: '#A69D93',
          faint: '#5A5149',
          ghost: '#3B342E',
        },
        status: {
          amber: '#C9A043',
          coral: '#D4683F',
          blue: '#2A6578',
          purple: '#8A6BC4',
          red: '#B03030',
        },
        species: {
          cattle: '#BE5529',
          pig: '#D4683F',
          poultry: '#C9A043',
          sheep: '#2A6578',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        xs: ['11px', '16px'],
        sm: ['12px', '16px'],
        base: ['13px', '20px'],
        lg: ['14px', '20px'],
        xl: ['16px', '24px'],
        '2xl': ['20px', '28px'],
        '3xl': ['28px', '36px'],
      },
      borderRadius: {
        DEFAULT: '7px',
        lg: '12px',
        xl: '14px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease',
        'slide-in': 'slideIn 0.3s cubic-bezier(.4,0,.2,1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
