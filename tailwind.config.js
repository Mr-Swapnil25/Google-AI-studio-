/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        // B2B Sharp Typography Stack - Apple-grade professional
        sans: ['Inter', 'system-ui', 'sans-serif'],            // Body text
        heading: ['Syne', 'system-ui', 'sans-serif'],          // Headings
        display: ['Syne', 'system-ui', 'sans-serif'],          // Display/Hero
        body: ['Inter', 'system-ui', 'sans-serif'],            // Body
        mono: ['JetBrains Mono', 'monospace'],                 // Prices/Data
        data: ['JetBrains Mono', 'monospace'],                 // Prices/Numbers
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.25' }],
        'sm': ['0.875rem', { lineHeight: '1.35' }],
        'base': ['1rem', { lineHeight: '1.5' }],
        'lg': ['1.125rem', { lineHeight: '1.4' }],
        'xl': ['1.25rem', { lineHeight: '1.35' }],
        '2xl': ['1.5rem', { lineHeight: '1.3' }],
        '3xl': ['1.875rem', { lineHeight: '1.25' }],
        '4xl': ['2.25rem', { lineHeight: '1.2' }],
      },
      borderRadius: {
        "none": "0",
        "DEFAULT": "0.5rem",          // 8px default
        "sm": "0.375rem",              // 6px
        "md": "0.5rem",                // 8px
        "lg": "0.75rem",               // 12px
        "xl": "1rem",                  // 16px - inputs, buttons
        "2xl": "1.5rem",               // 24px - cards
        "3xl": "2rem",                 // 32px - premium cards
        "full": "9999px"               // Circles/pills
      },
      boxShadow: {
        "soft": "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)",
        "card": "0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
        "elevated": "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.04)",
        "pro": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      },
      colors: {
        // Natural Premium Palette
        "primary": "#1B4332",
        "primary-light": "#2D6A4F",
        "primary-dark": "#143326",
        "background-light": "#F9FAFB",
        "background-dark": "#111827",
        "text-main": "#1F2937",
        "text-muted": "#6B7280",
        "surface": "#FFFFFF",
        // Accent colors
        "accent": {
          DEFAULT: '#FFB703',
          light: '#FFC933',
          dark: '#E5A503',
        },
        "teal": {
          DEFAULT: '#2D6A4F',
          light: '#40916C',
          dark: '#1B4332',
        },
        // Neutral grays
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        stone: {
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
        },
        "buyer-primary": {
          DEFAULT: '#1B4332',
          light: '#2D6A4F',
          dark: '#143326',
        },
        secondary: {
          DEFAULT: '#2D6A4F',
          light: '#40916C',
          dark: '#1B4332',
        },
        background: {
          DEFAULT: '#F9FAFB',
          alt: '#FFFFFF',
        },
        'farmer-primary': {
          DEFAULT: '#1B4332',
          light: '#2D6A4F',
          dark: '#143326',
        },
        'farmer-secondary': {
          DEFAULT: '#4B5563',
          light: '#6B7280',
          dark: '#374151',
        },
        'farmer-accent': {
          DEFAULT: '#FFB703',
          light: '#FFC933',
          dark: '#E5A503',
        },
        'farmer-background': {
          DEFAULT: '#F9FAFB',
          alt: '#FFFFFF',
        },
        // Status colors
        'success': '#059669',
        'warning': '#D97706',
        'error': '#DC2626',
        'info': '#0284C7',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out forwards',
        'slide-in-up': 'slide-in-up 0.25s ease-out forwards',
        'slide-in-left': 'slide-in-left 0.2s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.25s ease-out forwards',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      spacing: {
        '11': '2.75rem',
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
