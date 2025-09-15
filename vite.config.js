import { defineConfig } from 'vite'

export default defineConfig({
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      input: {
        main: './index.html',
        library: './library/library.html' // Add other HTML pages as needed
      }
    }
  },
  
  // Development server configuration
  server: {
    port: 3000,
    open: true
  },
  
  // Environment variables
  define: {
    // Ensure environment variables are properly defined
    'import.meta.env.VITE_FASTAPI_URL': JSON.stringify(process.env.VITE_FASTAPI_URL || 'https://bms-8ey2.onrender.com')
  },
  
  // Base path for deployment
  base: './',
  
  // Public directory
  publicDir: 'public'
})