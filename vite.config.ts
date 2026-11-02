import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// La app React reutiliza los modelos de ../src/model (los mismos que prueban las 17 unitarias)
// y los recursos de ../Public (fuentes y fotos) sin copiarlos.
export default defineConfig({
    plugins: [react()],
    publicDir: fileURLToPath(new URL('../Public', import.meta.url)),
    resolve: {
        alias: { '@model': fileURLToPath(new URL('../src/model', import.meta.url)) },
    },
    server: { port: 5173, fs: { allow: ['..'] } },
    preview: { port: 4173 },
    build: { outDir: 'dist', emptyOutDir: true, target: 'es2023' },
});
