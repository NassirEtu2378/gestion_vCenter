import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue(), vueDevTools()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api/vcenter1': {
          target: env.VITE_VCENTER_API_URL,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/vcenter1/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // Log headers being sent to ensure vmware-api-session-id is transmitted
              if (req.headers['vmware-api-session-id']) {
                console.log('[vite-proxy] vcenter1 session header:', req.headers['vmware-api-session-id'])
              }
            })
          },
        },
        '/api/vcenter2': {
          target: env.VITE_VCENTER_API_URL_2,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/vcenter2/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // Log headers being sent - for debugging
              const sessionHeader = req.headers['vmware-api-session-id']
              const path = req.url
              if (sessionHeader) {
                console.log('[vite-proxy] vcenter2 session header:', sessionHeader)
              } else if (path && path.includes('/session')) {
                console.log('[vite-proxy] vcenter2 LOGIN request (no session header expected)')
              } else {
                console.log('[vite-proxy] vcenter2 WARNING: no vmware-api-session-id header for', path)
              }
            })
          },
        },
      },
    },
  }
})
