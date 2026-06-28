import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    host: '0.0.0.0', // 모든 네트워크 인터페이스에서 접속 가능
    port: 5173,
    strictPort: false,
    open: true
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        cover: resolve(__dirname, 'cover.html'),
        'teacher-dashboard': resolve(__dirname, 'teacher-dashboard.html'),
      },
    },
  },
});
