// Store de Ficheros. Compactar o restaurar cambia los datos de todos los módulos: se invalida todo.

import { useQuery } from '@tanstack/react-query';
import { filesService } from '../services/files.service';
import { qk, type Dominio } from './queryKeys';
import { useBusinessMutation } from './useBusinessMutation';

const TODO: readonly Dominio[] = ['menu', 'pedidos', 'clientes', 'catalogo', 'inventario', 'caja', 'domicilios', 'ficheros'];

export const useFicherosQuery = () => useQuery({ queryKey: qk.ficheros, queryFn: () => filesService.describeAll() });

export function useFilesActions({ avisar }: { avisar: (tipo: 'exito' | 'info', aviso: string) => void }) {
    const compactar = useBusinessMutation({
        mutationFn: (nombre: string) => filesService.compact(nombre),
        afecta: TODO,
        onSuccess: (r) => avisar(r.tipo, r.aviso),
    });
    const importar = useBusinessMutation({
        mutationFn: (archivo: File) => filesService.importJson(archivo),
        afecta: TODO,
        onSuccess: (aviso) => avisar('exito', aviso),
    });
    return { compactar, importar };
}
