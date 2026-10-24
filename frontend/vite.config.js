import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Khi chạy dev (npm run dev trong frontend/), chuyển /api về backend để không dính CORS.
// Khi chạy thật, Express phục vụ luôn thư mục dist nên cùng một cổng.
const BACKEND = process.env.VITE_BACKEND_URL || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': BACKEND, '/health': BACKEND },
  },
});
