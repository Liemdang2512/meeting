import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: env.BACKEND_URL || 'http://localhost:3001',
            changeOrigin: true,
          },
        },
      },
      plugins: [
        react(),
        // Nén Brotli (~65–75% nhỏ hơn so với gzip) — dùng khi server hỗ trợ Accept-Encoding: br
        viteCompression({ algorithm: 'brotliCompress', ext: '.br', threshold: 1024 }),
        // Nén Gzip — fallback cho server/CDN không hỗ trợ Brotli
        viteCompression({ algorithm: 'gzip', ext: '.gz', threshold: 1024 }),
        {
          name: 'coep-per-route',
          configureServer(server) {
            server.middlewares.use((_req, res, next) => {
              const url = _req.url ?? '';
              // /home không cần ffmpeg nên không set COEP — cho phép embed YouTube
              if (!url.startsWith('/home')) {
                res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
                res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
              }
              next();
            });
          },
        },
      ],
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
              if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
                return 'vendor-react';
              }
              // Google Gemini SDK
              if (id.includes('node_modules/@google')) {
                return 'vendor-gemini';
              }
              // Mindmap canvas — nặng (~500KB), chỉ dùng ở /mindmap
              if (id.includes('node_modules/@xyflow')) {
                return 'vendor-xyflow';
              }
              // Icon library — dùng rộng rãi nhưng ít thay đổi
              if (id.includes('node_modules/lucide-react')) {
                return 'vendor-lucide';
              }
              // Markdown rendering — chỉ dùng khi hiển thị kết quả
              if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark') || id.includes('node_modules/rehype')) {
                return 'vendor-markdown';
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
