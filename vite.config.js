import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    define: {
      __FASTAPI_URL__: JSON.stringify(env.VITE_FASTAPI_URL),
    },
  };
});