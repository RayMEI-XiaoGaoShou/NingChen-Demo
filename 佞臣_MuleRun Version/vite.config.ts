import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    base: './',
    server: {
        proxy: {
            // 代理 AI API 请求，绕过 CORS
            '/api/ai': {
                target: 'https://api.deepseek.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/ai/, ''),
                secure: true,
            },
        },
    },
})
