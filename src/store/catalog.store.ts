// Store del Catálogo.

import { useQuery } from '@tanstack/react-query';
import { catalogService, type DatosProducto, type FiltroCatalogo } from '../services/catalog.service';
import { qk, AFECTA } from './queryKeys';
import { useBusinessMutation } from './useBusinessMutation';
import { useUiState } from './uiState';
import type { Producto } from '../types/domain';

export const useFiltroCatalogo = () => useUiState<FiltroCatalogo>('catalogo:filtro', 'todos');

export const useCatalogoQuery = (filtro: FiltroCatalogo) =>
    useQuery({ queryKey: qk.catalogo(filtro), queryFn: () => catalogService.getCatalog(filtro) });

export function useCatalogActions({ alGuardar }: { alGuardar: (categoria: Producto['categoria'] | null, aviso: string) => void }) {
    const registrar = useBusinessMutation({
        mutationFn: (datos: DatosProducto) => catalogService.register(datos),
        afecta: AFECTA.catalogo,
        onSuccess: ({ producto, aviso }) => alGuardar(producto.categoria, aviso),
    });
    const editar = useBusinessMutation({
        mutationFn: ({ id, datos }: { id: string; datos: DatosProducto }) => catalogService.update(id, datos),
        afecta: AFECTA.catalogo,
        onSuccess: (p) => alGuardar(null, `${p.nombre} actualizado. Los pedidos anteriores conservan su precio.`),
    });
    const disponibilidad = useBusinessMutation({
        mutationFn: ({ id, activo }: { id: string; activo: boolean }) => catalogService.setActive(id, activo),
        afecta: AFECTA.catalogo,
    });
    return { registrar, editar, disponibilidad };
}
