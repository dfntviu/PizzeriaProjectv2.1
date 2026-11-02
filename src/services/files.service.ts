// Servicio de Ficheros (antes FicherosController): estado de cada .dat, acceso directo por
// posición (Blob.slice + FileReader), compactación y respaldos. Su destino se decide en D7 (F5).

import { ESQUEMAS } from '@model/esquemas.js';
import { loadAllModels, repository } from './system';
import type { CampoEsquema, DescripcionFichero, RegistroLeido } from '../types/domain';

const esquemas = ESQUEMAS as Record<string, { campos: CampoEsquema[] }>;

export const filesService = {
    names: (): string[] => Object.keys(esquemas),

    fieldsOf: (nombre: string): CampoEsquema[] => esquemas[nombre]?.campos ?? [],

    async describeAll(): Promise<{ carpeta: string; ficheros: DescripcionFichero[] }> {
        const ficheros: DescripcionFichero[] = [];
        for (const nombre of Object.keys(esquemas)) {
            ficheros.push({ nombre, campos: esquemas[nombre]!.campos, ...(await repository.describirFichero(nombre)) });
        }
        return { carpeta: repository.directorio?.name ?? '', ficheros };
    },

    readAt(nombre: string, posicion: number): Promise<RegistroLeido | null> {
        return repository.reposicionarLectura(nombre, posicion);
    },

    async compact(nombre: string): Promise<{ tipo: 'exito' | 'info'; aviso: string }> {
        const r = await repository.compactarFichero(nombre);
        await loadAllModels(); // los modelos vuelven a leer los ficheros
        return r.liberados
            ? { tipo: 'exito', aviso: `${nombre}.dat compactado: ${r.liberados} hueco(s), ${r.bytesLiberados} bytes liberados.` }
            : { tipo: 'info', aviso: `${nombre}.dat no tenía registros borrados.` };
    },

    exportJson: (nombre: string) => repository.exportarJSON(nombre),

    async importJson(archivo: File): Promise<string> {
        const r = await repository.importarJSON(archivo);
        await loadAllModels();
        return `${r.nombre}.dat restaurado con ${r.registros} registro(s).`;
    },
};
