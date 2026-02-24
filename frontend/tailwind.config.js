/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6', // Blue 500
          hover: '#2563eb',   // Blue 600
          light: '#60a5fa',   // Blue 400
        },
        bg: {
          dark: '#f1f5f9',    // Slate 100
          card: 'rgba(255, 255, 255, 0.7)', // Translucidez para Glassmorphism claro
          darker: '#f8fafc',  // Slate 50
        },
        text: {
          main: '#1e293b',    // Slate 800
          muted: '#64748b',   // Slate 500
        },
        danger: '#ef4444',
        success: '#10b981',   // Emerald 500
        warning: '#f59e0b',   // Amber 500
        border: 'rgba(0, 0, 0, 0.05)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(99, 102, 241, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
      },
      backdropBlur: {
        xs: '2px',
        '3xl': '64px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 1px 0 rgba(255, 255, 255, 0.1) inset',
        'glass-hover': '0 16px 48px rgba(0, 0, 0, 0.4), 0 0 1px 0 rgba(255, 255, 255, 0.2) inset',
        'glow-primary': '0 0 30px rgba(99, 102, 241, 0.3)',
        'glow-success': '0 0 30px rgba(34, 197, 94, 0.3)',
        'glow-danger': '0 0 30px rgba(239, 68, 68, 0.3)',
      },
    },
  },
  plugins: [],
}
