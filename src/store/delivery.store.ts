// Store de Domicilio.

import { useQuery } from '@tanstack/react-query';
import { fechaLocal } from '@model/utilidades.js';
import { deliveryService } from '../services/delivery.service';
import { qk, AFECTA } from './queryKeys';
import { useBusinessMutation } from './useBusinessMutation';
import { useUiState } from './uiState';
import type { Domicilio } from '../types/domain';

/**
 * Los minutos del plazo se recalculan cada 30 s mientras la vista está montada (como el
 * setInterval de v2.1.0). En F4 los cambios de estado llegan por Realtime y esto queda solo
 * como reloj de presentación (informe 7.1).
 */
const REFRESCO_MS = 30_000;

export const useFechaDomicilio = () => useUiState<string>('domicilio:fecha', () => fechaLocal());
export const useSemanaDomicilio = () => useUiState<string>('domicilio:semana', () => fechaLocal());

export const useDomiciliosQuery = () =>
    useQuery({ queryKey: qk.domicilios, queryFn: () => deliveryService.listToday(), refetchInterval: REFRESCO_MS });
export const useDomicilioDiaQuery = (fecha: string) =>
    useQuery({ queryKey: qk.domiciliosDia(fecha), queryFn: () => deliveryService.getDailyStats(fecha) });
export const useDomicilioSemanaQuery = (fecha: string) =>
    useQuery({ queryKey: qk.domiciliosSemana(fecha), queryFn: () => deliveryService.getWeeklyStats(fecha) });

export function useDeliveryActions({ alRegistrar }: { alRegistrar: (d: Domicilio, advertencia: string | null) => void }) {
    const registrar = useBusinessMutation({
        mutationFn: ({ pedidoId, entregado, motivo }: { pedidoId: string; entregado: boolean; motivo: string }) =>
            deliveryService.registerDelivery(pedidoId, { entregado, motivo }),
        afecta: AFECTA.entrega,
        onSuccess: ({ domicilio, advertencia }) => alRegistrar(domicilio, advertencia),
    });
    return { registrar };
}
