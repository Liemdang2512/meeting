import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        headers: {
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'credentialless',
        },
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Tăng warning limit vì ffmpeg-wasm lớn - chúng ta đã lazy load rồi
        chunkSizeWarningLimit: 1500,
        rollupOptions: {
          output: {
            // Tách vendor chunks để browser cache riêng từng thư viện
            manualChunks: (id) => {
              // React core - ít thay đổi nhất, cache lâu nhất
              if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
                return 'vendor-react';
              }
              // Google Gemini SDK
              if (id.includes('node_modules/@google')) {
                return 'vendor-gemini';
              }
              // Docx generation - chỉ dùng khi export Word
              if (id.includes('node_modules/docx')) {
                return 'vendor-docx';
              }
              // XLSX - chỉ dùng khi export Excel (đã dynamic import trong App.tsx)
              if (id.includes('node_modules/xlsx')) {
                return 'vendor-xlsx';
              }
            },
          },
        },
      },
    };
});
