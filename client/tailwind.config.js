/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        navy900: '#0B1F3A',
        navy800: '#12345B',
        blue700: '#2563A6',
        blue600: '#347FC1',
        blue400: '#6EA8D8',
        sky300: '#9CC8E8',
        ice100: '#DCECF8',
        ice50: '#F3F8FC',
        white: '#FFFFFF',
        darkText: '#172B3F',
        secondaryText: '#425B70',
        mutedText: '#63778A',
        statusPending: '#C99A3E',
        statusError: '#A44747',
        statusSuccess: '#347FC1'
      },
      fontFamily: {
        heading: ['Sora', 'sans-serif'],
        body: ['Inter', 'sans-serif']
      },
      borderRadius: {
        card: '16px',
        panel: '20px',
        control: '12px',
        compact: '14px'
      }
    }
  }
}