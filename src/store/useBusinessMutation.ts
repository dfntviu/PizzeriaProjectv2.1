// Mutación de negocio con el patrón común de la app:
//   · Bloqueo de reentrada SÍNCRONO (ref): un doble clic no dispara dos escrituras. isPending de
//     TanStack llega con un render de retraso, y el segundo clic de un dblclick puede adelantarse.
//   · Tras escribir, invalida los dominios afectados y ESPERA a que se relean (la vista ya está al
//     día cuando aparece el aviso).
//   · Los errores se traducen (errors.ts): faltantes de inventario → diálogo; el resto → aviso.
// Sustituye a VistaBase.#ocupar (aria-busy) + Controller/ejecutar.js de v2.1.0.

import { useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { traducirError } from '../services/errors';
import { invalidar } from './queryClient';
import { useNotify } from './notifications';
import type { Dominio } from './queryKeys';
import type { Verificacion } from '../types/domain';

interface Opciones<V, R> {
    mutationFn: (variables: V) => Promise<R>;
    afecta: readonly Dominio[];
    onSuccess?: (resultado: R, variables: V) => void;
    /** Si se indica, los faltantes de inventario abren el diálogo en lugar de un aviso. */
    onFaltantes?: (verificacion: Verificacion) => void;
}

export interface Accion<V, R> {
    /** Ejecuta la mutación. Devuelve null si falló o si ya había una en curso. */
    run: (variables: V) => Promise<R | null>;
    isPending: boolean;
}

export function useBusinessMutation<V, R>({ mutationFn, afecta, onSuccess, onFaltantes }: Opciones<V, R>): Accion<V, R> {
    const client = useQueryClient();
    const notificar = useNotify();
    const enCurso = useRef(false);

    const mutacion = useMutation<R, unknown, V>({
        mutationFn,
        onSuccess: async (resultado, variables) => {
            await invalidar(client, afecta);
            onSuccess?.(resultado, variables);
        },
        onError: async (error) => {
            await invalidar(client, afecta); // el servidor (hoy, el modelo) siempre gana: se relee
            const t = traducirError(error);
            if (t.tipo === 'faltantes' && onFaltantes) onFaltantes(t.verificacion);
            else notificar('error', t.tipo === 'faltantes' ? 'Inventario insuficiente.' : t.mensaje);
        },
    });

    const { mutateAsync } = mutacion;
    const run = useCallback(async (variables: V): Promise<R | null> => {
        if (enCurso.current) return null;
        enCurso.current = true;
        try {
            return await mutateAsync(variables);
        } catch {
            return null; // ya se notificó en onError
        } finally {
            enCurso.current = false;
        }
    }, [mutateAsync]);

    return { run, isPending: mutacion.isPending };
}

/** Lectura puntual que puede fallar con un error de negocio (p. ej. «ya no está pendiente»). */
export function useSafeRead() {
    const notificar = useNotify();
    return useCallback(<T,>(leer: () => T): T | null => {
        try {
            return leer();
        } catch (error) {
            const t = traducirError(error);
            notificar('error', t.tipo === 'mensaje' ? t.mensaje : 'Inventario insuficiente.');
            return null;
        }
    }, [notificar]);
}
