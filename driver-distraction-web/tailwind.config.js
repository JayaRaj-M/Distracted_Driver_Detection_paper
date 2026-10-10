/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        telemetry: {
          dark: '#030712',
          card: '#0f172a',
          border: '#1e293b',
          accent: '#38bdf8',
          safe: '#10b981',
          warning: '#f59e0b',
          alert: '#ef4444'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-safe': 'glowSafe 2s ease-in-out infinite alternate',
        'glow-alert': 'glowAlert 0.8s ease-in-out infinite alternate',
      },
      keyframes: {
        glowSafe: {
          '0%': { boxShadow: '0 0 5px rgba(16, 185, 129, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.6)' },
        },
        glowAlert: {
          '0%': { boxShadow: '0 0 5px rgba(239, 68, 68, 0.3)' },
          '100%': { boxShadow: '0 0 25px rgba(239, 68, 68, 0.8)' },
        },
      }
    },
  },
  plugins: [],
}
