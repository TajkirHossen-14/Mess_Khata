/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy900: '#0B1F3A',
        navy800: '#12345B',
        blue700: '#2563A6',
        blue600: '#347FC1',
        blue400: '#6EA8D8',
        blue300: '#9CC8E8',
        iceblue100: '#DCECF8',
        iceblue50: '#F3F8FC',
        white: '#FFFFFF',
        darktext: '#172B3F',
        secondarytext: '#425B70',
        mutedtext: '#63778A',
        pending: '#C99A3E',
        rejected: '#A44747',
        success: '#347FC1',
      },
      fontFamily: {
        heading: ['Sora', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        control: '12px',
      },
    },
  },
  plugins: [],
}