/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        bg2: '#111118',
        bg3: '#1a1a28',
        red: '#e50914',
        gold: '#f5c518',
        text: '#f0f0f0',
        muted: '#888888',
        white: '#ffffff',
      },
      fontFamily: {
        bebas: ["BebasNeue_400Regular"],
        nunito: ["Nunito_400Regular"],
        cairo: ["Cairo_700Bold"],
      },
    },
  },
  plugins: [],
};
