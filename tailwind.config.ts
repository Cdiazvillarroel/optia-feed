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
          DEFAULT: '#4CAF7D',
          dark: '#2D8F5E',
          light: '#6BC497',
          dim: '#4CAF7D18',
        },
        surface: {
          bg: '#15202B',
          card: '#1E2D3A',
          sidebar: '#1A2530',
          deep: '#0D1820',
        },
        border: {
          DEFAULT: '#2A3A4A',
          light: '#3A4A5A',
          focus: '#4CAF7D60',
        },
        text: {
          DEFAULT: '#E8ECF0',
          dim: '#C8D0D8',
          muted: '#8A96A3',
          faint: '#6B7A8A',
          ghost: '#5A6B7A',
        },
        status: {
          amber: '#D4A843',
          coral: '#E88B6E',
          blue: '#7BA0C4',
          purple: '#8A6BC4',
          red: '#E05252',
        },
        species: {
          cattle: '#4CAF7D',
          pig: '#E88B6E',
          poultry: '#D4A843',
          sheep: '#7BA0C4',
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
        DEFAULT: '8px',
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
