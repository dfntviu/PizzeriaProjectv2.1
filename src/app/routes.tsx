// Rutas de la aplicación. Cada sección tiene su URL (/mostrador, /caja…): se puede enlazar,
// recargar y volver atrás con el navegador. Las vistas se cargan bajo demanda (code splitting).

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const vista = <K extends string>(cargar: () => Promise<Record<K, ComponentType>>, nombre: K): LazyExoticComponent<ComponentType> =>
    lazy(async () => ({ default: (await cargar())[nombre] }));

export const RUTAS = [
    { ruta: 'mostrador', numero: '01', titulo: 'Mostrador', Vista: vista(() => import('../views/counter/CounterPage'), 'CounterPage') },
    { ruta: 'catalogo', numero: '02', titulo: 'Catálogo', Vista: vista(() => import('../views/catalog/CatalogPage'), 'CatalogPage') },
    { ruta: 'inventario', numero: '03', titulo: 'Inventario', Vista: vista(() => import('../views/inventory/InventoryPage'), 'InventoryPage') },
    { ruta: 'caja', numero: '04', titulo: 'Caja', Vista: vista(() => import('../views/cashier/CashierPage'), 'CashierPage') },
    { ruta: 'domicilio', numero: '05', titulo: 'Domicilio', Vista: vista(() => import('../views/delivery/DeliveryPage'), 'DeliveryPage') },
    { ruta: 'ficheros', numero: '06', titulo: 'Ficheros', Vista: vista(() => import('../views/files/FilesPage'), 'FilesPage') },
] as const;

export const RUTA_INICIAL = '/mostrador';
