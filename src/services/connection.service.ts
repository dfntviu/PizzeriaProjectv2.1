// Conexión de la carpeta de datos (File System Access API). Solo existe mientras la
// persistencia sean los ficheros .dat; en F2 la reemplaza el inicio de sesión de Supabase Auth.

import { soportaCarpetas, recuperarCarpeta, elegirCarpeta, tienePermiso } from '@model/CarpetaDatos.js';
import { ESTABLECIMIENTO } from '@model/establecimiento.js';
import { loadAllModels, repository } from './system';
import type { Establecimiento } from '../types/domain';

type Handle = FileSystemDirectoryHandle;

export const connectionService = {
    isSupported: (): boolean => soportaCarpetas(),

    /** Carpeta recordada en IndexedDB (o null). */
    recall: async (): Promise<Handle | null> => (await recuperarCarpeta()) as Handle | null,

    hasPermission: (handle: Handle, opciones?: { pedir?: boolean }): Promise<boolean> => tienePermiso(handle, opciones),

    /** Abre el selector nativo (requiere gesto del usuario). */
    pick: async (): Promise<Handle> => (await elegirCarpeta()) as Handle,

    /** Conecta la carpeta y carga los modelos. Si falla, deja el repositorio desconectado. */
    async connect(handle: Handle): Promise<string> {
        repository.conectarCarpeta(handle);
        try {
            await loadAllModels();
        } catch (error) {
            repository.conectarCarpeta(null);
            throw error;
        }
        return handle.name;
    },

    folderName: (): string => repository.directorio?.name ?? '',
};

/** Datos ficticios del local. Las rutas de las fotos se adaptan a Vite (Public/ se sirve en la raíz). */
export const establecimiento: Establecimiento = {
    ...(ESTABLECIMIENTO as Establecimiento),
    fotos: (ESTABLECIMIENTO as Establecimiento).fotos.map((f) => ({ ...f, src: `${import.meta.env.BASE_URL}${f.src.replace(/^Public\//, '')}` })),
};
