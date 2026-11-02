// Servicio de Caja (antes CajaController): cobro de pedidos de mostrador (I8), reportes y cierre (I9).

import { fechaLocal, inicioDeSemana } from '@model/utilidades.js';
import { models } from './system';
import { errorDeNegocio } from './errors';
import type { Cierre, MetodoPago, Pedido, ProductoVendido, ReporteDiario, ReporteSemanal, TotalesPedido, Venta } from '../types/domain';

/** I8 + I10: los domicilios se cobran al entregar, en su propia vista. */
const porCobrarEnMostrador = (): Pedido[] =>
    models.pedidos.listarPedidos({ estado: 'confirmado' }).filter((p) => !models.domicilios.esDomicilio(p.id));

const pendientesDe = (fecha: string): Pedido[] =>
    porCobrarEnMostrador().filter((p) => p.confirmadoEn !== null && fechaLocal(new Date(p.confirmadoEn)) === fecha);

const rechazarDomicilio = (pedido: Pedido): void => {
    if (models.domicilios.esDomicilio(pedido.id)) {
        throw errorDeNegocio(`${pedido.folio} es a domicilio: se cobra al entregar, en la vista Domicilio.`);
    }
};

export const cashierService = {
    getPending(): Pedido[] {
        return porCobrarEnMostrador();
    },

    getDailyReport(fecha: string): ReporteDiario {
        return { ...models.caja.generarReporteDiario(fecha), pendientes: pendientesDe(fecha), esHoy: fecha === fechaLocal() };
    },

    getWeeklyReport(fecha: string): ReporteSemanal {
        return models.caja.generarReporteSemanal(inicioDeSemana(fecha));
    },

    getTopSellers(inicio: string, fin: string): ProductoVendido[] {
        if (inicio > fin) throw errorDeNegocio('La fecha inicial no puede ser posterior a la final.');
        return models.caja.obtenerProductosMasVendidos(inicio, fin, 8);
    },

    getSale(pedidoId: string): Venta {
        const venta = models.caja.obtenerVenta(pedidoId);
        if (!venta) throw errorDeNegocio('Ese pedido no tiene venta registrada.');
        return venta;
    },

    getClientSales(clienteId: string): Venta[] {
        return models.caja.obtenerVentasPorCliente(clienteId);
    },

    /** Datos para abrir el diálogo de cobro; falla si el pedido ya no está pendiente. */
    prepareCharge(pedidoId: string): { pedido: Pedido; totales: TotalesPedido } {
        const pedido = models.pedidos.obtenerPedido(pedidoId);
        if (!pedido || pedido.estado !== 'confirmado') throw errorDeNegocio('Ese pedido ya no está pendiente de cobro.');
        rechazarDomicilio(pedido);
        return { pedido, totales: models.pedidos.calcularTotal(pedidoId) };
    },

    async charge(pedidoId: string, metodo: MetodoPago, recibido: number | null): Promise<{ venta: Venta; advertencia: string | null }> {
        const pedido = models.pedidos.obtenerPedido(pedidoId);
        if (!pedido) throw errorDeNegocio('El pedido ya no existe.');
        rechazarDomicilio(pedido);
        const venta = await models.caja.registrarPago(pedido, metodo, recibido);
        try {
            await models.pedidos.marcarPagado(pedidoId, metodo);
        } catch (error) {
            // La venta ya existe: se informa para revisión en lugar de ocultarlo.
            console.error(error);
            return { venta, advertencia: `La venta quedó registrada pero el pedido ${pedido.folio} no se marcó como pagado.` };
        }
        return { venta, advertencia: null };
    },

    async closeDay(fecha: string): Promise<Cierre> {
        return models.caja.generarCierreCaja(fecha, { pedidosPendientes: pendientesDe(fecha).length });
    },
};
