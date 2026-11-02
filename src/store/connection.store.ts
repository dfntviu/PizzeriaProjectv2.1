// Ciclo de arranque y conexión de la carpeta (antes app.js: iniciar / conectar / pedirCarpeta).
//   presentación (si toca) → ¿navegador compatible? → ¿carpeta recordada con permiso? → conectar.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectionService } from '../services/connection.service';
import { useNotify } from './notifications';

export type EstadoConexion =
    | { fase: 'iniciando' }
    | { fase: 'incompatible' }
    | { fase: 'cargando'; mensaje: string }
    | { fase: 'pedir'; recordada: FileSystemDirectoryHandle | null }
    | { fase: 'lista'; carpeta: string };

const VISTA = 'pizzeria:presentacion-vista';

const debePresentar = (): boolean => {
    if (new URLSearchParams(location.search).has('presentacion')) return true;
    try { return sessionStorage.getItem(VISTA) !== 'si'; } catch { return true; }
};

export function useConnection() {
    const client = useQueryClient();
    const notificar = useNotify();
    const [estado, setEstado] = useState<EstadoConexion>({ fase: 'iniciando' });
    const [presentando, setPresentando] = useState<boolean>(debePresentar);
    const finPresentacion = useRef<(() => void) | null>(null);
    const arrancado = useRef(false);

    const pedirCarpeta = useCallback((recordada: FileSystemDirectoryHandle | null) => setEstado({ fase: 'pedir', recordada }), []);

    const conectar = useCallback(async (handle: FileSystemDirectoryHandle) => {
        setEstado({ fase: 'cargando', mensaje: `Leyendo ${handle.name}/…` });
        try {
            const carpeta = await connectionService.connect(handle);
            client.removeQueries(); // otra carpeta = otros datos: nada de caché previa
            setEstado({ fase: 'lista', carpeta });
        } catch (error) {
            console.error(error);
            pedirCarpeta(null);
            notificar('error', `No se pudo abrir la carpeta: ${(error as Error).message}`);
        }
    }, [client, notificar, pedirCarpeta]);

    const elegir = useCallback(async () => {
        try {
            await conectar(await connectionService.pick());
        } catch (error) {
            if ((error as Error).name !== 'AbortError') notificar('error', (error as Error).message);
        }
    }, [conectar, notificar]);

    const reconectar = useCallback(async (recordada: FileSystemDirectoryHandle) => {
        if (await connectionService.hasPermission(recordada, { pedir: true })) await conectar(recordada);
        else notificar('error', 'Sin permiso de escritura no se pueden guardar los datos.');
    }, [conectar, notificar]);

    const terminarPresentacion = useCallback(() => {
        try { sessionStorage.setItem(VISTA, 'si'); } catch { /* se mostrará de nuevo */ }
        setPresentando(false);
        finPresentacion.current?.();
        finPresentacion.current = null;
    }, []);

    useEffect(() => {
        if (arrancado.current) return; // StrictMode monta dos veces en desarrollo
        arrancado.current = true;
        void (async () => {
            if (debePresentar()) await new Promise<void>((r) => { finPresentacion.current = r; });
            if (!connectionService.isSupported()) {
                setEstado({ fase: 'incompatible' });
                return;
            }
            const recordada = await connectionService.recall();
            if (recordada && (await connectionService.hasPermission(recordada))) await conectar(recordada);
            else pedirCarpeta(recordada);
        })();
    }, [conectar, pedirCarpeta]);

    return {
        estado,
        presentando,
        verPresentacion: () => setPresentando(true),
        terminarPresentacion,
        elegir,
        reconectar,
        cambiarCarpeta: () => pedirCarpeta(null),
    };
}
