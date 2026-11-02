// Store de Caja.

import { useQuery } from '@tanstack/react-query';
import { fechaLocal, sumarDias } from '@model/utilidades.js';
import { cashierService } from '../services/cashier.service';
import type { Periodo } from '../services/inventory.service';
import { qk, AFECTA } from './queryKeys';
import { useBusinessMutation } from './useBusinessMutation';
import { useUiState } from './uiState';
import type { Cierre, MetodoPago, Venta } from '../types/domain';

export const useFechaCaja = () => useUiState<string>('caja:fecha', () => fechaLocal());
export const useSemanaCaja = () => useUiState<string>('caja:semana', () => fechaLocal());
export const usePeriodoMasVendidos = () =>
    useUiState<Periodo>('caja:masVendidos', () => ({ inicio: sumarDias(fechaLocal(), -6), fin: fechaLocal() }));

export const usePorCobrarQuery = () => useQuery({ queryKey: qk.porCobrar, queryFn: () => cashierService.getPending() });
export const useCorteQuery = (fecha: string) => useQuery({ queryKey: qk.corte(fecha), queryFn: () => cashierService.getDailyReport(fecha) });
export const useSemanaQuery = (fecha: string) => useQuery({ queryKey: qk.semana(fecha), queryFn: () => cashierService.getWeeklyReport(fecha) });
export const useMasVendidosQuery = (p: Periodo) =>
    useQuery({ queryKey: qk.masVendidos(p), queryFn: () => cashierService.getTopSellers(p.inicio, p.fin) });

export function useCashierActions(callbacks: {
    alCobrar: (venta: Venta, advertencia: string | null) => void;
    alCerrar: (cierre: Cierre) => void;
}) {
    const cobrar = useBusinessMutation({
        mutationFn: ({ pedidoId, metodo, recibido }: { pedidoId: string; metodo: MetodoPago; recibido: number | null }) =>
            cashierService.charge(pedidoId, metodo, recibido),
        afecta: AFECTA.cobrar,
        onSuccess: ({ venta, advertencia }) => callbacks.alCobrar(venta, advertencia),
    });
    const cerrar = useBusinessMutation({
        mutationFn: (fecha: string) => cashierService.closeDay(fecha),
        afecta: AFECTA.cerrarCaja,
        onSuccess: (cierre) => callbacks.alCerrar(cierre),
    });
    return { cobrar, cerrar };
}
