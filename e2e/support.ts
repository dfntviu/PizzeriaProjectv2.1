// Soporte de las E2E.
//
// showDirectoryPicker abre un diálogo nativo que Playwright no puede operar; se sustituye por una
// carpeta del Origin Private File System, que expone la MISMA interfaz FileSystemDirectoryHandle.
// Así se ejercitan de verdad FileReader, Blob.slice y createWritable del navegador.

import { mkdirSync } from 'node:fs';
import type { BrowserContext, Page } from '@playwright/test';

export const CAPTURAS = process.env.CAPTURAS;
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

export async function prepararContexto(contexto: BrowserContext): Promise<void> {
    await contexto.addInitScript(() => {
        // En headless shell, queryPermission sobre un handle OPFS cierra la pestaña; en Chrome real los
        // handles de showDirectoryPicker lo soportan. Se simula que el usuario ya concedió el permiso.
        const proto = FileSystemHandle.prototype as unknown as Record<string, unknown>;
        proto.queryPermission = async () => 'granted';
        proto.requestPermission = async () => 'granted';
        // Leer de IndexedDB un handle OPFS guardado cierra la pestaña en el Chromium de Playwright.
        // Se guarda una marca y se resuelve al handle real.
        let carpetaE2E: FileSystemDirectoryHandle | null = null;
        void navigator.storage.getDirectory().then((r) => r.getDirectoryHandle('data-e2e', { create: true })).then((h) => { carpetaE2E = h; });
        const poner = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (valor: unknown, clave?: IDBValidKey) {
            return poner.call(this, valor instanceof FileSystemHandle ? '__carpeta_e2e__' : valor, clave);
        };
        const resultado = Object.getOwnPropertyDescriptor(IDBRequest.prototype, 'result')!;
        Object.defineProperty(IDBRequest.prototype, 'result', {
            get() { const v = resultado.get!.call(this); return v === '__carpeta_e2e__' ? carpetaE2E : v; },
        });
        // La presentación se prueba en sus propios casos (?presentacion); en el resto se da por vista.
        if (!location.search.includes('presentacion')) sessionStorage.setItem('pizzeria:presentacion-vista', 'si');
        (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker = async () => {
            const raiz = await navigator.storage.getDirectory();
            return raiz.getDirectoryHandle('data-e2e', { create: true });
        };
    });
}

export function crearAyudantes(p: Page) {
    const esperar = (condicion: boolean, mensaje: string) => { if (!condicion) throw new Error(mensaje); };
    const captura = async (nombre: string, completa = false) => {
        if (!CAPTURAS) return;
        await p.waitForTimeout(800); // deja terminar las animaciones de entrada
        await p.screenshot({ path: `${CAPTURAS}/${nombre}.png`, fullPage: completa });
    };
    const texto = (sel: string) => p.locator(sel).first().innerText();
    const ultimoAviso = async () => (await p.locator('#avisos .aviso').last().innerText()).replace(/×/g, '').trim();
    /** Navega con el riel (React Router) y espera a que la sección esté montada. */
    const ir = async (seccion: 'mostrador' | 'catalogo' | 'inventario' | 'caja' | 'domicilio' | 'ficheros') => {
        await p.click(`#navegacion [data-seccion="${seccion}"]`);
        await p.waitForSelector(`[data-panel="${seccion}"]`);
        await p.waitForTimeout(150);
    };
    const cerrarDialogo = async () => {
        await p.locator('dialog[open] [data-accion="cerrar-dialogo"]').last().click();
    };
    const leerDat = (nombre: string) => p.evaluate(async (n) => {
        const raiz = await navigator.storage.getDirectory();
        const dir = await raiz.getDirectoryHandle('data-e2e');
        const archivo = await (await dir.getFileHandle(`${n}.dat`)).getFile();
        return { size: archivo.size, texto: await archivo.text() };
    }, nombre);
    return { esperar, captura, texto, ultimoAviso, ir, cerrarDialogo, leerDat };
}
