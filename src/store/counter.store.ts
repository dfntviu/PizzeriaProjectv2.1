// Store del Mostrador: consultas y mutaciones del pedido + estado de interfaz que antes vivía
// en ClienteController (pedidoActivoId, clienteConsultado) y ClienteView (categoría).

import { useQuery } from '@tanstack/react-query';
import { ordersService, type CambioLinea, type NuevaLinea, type NuevoPedido } from '../services/orders.service';
import { qk, AFECTA } from './queryKeys';
import { useBusinessMutation } from './useBusinessMutation';
import { useUiState } from './uiState';
import type { Categoria, Domicilio, Pedido, Verificacion } from '../types/domain';

export const usePedidoActivo = () => useUiState<string | null>('mostrador:pedidoActivo', null);
export const useCategoriaMenu = () => useUiState<Categoria>('mostrador:categoria', 'pizza');
export const useClienteConsultado = () => useUiState<string>('mostrador:cliente', '');

export const useMenuQuery = () => useQuery({ queryKey: qk.menu, queryFn: () => ordersService.getMenu() });

export const useComandaQuery = (pedidoId: string | null) =>
    useQuery({ queryKey: qk.comanda(pedidoId), queryFn: () => ordersService.getComanda(pedidoId) });

export const usePedidosHoyQuery = () => useQuery({ queryKey: qk.pedidosHoy, queryFn: () => ordersService.listToday() });

export const useClientesQuery = () => useQuery({ queryKey: qk.clientes, queryFn: () => ordersService.listClients() });

export const useHistorialQuery = (clienteId: string) => useQuery({
    queryKey: qk.historial(clienteId),
    queryFn: () => ordersService.getClientHistory(clienteId),
    enabled: Boolean(clienteId),
});

interface Callbacks {
    onFaltantes: (v: Verificacion) => void;
}

export function useCounterActions({ onFaltantes }: Callbacks) {
    const [pedidoActivo, setPedidoActivo] = usePedidoActivo();

    const crear = useBusinessMutation({
        mutationFn: (datos: NuevoPedido) => ordersService.createOrder(datos),
        afecta: AFECTA.crearPedido,
        onSuccess: (pedido: Pedido) => setPedidoActivo(pedido.id),
    });

    const agregar = useBusinessMutation({
        mutationFn: (linea: NuevaLinea) => ordersService.addLine(pedidoActivo, linea),
        afecta: AFECTA.editarLineas,
        onFaltantes,
    });

    const editar = useBusinessMutation({
        mutationFn: (cambio: CambioLinea) => ordersService.updateLine(pedidoActivo, cambio),
        afecta: AFECTA.editarLineas,
        onFaltantes,
    });

    const confirmar = useBusinessMutation({
        mutationFn: () => ordersService.confirmOrder(pedidoActivo),
        afecta: AFECTA.confirmarPedido,
        onSuccess: () => setPedidoActivo(null),
        onFaltantes,
    });

    const cancelar = useBusinessMutation({
        mutationFn: ({ id, motivo }: { id: string; motivo: string }) => ordersService.cancelOrder(id, motivo),
        afecta: AFECTA.cancelarPedido,
        onSuccess: (_r, { id }) => setPedidoActivo((actual) => (actual === id ? null : actual)),
    });

    return { pedidoActivo, setPedidoActivo, crear, agregar, editar, confirmar, cancelar };
}

export type ResultadoConfirmacion = { pedido: Pedido; domicilio: Domicilio | null };
