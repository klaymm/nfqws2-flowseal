import tsrConfig from './tsr.config.json';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => ({
  base: '/',
  server:
    mode === 'staging'
      ? {
          proxy: {
            '/index.php': {
              target: 'http://192.168.1.1:90',
              changeOrigin: true,
            },
          },
        }
      : {},
  build: {
    outDir: '../www',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
      },
    },
    sourcemap: false,
  },
  plugins: [
    tanstackRouter({
      ...tsrConfig,
      target: tsrConfig.target as 'react',
      quoteStyle: tsrConfig.quoteStyle as 'single',
      autoCodeSplitting: true,
    }),
    tsconfigPaths(),
    react(),
  ],
}));
