import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    __FASTAPI_URL__: JSON.stringify(process.env.VITE_FASTAPI_URL),
  },
});