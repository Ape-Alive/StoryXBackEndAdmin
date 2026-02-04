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
            host: '0.0.0.0', // 允许外部访问，可通过局域网 IP 访问
            port: 3008,
            hmr: {
                // 热更新配置
                overlay: true, // 显示错误覆盖层
                clientPort: 3008 // HMR 客户端端口
            },
            watch: {
                // 监听文件变化
                usePolling: false, // 使用轮询（某些文件系统需要）
                interval: 500, // 轮询间隔（ms）
                // 忽略某些文件，提高性能
                ignored: ['**/node_modules/**', '**/.git/**']
            },
            proxy: useProxy
                ? {
                    '/api': {
                        target: apiBaseUrl,
                        changeOrigin: true,
                        secure: false,
                        rewrite: path => path.replace(/^\/api/, '/api')
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
