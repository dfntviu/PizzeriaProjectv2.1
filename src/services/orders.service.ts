// Servicio del Mostrador: casos de uso del pedido (antes ClienteController).
// Sin estado de interfaz: el pedido activo lo guarda el Store y llega como argumento.
// Coordina Pedido + Catálogo + Inventario + Domicilio (los modelos no se conocen entre sí).
// En F2 cada escritura pasa a ser una RPC (confirmar_pedido, cancelar_pedido…) con las mismas firmas.

import { fechaLocal } from '@model/utilidades.js';
import { models } from './system';
import { errorDeFaltantes, errorDeNegocio } from './errors';
import type {
    Cliente, Domicilio, Menu, Pedido, PedidoConEntrega, ResumenCliente, Tamano, TotalesPedido,
} from '../types/domain';
import type { LineaVerificable } from '../types/models';

const TAMANOS: Tamano[] = ['chica', 'mediana', 'grande'];

export interface Comanda {
    pedido: Pedido;
    totales: TotalesPedido;
    domicilio: Domicilio | null;
}

export interface NuevoPedido {
    nombre: string;
    telefono?: string;
    domicilio?: boolean;
    direccion?: string;
    referencias?: string;
}

export interface NuevaLinea {
    productoId: string;
    tamano?: Tamano | null;
    cantidad: number;
}

export type CambioLinea = { detalleId: string; cantidad: number } | { detalleId: string; eliminar: true };

const lineas = (pedido: Pedido | null): LineaVerificable[] =>
    (pedido?.detalles ?? []).map((d) => ({
        detalleId: d.id, productoId: d.productoId, tamano: d.tamano || null, cantidad: d.cantidad, nombre: d.nombre,
    }));

const conEntrega = (pedidos: Pedido[]): PedidoConEntrega[] =>
    pedidos.map((p) => ({ ...p, domicilio: models.domicilios.obtener(p.id) }));

const exigirPedidoActivo = (pedidoId: string | null): string => {
    if (!pedidoId) throw errorDeNegocio('Primero abre un pedido con el nombre del cliente.');
    return pedidoId;
};

