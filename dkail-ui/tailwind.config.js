/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Kali风格配色
        'kali-dark': '#0D1117',
        'kali-darker': '#010409',
        'kali-bg': '#161B22',
        'kali-border': '#30363D',
        'kali-text': '#E6EDF3',
        'kali-text-muted': '#8B949E',
        'kali-green': '#00FF00',
        'kali-success': '#3FB950',
        'kali-warning': '#D29922',
        'kali-danger': '#F85149',
        'kali-info': '#58A6FF',
      },
      fontFamily: {
        'mono': ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00FF00, 0 0 10px #00FF00, 0 0 15px #00FF00' },
          '100%': { boxShadow: '0 0 10px #00FF00, 0 0 20px #00FF00, 0 0 30px #00FF00' },
        },
      },
    },
  },
  plugins: [],
}
