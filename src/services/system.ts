// Composición de la persistencia actual (equivale a la parte «Modelo» de app.js en v2.1.0).
// Es el ÚNICO archivo que crea el repositorio y los modelos. En F2 se sustituye por el
// cliente de Supabase y el resto de los servicios cambian su implementación, no su firma.

import { FicheroRepository } from '@model/FicheroRepository.js';
import { SEMILLAS } from '@model/semillas.js';
import { CatalogoModel } from '@model/CatalogoModel.js';
import { PedidoModel } from '@model/PedidoModel.js';
import { InventarioModel } from '@model/InventarioModel.js';
import { CajaModel } from '@model/CajaModel.js';
import { DomicilioModel } from '@model/DomicilioModel.js';
import type {
    CajaModelApi, CatalogoModelApi, DomicilioModelApi, FicheroRepositoryApi, InventarioModelApi, PedidoModelApi,
} from '../types/models';

const repositorio = new FicheroRepository({ semillas: SEMILLAS });

export const repository = repositorio as unknown as FicheroRepositoryApi;

export const models = {
    catalogo: new CatalogoModel(repositorio) as unknown as CatalogoModelApi,
    pedidos: new PedidoModel(repositorio) as unknown as PedidoModelApi,
    inventario: new InventarioModel(repositorio) as unknown as InventarioModelApi,
    caja: new CajaModel(repositorio) as unknown as CajaModelApi,
    domicilios: new DomicilioModel(repositorio) as unknown as DomicilioModelApi,
};

/** Lee los 11 ficheros y deja los modelos en memoria. */
export async function loadAllModels(): Promise<void> {
    await Promise.all([
        models.catalogo.cargarCatalogo(),
        models.pedidos.cargarPedidos(),
        models.inventario.cargarInventario(),
        models.caja.cargarCaja(),
        models.domicilios.cargarDomicilios(),
    ]);
}
