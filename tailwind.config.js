/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1a1a1a", // Soft black
        secondary: "#4a4a4a", // Dark gray
        accent: "#D4AF37", // Metallic Gold
        "accent-light": "#F3E5AB", // Champagne
        background: "#ffffff",
        surface: "#f9f9f9",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['"Source Serif 4"', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0.8' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          // Start nearly visible to prevent CLS, only animate transform
          '0%': { opacity: '1', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}