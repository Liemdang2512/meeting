/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './**/*.{ts,tsx}',
    '!./node_modules/**',
    '!./dist/**',
  ],
  corePlugins: {
    preflight: false, // Tắt CSS reset để không vỡ UI cũ
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
