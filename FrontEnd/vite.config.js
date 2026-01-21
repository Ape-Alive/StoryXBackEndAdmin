import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // 加载环境变量
    const env = loadEnv(mode, process.cwd(), '')

    // 是否使用代理
    const useProxy = env.VITE_USE_PROXY === 'true'
    const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:5800'

    return {
        plugins: [vue()],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url))
            }
        },
        server: {
            port: 3000,
            proxy: useProxy
                ? {
                    '/api': {
                        target: apiBaseUrl,
                        changeOrigin: true,
                        secure: false,
                        rewrite: (path) => path.replace(/^\/api/, '/api')
                    }
                }
                : undefined
        },
        build: {
            outDir: 'dist',
            assetsDir: 'assets',
            sourcemap: mode === 'development',
            minify: mode === 'production' ? 'terser' : false,
            chunkSizeWarningLimit: 1000,
            rollupOptions: {
                output: {
                    // 手动分包
                    manualChunks: {
                        'element-plus': ['element-plus'],
                        'vue-vendor': ['vue', 'vue-router', 'pinia']
                    }
                }
            }
        },
        // 定义全局常量
        define: {
            __APP_ENV__: JSON.stringify(env)
        }
    }
})

