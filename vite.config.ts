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
    // 代码分割配置
    rollupOptions: {
      output: {
        // 手动代码分割 - 按功能模块分包
        manualChunks: {
          // 第三方库分包
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-avatar',
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
          ],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-charts': ['recharts'],
          'vendor-date': ['date-fns'],
          'vendor-utils': ['dompurify', 'lucide-react'],
        },
        // 代码块文件名格式
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name || '')) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/\.(css)$/i.test(assetInfo.name || '')) {
            return 'assets/css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    //  chunk 大小警告阈值 (单位: KB)
    chunkSizeWarningLimit: 500,
  },
  esbuild: {
    // 生产环境移除 console 和 debugger
    drop: ['console', 'debugger'],
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

