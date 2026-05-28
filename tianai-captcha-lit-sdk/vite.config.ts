import minifyHTMLLiterals from '@lit-labs/rollup-plugin-minify-html-literals';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [minifyHTMLLiterals()],
  build: {
    sourcemap: true,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'tianai-captcha-lit-sdk.js'
    },
    rollupOptions: {
      external: [/^lit(\/.*)?$/]
    }
  }
});
