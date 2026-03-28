import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // 避免使用 eval
    target: 'es2020',
  },
  server: {
    proxy: {
      // 代理国家图书馆 OPAC，解决浏览器跨域问题
      '/api/nlc': {
        target: 'http://opac.nlc.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nlc/, '/F'),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9',
        },
      },
    },
  },
});

