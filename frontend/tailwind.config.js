/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        // Refera-inspired clinical palette
        forest: {
          DEFAULT: '#0B3D33',
          soft: '#124A3E',
          deep: '#082E27',
        },
        mint: {
          DEFAULT: '#8FD9B8',
          soft: '#C8F0DC',
          strong: '#6BC49A',
          ink: '#0B3D33',
        },
        canvas: {
          DEFAULT: '#F2F3F5',
          muted: '#E8EAED',
        },
        clinical: {
          blue: '#0284c7',
          amber: '#d97706',
          rose: '#e11d48',
          emerald: '#059669',
          slate: '#334155',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan-line': 'scan 2.5s ease-in-out infinite',
      },
      keyframes: {
        scan: {
          '0%, 100%': { transform: 'translateY(0%)', opacity: '0.8' },
          '50%': { transform: 'translateY(100%)', opacity: '0.3' },
        }
      }
    },
  },
  plugins: [],
}
