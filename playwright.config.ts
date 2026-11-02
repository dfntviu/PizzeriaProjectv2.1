import { defineConfig, devices } from '@playwright/test';

// Los 21 casos corren DOS veces: contra el paquete de producción (vite build + vite preview) y contra
// el servidor de desarrollo. Desarrollo activa StrictMode, que ejecuta cada efecto dos veces: ahí
// aparecen fallos que producción no muestra (p. ej., los diálogos que se cerraban solos).
// Cada proyecto usa otro puerto = otro origen = su propia carpeta OPFS: no se pisan los datos.
// Los 21 casos forman UNA historia sobre la misma carpeta de datos: corren en serie, en un worker.
export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 30_000,
    expect: { timeout: 5_000 },
    reporter: [['list']],
    use: {
        viewport: { width: 1440, height: 900 },
        locale: 'es-MX',
        timezoneId: 'America/Mexico_City',
        trace: 'retain-on-failure',
    },
    projects: [
        { name: 'produccion', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: 'http://localhost:4173' } },
        { name: 'desarrollo', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: 'http://localhost:5173' } },
    ],
    webServer: [
        {
            command: 'npm run build && npx vite preview --port 4173 --strictPort',
            url: 'http://localhost:4173',
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
        {
            command: 'npx vite --port 5173 --strictPort',
            url: 'http://localhost:5173',
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
    ],
});
