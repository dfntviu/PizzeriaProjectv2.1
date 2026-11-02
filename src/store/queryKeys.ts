// Fábrica de llaves de TanStack Query (informe 6.2): una sola fuente para leer e invalidar.
// El primer elemento de cada llave es su «dominio»: invalidar un dominio refresca todas sus consultas.

import type { Tamano } from '../types/domain';
import type { FiltroCatalogo } from '../services/catalog.service';
import type { ConsultaConsumo, Periodo } from '../services/inventory.service';

export const qk = {
    menu: ['menu'] as const,
    comanda: (pedidoId: string | null) => ['pedidos', 'comanda', pedidoId] as const,
    pedidosHoy: ['pedidos', 'hoy'] as const,
    clientes: ['clientes'] as const,
    historial: (clienteId: string) => ['clientes', 'historial', clienteId] as const,

    catalogo: (filtro: FiltroCatalogo) => ['catalogo', filtro] as const,

    existencias: ['inventario', 'existencias'] as const,
    alertas: ['inventario', 'alertas'] as const,
    movimientos: (p: Periodo) => ['inventario', 'movimientos', p.inicio, p.fin] as const,
    consumo: (c: ConsultaConsumo) => ['inventario', 'consumo', c.modo, c.fecha] as const,
    pizzas: ['inventario', 'pizzas'] as const,
    receta: (productoId: string, tamano: Tamano) => ['inventario', 'receta', productoId, tamano] as const,

    porCobrar: ['caja', 'por-cobrar'] as const,
    corte: (fecha: string) => ['caja', 'corte', fecha] as const,
    semana: (fecha: string) => ['caja', 'semana', fecha] as const,
    masVendidos: (p: Periodo) => ['caja', 'mas-vendidos', p.inicio, p.fin] as const,

    domicilios: ['domicilios', 'hoy'] as const,
    domiciliosDia: (fecha: string) => ['domicilios', 'dia', fecha] as const,
    domiciliosSemana: (fecha: string) => ['domicilios', 'semana', fecha] as const,

    ficheros: ['ficheros'] as const,
};

export type Dominio = 'menu' | 'pedidos' | 'clientes' | 'catalogo' | 'inventario' | 'caja' | 'domicilios' | 'ficheros';

/**
 * Qué dominios toca cada caso de uso. Es la misma tabla que en F4 aplicarán los eventos de
 * Realtime (informe 7.3); hoy la aplica la propia pestaña tras cada escritura.
 */
export const AFECTA = {
    crearPedido: ['pedidos', 'clientes', 'domicilios', 'ficheros'],
    editarLineas: ['pedidos', 'ficheros'],
    confirmarPedido: ['pedidos', 'menu', 'inventario', 'catalogo', 'caja', 'domicilios', 'ficheros'],
    cancelarPedido: ['pedidos', 'clientes', 'menu', 'inventario', 'catalogo', 'caja', 'domicilios', 'ficheros'],
    catalogo: ['catalogo', 'menu', 'inventario', 'ficheros'],
    inventario: ['inventario', 'menu', 'catalogo', 'ficheros'],
    cobrar: ['caja', 'pedidos', 'clientes', 'ficheros'],
    cerrarCaja: ['caja', 'ficheros'],
    entrega: ['domicilios', 'pedidos', 'clientes', 'ficheros'],
} as const satisfies Record<string, readonly Dominio[]>;
