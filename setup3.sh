cd frontend

# Initialize Vite project if needed
if [ ! -f package.json ]; then
  npm create vite@latest . -- --template react
fi

# Install dependencies
npm install
npm install react-router-dom dexie react-hot-toast date-fns react-markdown axios
npm install -D tailwindcss postcss autoprefixer

# Initialize Tailwind CSS
npx tailwindcss init -p

# Update tailwind.config.js with your theme
cat > tailwind.config.js << 'EOF'
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
        'fastline-blue': '#0A84FF',
        'electric-teal': '#00E5CC',
        'graphite': '#0F172A',
        'ai-purple': '#7C3AED',
        'energy-orange': '#F97316',
        'offline-red': '#EF4444',
        'online-green': '#22C55E',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #0A84FF, #00E5CC)',
        'ai-gradient': 'linear-gradient(135deg, #7C3AED, #0A84FF)',
        'dark-gradient': 'linear-gradient(180deg, #020617, #0F172A)',
      },
    },
  },
  plugins: [],
}
EOF

# Create CSS file
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-graphite text-gray-100;
    font-family: system-ui, -apple-system, sans-serif;
  }
}

@layer components {
  .btn-primary {
    @apply bg-primary-gradient text-white font-semibold py-3 px-6 rounded-xl 
           hover:opacity-90 transition-all duration-200 active:scale-95
           disabled:opacity-50 disabled:cursor-not-allowed;
  }
  
  .card {
    @apply bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4;
  }
  
  .input-field {
    @apply w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 
           text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 
           focus:ring-fastline-blue focus:border-transparent transition-all;
  }
}
EOF

# Create environment file
cat > .env << 'EOF'
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=JSL FastLine
VITE_APP_VERSION=1.0.0
EOF
