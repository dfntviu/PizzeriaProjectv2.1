// Servicio de Inventario (antes InventarioController): existencias, movimientos, recetas y consumo.

import { fechaLocal, sumarDias, inicioDeSemana } from '@model/utilidades.js';
import { models } from './system';
import { errorDeNegocio } from './errors';
import type { ArticuloInventario, Consumo, LineaReceta, Movimiento, Producto, Receta, Tamano } from '../types/domain';

export type TipoMovimientoManual = 'entrada' | 'merma' | 'ajuste';

export interface VistaReceta {
    producto: Producto;
    tamano: Tamano;
    receta: Receta | null;
    ingredientes: { id: string; nombre: string; unidad: string }[];
    disponibles: number;
}

export interface Periodo {
    inicio: string;
    fin: string;
}

export interface ConsultaConsumo {
    modo: 'dia' | 'semana';
    fecha: string;
}

export const inventoryService = {
    getStock(): { ingredientes: ArticuloInventario[]; productos: ArticuloInventario[] } {
        return models.inventario.consultarInventarioGeneral();
    },

    getAlerts(): ArticuloInventario[] {
        return models.inventario.detectarStockMinimo();
    },

    getMovements({ inicio, fin }: Periodo): Movimiento[] {
        if (inicio > fin) throw errorDeNegocio('La fecha inicial no puede ser posterior a la final.');
        return models.inventario.obtenerMovimientosPorPeriodo(inicio, fin);
    },

    getConsumption({ modo, fecha }: ConsultaConsumo): { titulo: string; fecha: string; consumo: Consumo[] } {
        if (modo === 'semana') {
            const inicio = inicioDeSemana(fecha);
            const fin = sumarDias(inicio, 6);
            return { titulo: `Consumo semana ${inicio} → ${fin}`, fecha: inicio, consumo: models.inventario.calcularConsumoPorPeriodo(inicio, fin) };
        }
        return { titulo: `Consumo del ${fecha}`, fecha, consumo: models.inventario.calcularConsumoPorPeriodo(fecha, fecha) };
    },

    /** Pizzas del catálogo (activas o no) para el editor de recetas. */
    getPizzas(): Producto[] {
        return models.catalogo.obtenerProductosPorCategoria('pizza');
    },

    getRecipe(productoId: string, tamano: Tamano): VistaReceta | null {
        const producto = models.catalogo.obtenerProductoPorId(productoId);
        if (!producto) return null;
        return {
            producto,
            tamano,
            receta: models.inventario.obtenerReceta(productoId, tamano),
            ingredientes: models.inventario.ingredientes.filter((i) => i.activo),
            disponibles: models.inventario.calcularUnidadesDisponibles(productoId, tamano),
        };
    },

    async registerIngredient(datos: Record<string, string>): Promise<string> {
        const ing = await models.inventario.registrarIngrediente(datos);
        return `${ing.nombre} registrado con ${ing.stock} ${ing.unidad}.`;
    },

    /** I6: entrada, merma (motivo obligatorio) o ajuste (justificación obligatoria). Devuelve el aviso. */
    async registerMovement(tipo: TipoMovimientoManual, datos: { id: string; cantidad: string; motivo: string }): Promise<{ tipo: 'exito' | 'info'; aviso: string }> {
        if (tipo === 'entrada') {
            const m = await models.inventario.registrarEntrada(datos.id, datos.cantidad, datos.motivo);
            return { tipo: 'exito', aviso: `Entrada de ${m.cantidad} ${m.unidad} de ${m.itemNombre}. Stock: ${m.stockResultante}.` };
        }
        if (tipo === 'merma') {
            const m = await models.inventario.registrarMerma(datos.id, datos.cantidad, datos.motivo);
            return { tipo: 'info', aviso: `Merma de ${Math.abs(m.cantidad)} ${m.unidad} de ${m.itemNombre} (${m.motivo}).` };
        }
        const m = await models.inventario.registrarAjuste(datos.id, datos.cantidad, datos.motivo);
        return { tipo: 'info', aviso: `Ajuste de ${m.cantidad > 0 ? '+' : ''}${m.cantidad} ${m.unidad} en ${m.itemNombre}.` };
    },

    async saveRecipe(productoId: string, tamano: Tamano, ingredientes: LineaReceta[]): Promise<string> {
        await models.inventario.registrarReceta(productoId, tamano, ingredientes);
        const nombre = models.catalogo.obtenerProductoPorId(productoId)?.nombre ?? productoId;
        return `Receta de ${nombre} ${tamano} guardada.`;
    },
};

/** Periodo por defecto del historial: los últimos 7 días. */
export const periodoInicial = (): Periodo => ({ inicio: sumarDias(fechaLocal(), -6), fin: fechaLocal() });
