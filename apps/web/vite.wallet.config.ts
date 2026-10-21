import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Builds the Privy wallet bridge as an ES module the game page loads from /wallet/wallet.js.
export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: '../../game/dist-web/wallet',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    lib: { entry: 'src/bridge.tsx', formats: ['es'], fileName: () => 'wallet.js' },
    rollupOptions: { output: { chunkFileNames: 'chunks/[name]-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]' } },
  },
})
