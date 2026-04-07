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
        whatsapp: "#25D366", // WhatsApp brand green
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['"Source Serif 4"', 'serif'],
      },
      spacing: {
        // Base unit: 4px
        '0.5': '0.125rem',  // 2px
        '1': '0.25rem',      // 4px
        '1.5': '0.375rem',  // 6px
        '2': '0.5rem',      // 8px
        '2.5': '0.625rem',  // 10px
        '3': '0.75rem',     // 12px
        '3.5': '0.875rem',  // 14px
        '4': '1rem',        // 16px
        '5': '1.25rem',     // 20px
        '6': '1.5rem',      // 24px
        '7': '1.75rem',     // 28px
        '8': '2rem',        // 32px
        '9': '2.25rem',     // 36px
        '10': '2.5rem',     // 40px
        '12': '3rem',       // 48px
        '16': '4rem',       // 64px
        '20': '5rem',       // 80px
        '24': '6rem',       // 96px
      },
      screens: {
        'sm': '640px',  // Small phones/tablets
        'md': '768px',  // Tablets
        'lg': '1024px', // Small desktops
        'xl': '1280px', // Desktops
        '2xl': '1536px', // Large desktops
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