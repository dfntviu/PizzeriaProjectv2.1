// Store de Inventario.

import { useQuery } from '@tanstack/react-query';
import { fechaLocal } from '@model/utilidades.js';
import {
    inventoryService, periodoInicial, type ConsultaConsumo, type Periodo, type TipoMovimientoManual,
} from '../services/inventory.service';
import { qk, AFECTA } from './queryKeys';
import { useBusinessMutation } from './useBusinessMutation';
import { useUiState } from './uiState';
import type { LineaReceta, Tamano } from '../types/domain';

export const usePeriodoMovimientos = () => useUiState<Periodo>('inventario:periodo', periodoInicial);
export const useConsultaConsumo = () => useUiState<ConsultaConsumo>('inventario:consumo', () => ({ modo: 'dia', fecha: fechaLocal() }));
export const useRecetaSeleccionada = () =>
    useUiState<{ productoId: string; tamano: Tamano } | null>('inventario:receta', null);

export const useExistenciasQuery = () => useQuery({ queryKey: qk.existencias, queryFn: () => inventoryService.getStock() });
export const useAlertasQuery = () => useQuery({ queryKey: qk.alertas, queryFn: () => inventoryService.getAlerts() });
export const useMovimientosQuery = (p: Periodo) =>
    useQuery({ queryKey: qk.movimientos(p), queryFn: () => inventoryService.getMovements(p) });
export const useConsumoQuery = (c: ConsultaConsumo) =>
    useQuery({ queryKey: qk.consumo(c), queryFn: () => inventoryService.getConsumption(c) });
export const usePizzasQuery = () => useQuery({ queryKey: qk.pizzas, queryFn: () => inventoryService.getPizzas() });
export const useRecetaQuery = (sel: { productoId: string; tamano: Tamano } | null) => useQuery({
    queryKey: qk.receta(sel?.productoId ?? '', sel?.tamano ?? 'mediana'),
    queryFn: () => (sel ? inventoryService.getRecipe(sel.productoId, sel.tamano) : null),
    enabled: Boolean(sel),
});

export function useInventoryActions({ alTerminar }: { alTerminar: (tipo: 'exito' | 'info', aviso: string) => void }) {
    const movimiento = useBusinessMutation({
        mutationFn: ({ tipo, datos }: { tipo: TipoMovimientoManual; datos: { id: string; cantidad: string; motivo: string } }) =>
            inventoryService.registerMovement(tipo, datos),
        afecta: AFECTA.inventario,
        onSuccess: (r) => alTerminar(r.tipo, r.aviso),
    });
    const ingrediente = useBusinessMutation({
        mutationFn: (datos: Record<string, string>) => inventoryService.registerIngredient(datos),
        afecta: AFECTA.inventario,
        onSuccess: (aviso) => alTerminar('exito', aviso),
    });
    const receta = useBusinessMutation({
        mutationFn: ({ productoId, tamano, ingredientes }: { productoId: string; tamano: Tamano; ingredientes: LineaReceta[] }) =>
            inventoryService.saveRecipe(productoId, tamano, ingredientes),
        afecta: AFECTA.inventario,
        onSuccess: (aviso) => alTerminar('exito', aviso),
    });
    return { movimiento, ingrediente, receta };
}