export const ordersService = {
    // ── lecturas ──

    /** Menú activo con las unidades que alcanzan con el stock actual. */
    getMenu(): Menu {
        const catalogo = models.catalogo.obtenerCatalogoCompleto({ soloActivos: true });
        const disp = (id: string, t: Tamano | null = null) => models.inventario.calcularUnidadesDisponibles(id, t);
        return {
            pizza: catalogo.pizza.map((p) => ({
                ...p, categoria: 'pizza' as const,
                disponibles: Object.fromEntries(TAMANOS.map((t) => [t, disp(p.id, t)])) as Record<Tamano, number>,
            })),
            bebida: catalogo.bebida.map((p) => ({ ...p, disponibles: disp(p.id) })),
            helado: catalogo.helado.map((p) => ({ ...p, disponibles: disp(p.id) })),
        };
    },

    /** Comanda del pedido en captura. null si no existe o ya no está abierto. */
    getComanda(pedidoId: string | null): Comanda | null {
        if (!pedidoId) return null;
        const pedido = models.pedidos.obtenerPedido(pedidoId);
        if (!pedido || pedido.estado !== 'abierto') return null;
        return { pedido, totales: models.pedidos.calcularTotal(pedido.id), domicilio: models.domicilios.obtener(pedido.id) };
    },

    listToday(): PedidoConEntrega[] {
        return conEntrega(models.pedidos.listarPedidos({ fecha: fechaLocal() }));
    },

    listClients(): Cliente[] {
        return models.pedidos.obtenerClientes();
    },

    getClientHistory(clienteId: string): { historial: PedidoConEntrega[]; resumen: ResumenCliente } {
        return {
            historial: conEntrega(models.pedidos.obtenerHistorialCliente(clienteId)),
            resumen: models.pedidos.calcularTotalPorCliente(clienteId),
        };
    },

    getDetail(pedidoId: string): { pedido: Pedido; totales: TotalesPedido } {
        const pedido = models.pedidos.obtenerPedido(pedidoId);
        if (!pedido) throw errorDeNegocio('El pedido ya no existe.');
        return { pedido, totales: models.pedidos.calcularTotal(pedidoId) };
    },

    // ── escrituras ──

    async createOrder(datos: NuevoPedido): Promise<Pedido> {
        // Un pedido a domicilio valida sus datos de entrega ANTES de crear nada.
        const aDomicilio = Boolean(datos.domicilio);
        const entrega = aDomicilio ? models.domicilios.validarDatos(datos) : null;
        const pedido = await models.pedidos.crearPedido(datos);
        if (entrega) {
            try {
                await models.domicilios.registrarSolicitud(pedido, entrega);
            } catch (error) {
                await models.pedidos.eliminarPedido(pedido.id); // sin domicilio no queda un pedido a medias
                throw error;
            }
        }
        return pedido;
    },

    async addLine(pedidoId: string | null, linea: NuevaLinea): Promise<Pedido> {
        const id = exigirPedidoActivo(pedidoId);
        const producto = models.catalogo.obtenerProductoPorId(linea.productoId);
        if (!producto) throw errorDeNegocio('Ese producto ya no existe en el catálogo.');
        const tamano = producto.categoria === 'pizza' ? (linea.tamano ?? null) : null;
        const cantidad = Number(linea.cantidad ?? 1);
        // Aviso temprano: ¿alcanza el inventario sumando lo que ya lleva el pedido?
        const verificacion = models.inventario.verificarDisponibilidad([
            ...lineas(models.pedidos.obtenerPedido(id)),
            { productoId: producto.id, tamano, cantidad, nombre: producto.nombre },
        ]);
        if (!verificacion.disponible) throw errorDeFaltantes(verificacion);
        return models.pedidos.agregarProducto(id, producto, cantidad, tamano);
    },

    async updateLine(pedidoId: string | null, cambio: CambioLinea): Promise<Pedido | null> {
        const id = exigirPedidoActivo(pedidoId);
        if ('eliminar' in cambio) {
            await models.pedidos.eliminarProducto(id, cambio.detalleId);
        } else {
            const nuevas = lineas(models.pedidos.obtenerPedido(id))
                .map((l) => (l.detalleId === cambio.detalleId ? { ...l, cantidad: Number(cambio.cantidad) } : l));
            const verificacion = models.inventario.verificarDisponibilidad(nuevas);
            if (!verificacion.disponible) throw errorDeFaltantes(verificacion);
            await models.pedidos.modificarProducto(id, cambio.detalleId, { cantidad: cambio.cantidad });
        }
        return models.pedidos.obtenerPedido(id);
    },

    /** Confirmar = mandar a cocina (I5): verifica y descuenta inventario, luego asigna turno (I3). */
    async confirmOrder(pedidoId: string | null): Promise<{ pedido: Pedido; domicilio: Domicilio | null }> {
        const id = exigirPedidoActivo(pedidoId);
        const pedido = models.pedidos.obtenerPedido(id);
        if (!pedido) throw errorDeNegocio('El pedido ya no existe.');
        const verificacion = models.inventario.verificarDisponibilidad(lineas(pedido));
        if (!verificacion.disponible) throw errorDeFaltantes(verificacion);

        await models.inventario.descontarIngredientes(pedido);
        let confirmado: Pedido;
        try {
            confirmado = await models.pedidos.confirmarPedido(id);
        } catch (error) {
            // Compensación: si el pedido no pudo confirmarse, el inventario vuelve a como estaba.
            await models.inventario.revertirConsumo(pedido, { incluirIngredientes: true });
            throw error;
        }
        const domicilio = models.domicilios.esDomicilio(id) ? await models.domicilios.enviar(confirmado) : null;
        return { pedido: confirmado, domicilio };
    },

    /**
     * I1/I7. Abierto y vacío → se elimina del fichero. Si no → se cancela; si estaba confirmado,
     * las bebidas y helados regresan al almacén (los ingredientes de una pizza preparada no).
     * Devuelve el texto del aviso.
     */
    async cancelOrder(pedidoId: string, motivo = ''): Promise<{ aviso: string }> {
        const pedido = models.pedidos.obtenerPedido(pedidoId);
        if (!pedido) throw errorDeNegocio('El pedido ya no existe.');
        if (pedido.estado === 'abierto' && pedido.detalles.length === 0) {
            await models.pedidos.eliminarPedido(pedidoId);
            await models.domicilios.eliminar(pedidoId);
            return { aviso: `Pedido ${pedido.folio} descartado.` };
        }
        const cancelado = await models.pedidos.cancelarPedido(pedidoId, motivo);
        if (models.domicilios.esDomicilio(pedidoId)) await models.domicilios.cancelar(pedidoId, motivo);
        if (cancelado.estadoAnterior === 'confirmado') {
            const devueltos = await models.inventario.revertirConsumo(cancelado);
            const extra = devueltos.length ? ` Se devolvieron ${devueltos.length} artículo(s) al almacén.` : '';
            return { aviso: `Pedido ${pedido.folio} cancelado.${extra}` };
        }
        return { aviso: `Pedido ${pedido.folio} cancelado.` };
    },
};
