import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        headline: ['Newsreader', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        primary: '#d44439',
        'primary-dark': '#b83530',
        surface: '#FFFFFF',
        'surface-2': '#F7F6F3',
        'surface-3': '#EFEDE8',
        'surface-4': '#E4E2DC',
        ink: '#0F0F0E',
        'ink-2': '#3A3A38',
        'ink-3': '#6B6B68',
        'ink-4': '#9A9A96',
        'ink-5': '#C8C8C4',
        sidebar: '#141412',
        gold: '#8B6914',
        'gold-mid': '#C9A84C',
        'gold-light': '#F5EDD8',
        blue: '#1A4FBF',
        'blue-light': '#EEF3FF',
        green: '#1A7A4A',
        'green-light': '#E8F5EE',
        red: '#A0281A',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      boxShadow: {
        float: '0 8px 32px rgba(0,0,0,0.08),0 2px 8px rgba(0,0,0,0.04)',
        card: '0 1px 4px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}

export default config
