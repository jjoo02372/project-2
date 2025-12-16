import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0', // 모든 네트워크 인터페이스에서 접속 가능
    port: 5173,
    strictPort: false,
    open: true
  }
});

