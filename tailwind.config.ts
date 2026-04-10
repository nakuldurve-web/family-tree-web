import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        tan: {
          50: '#fdf8f0',
          100: '#faefd8',
          200: '#f5ddb0',
          300: '#edc87e',
          400: '#e3ad4e',
          500: '#d9922a',
          600: '#c47520',
          700: '#a35a1b',
          800: '#84471c',
          900: '#6c3b1a',
        },
        honeydew: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
        },
      },
    },
  },
  plugins: [],
};

export default config;
