/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        // Schocken: condensed grotesk like beer labels and pub boards, Barlow for running text
        pub: ['"Barlow Condensed"', 'system-ui', 'sans-serif'],
        'pub-body': ['Barlow', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: 'rgba(255,255,255,0.05)',
        'surface-hover': 'rgba(255,255,255,0.08)',
        border: 'rgba(255,255,255,0.1)',
        // Schocken pub palette
        pub: {
          wood: '#241710',      // dark stained bar counter
          plank: '#34231A',     // lighter wood for raised surfaces
          leather: '#5A3420',   // dice cup leather
          felt: '#1E4636',      // felt lining of the dice tray
          beer: '#E8A93B',      // pils — primary actions only
          foam: '#F3EBDD',      // foam, cigarette paper, dice, coasters
          ash: '#A89C90',       // secondary text
          ember: '#F26A47',     // glowing cigarette tip — whoever drinks (≥ 4.5:1 on wood and plank)
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
