import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      // El archivo de entrada de tu librería
      entry: path.resolve(__dirname, 'src/yourlogger-browser.ts'),
      name: 'YourLoggerBrowser', // El nombre de tu librería (para UMD)
      fileName: (format) => `yourlogger-browser.${format}.js`, // Nombres de salida para cada formato
    },
    mptyOutDir: false, // Evita que Vite elimine los archivos preexistentes en "dist"
    rollupOptions: {
      output: [
        {
          format: 'es', // Genera un bundle en formato ESM
          entryFileNames: `yourlogger-browser.esm.js`,
          sourcemap: true, // Incluye sourcemaps
        },
        {
          format: 'umd', // Genera un bundle en formato UMD
          name: 'YourLoggerBrowser', // El nombre de la librería (para UMD)
          entryFileNames: `yourlogger-browser.umd.js`,
          sourcemap: true, // Incluye sourcemaps
        },
      ],
    },
  },
});
