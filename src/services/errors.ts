// Traducción de errores para la interfaz (equivale a Controller/ejecutar.js de v2.1.0).
// Un error nunca rompe la interfaz: se convierte en aviso o, si trae faltantes de inventario,
// en el diálogo «Inventario insuficiente».

import { ErrorDeNegocio as ErrorDeNegocioJs } from '@model/utilidades.js';
import type { Verificacion } from '../types/domain';

// El constructor JS declara `detalle = null`; aquí se tipa como lo que realmente acepta.
const ErrorDeNegocio = ErrorDeNegocioJs as unknown as new (mensaje: string, detalle?: unknown) => Error;

const ESPERADOS = new Set(['ErrorDeNegocio', 'ErrorDeRepositorio']);

export type ErrorTraducido =
    | { tipo: 'faltantes'; verificacion: Verificacion }
    | { tipo: 'mensaje'; mensaje: string };

/** Error de negocio que lleva el detalle de faltantes (lo lanza el servicio antes de escribir nada). */
export function errorDeFaltantes(verificacion: Verificacion): Error {
    return new ErrorDeNegocio('Inventario insuficiente', verificacion);
}

export function errorDeNegocio(mensaje: string): Error {
    return new ErrorDeNegocio(mensaje);
}

export function traducirError(error: unknown): ErrorTraducido {
    const e = error as { name?: string; message?: string; detalle?: Partial<Verificacion> | null } | null;
    if (e?.detalle?.faltantes) {
        return { tipo: 'faltantes', verificacion: { disponible: false, faltantes: e.detalle.faltantes, sinReceta: e.detalle.sinReceta ?? [] } };
    }
    if (e?.name && ESPERADOS.has(e.name)) return { tipo: 'mensaje', mensaje: e.message ?? 'Error' };
    if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') {
        return { tipo: 'mensaje', mensaje: 'El navegador retiró el permiso sobre la carpeta de datos. Recarga y vuelve a conectarla.' };
    }
    console.error(error);
    return { tipo: 'mensaje', mensaje: e?.message || 'Ocurrió un error inesperado.' };
}
