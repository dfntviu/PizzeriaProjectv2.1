// Estado de interfaz que sobrevive al cambio de ruta: pedido activo, filtros y fechas elegidas.
// En v2.1.0 lo guardaban los controladores (this.pedidoActivoId, this.fecha, this.filtro…).
// No es estado del servidor, así que no va en TanStack Query: es un almacén mínimo con
// useSyncExternalStore. Si crece, se sustituye por Zustand sin tocar las vistas.

import { useCallback, useSyncExternalStore } from 'react';

const valores = new Map<string, unknown>();
const oyentes = new Set<() => void>();

const suscribir = (fn: () => void) => {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
};

export function setUiState<T>(clave: string, valor: T): void {
    valores.set(clave, valor);
    oyentes.forEach((fn) => fn());
}

/** Como useState, pero el valor persiste entre rutas mientras la pestaña esté abierta. */
export function useUiState<T>(clave: string, inicial: T | (() => T)): [T, (valor: T | ((previo: T) => T)) => void] {
    if (!valores.has(clave)) valores.set(clave, typeof inicial === 'function' ? (inicial as () => T)() : inicial);
    const valor = useSyncExternalStore(suscribir, () => valores.get(clave) as T);
    const asignar = useCallback((nuevo: T | ((previo: T) => T)) => {
        const previo = valores.get(clave) as T;
        setUiState(clave, typeof nuevo === 'function' ? (nuevo as (p: T) => T)(previo) : nuevo);
    }, [clave]);
    return [valor, asignar];
}
