export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          sky: '#1794C6',
          indigo: '#4F46E5',
          violet: '#7C3AED',
          amber: '#F59E0B',
        },
      },
      boxShadow: {
        indigo: '0 10px 20px -6px rgb(79 70 229 / 0.35)',
        amber: '0 10px 20px -6px rgb(245 158 11 / 0.30)',
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(90deg, #3B82F6 0%, #7C3AED 100%)',
        'gradient-hero-hover': 'linear-gradient(90deg, #2563EB 0%, #6D28D9 100%)',
        'gradient-warm': 'linear-gradient(135deg, #FEF3C7 0%, #FED7AA 100%)',
      },
    },
  },
  plugins: [],
};
