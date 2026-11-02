// Formatos y etiquetas de presentación (antes en View/plantilla.js).
// El escape contra XSS ya no hace falta aquí: React escapa todo texto interpolado en JSX.

import type { Categoria, MetodoPago, Tamano } from '../types/domain';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const formatoNumero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });
const formatoFechaHora = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
const formatoHora = new Intl.DateTimeFormat('es-MX', { timeStyle: 'short' });
const formatoDia = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });

export const moneda = (n: unknown): string => formatoMoneda.format(Number(n) || 0);
export const numero = (n: unknown): string => formatoNumero.format(Number(n) || 0);
export const fechaHora = (iso: string | null | undefined): string => (iso ? formatoFechaHora.format(new Date(iso)) : '—');
export const hora = (iso: string | null | undefined): string => (iso ? formatoHora.format(new Date(iso)) : '—');
export const dia = (fechaTexto: string): string => {
    const [a = 0, m = 1, d = 1] = fechaTexto.split('-').map(Number);
    return formatoDia.format(new Date(a, m - 1, d));
};
export const dosDigitos = (n: number | null | undefined): string => String(n ?? '').padStart(2, '0');

export const ETIQUETA_CATEGORIA: Record<Categoria, string> = { pizza: 'Pizzas', bebida: 'Bebidas', helado: 'Helados' };
export const SINGULAR_CATEGORIA: Record<Categoria, string> = { pizza: 'Pizza', bebida: 'Bebida', helado: 'Helado' };
export const ETIQUETA_TAMANO: Record<Tamano, string> = { chica: 'Chica', mediana: 'Mediana', grande: 'Grande' };
export const ETIQUETA_METODO: Record<MetodoPago, string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
export const TAMANOS: Tamano[] = ['chica', 'mediana', 'grande'];
export const CATEGORIAS: Categoria[] = ['pizza', 'bebida', 'helado'];

export const etiquetaTamano = (t: Tamano | '' | null | undefined): string => (t ? ETIQUETA_TAMANO[t] : '');

/** Lee un <form> como objeto plano (los números quedan como texto; los valida el modelo). */
export const leerFormulario = (form: HTMLFormElement): Record<string, string> =>
    Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, String(v)]));
