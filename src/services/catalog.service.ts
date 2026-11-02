// Servicio del Catálogo (antes CatalogoController). Alta de bebida/helado crea su existencia (2.5).

import { models } from './system';
import type { Categoria, Producto } from '../types/domain';

export type FiltroCatalogo = Categoria | 'todos';

export interface VistaCatalogo {
    productos: Producto[];
    stock: Record<string, number>;
    recetas: Record<string, number>;
    conteo: Record<Categoria, number>;
}

export interface DatosProducto {
    nombre: string;
    categoria?: Categoria;
    descripcion?: string;
    presentacion?: string;
    stockMinimo?: string | number;
    precio?: string | number;
    precios?: Record<'chica' | 'mediana' | 'grande', string | number>;
}

export const catalogService = {
    getCatalog(filtro: FiltroCatalogo): VistaCatalogo {
        const catalogo = models.catalogo.obtenerCatalogoCompleto();
        const productos = filtro === 'todos' ? [...catalogo.pizza, ...catalogo.bebida, ...catalogo.helado] : catalogo[filtro];
        const stock = Object.fromEntries(models.inventario.existencias.map((e) => [e.productoId, e.stock]));
        const recetas = Object.fromEntries(catalogo.pizza.map((p) => [
            p.id, (['chica', 'mediana', 'grande'] as const).filter((t) => models.inventario.obtenerReceta(p.id, t)).length,
        ]));
        const conteo = { pizza: catalogo.pizza.length, bebida: catalogo.bebida.length, helado: catalogo.helado.length };
        return { productos, stock, recetas, conteo };
    },

    getProduct(id: string): Producto | null {
        return models.catalogo.obtenerProductoPorId(id);
    },

    async register(datos: DatosProducto): Promise<{ producto: Producto; aviso: string }> {
        const producto = await models.catalogo.registrarProducto(datos);
        if (producto.categoria === 'pizza') {
            return { producto, aviso: `${producto.nombre} registrada. Define sus recetas técnicas en Inventario para poder venderla.` };
        }
        await models.inventario.registrarExistencia(producto, { stockMinimo: Number(datos.stockMinimo ?? 5) });
        return { producto, aviso: `${producto.nombre} registrado. Captura su entrada de almacén en Inventario.` };
    },

    async update(id: string, datos: DatosProducto): Promise<Producto> {
        return models.catalogo.actualizarProducto(id, datos);
    },

    async setActive(id: string, activo: boolean): Promise<Producto> {
        return activo ? models.catalogo.activarProducto(id) : models.catalogo.desactivarProducto(id);
    },
};
