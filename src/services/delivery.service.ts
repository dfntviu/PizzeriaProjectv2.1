// Servicio de Domicilio (antes DomicilioController). I10: plazo de 40 min calculado por el
// sistema, cobro todo o nada y fuera de Caja.

import { fechaLocal, inicioDeSemana, recortarBytes } from '@model/utilidades.js';
import { models } from './system';
import { errorDeNegocio } from './errors';
import type { Domicilio, EstadisticasDiaDomicilio, EstadisticasSemanaDomicilio, Pedido } from '../types/domain';

export const deliveryService = {
    listToday(): Domicilio[] {
        return models.domicilios.listar({ fecha: fechaLocal() });
    },

    getDailyStats(fecha: string): EstadisticasDiaDomicilio {
        return { ...models.domicilios.estadisticasDiarias(fecha), fecha, esHoy: fecha === fechaLocal() };
    },

    getWeeklyStats(fecha: string): EstadisticasSemanaDomicilio {
        return models.domicilios.estadisticasSemanales(inicioDeSemana(fecha));
    },

    prepareDelivery(pedidoId: string): { domicilio: Domicilio; pedido: Pedido | null } {
        const domicilio = models.domicilios.obtener(pedidoId);
        if (domicilio?.estado !== 'en_proceso') throw errorDeNegocio('Ese domicilio ya no está en reparto.');
        return { domicilio, pedido: models.pedidos.obtenerPedido(pedidoId) };
    },

    async registerDelivery(pedidoId: string, datos: { entregado: boolean; motivo: string }): Promise<{ domicilio: Domicilio; advertencia: string | null }> {
        const cerrado = await models.domicilios.registrarEntrega(pedidoId, datos);
        try {
            if (cerrado.estado === 'entregado') {
                await models.pedidos.marcarPagado(pedidoId, 'contraentrega');
            } else {
                // Todo o nada: no se cobra. Lo preparado ya salió del inventario al confirmar.
                await models.pedidos.cancelarPedido(pedidoId, recortarBytes(`No entregado: ${cerrado.motivo}`, 60));
            }
        } catch (error) {
            console.error(error);
            return { domicilio: cerrado, advertencia: `La entrega quedó registrada, pero el pedido ${cerrado.folio} no se actualizó.` };
        }
        return { domicilio: cerrado, advertencia: null };
    },
};
