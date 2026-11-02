// Contrato tipado de los modelos JavaScript (../src/model) que usa la capa Service.
// Solo se declaran los métodos que la app React consume. Si un modelo cambia su firma,
// este archivo es el único lugar que hay que ajustar.

import type {
    ArticuloInventario, Cierre, Cliente, Consumo, DescripcionFichero, Domicilio, EstadisticasDomicilio,
    EstadisticasSemanaDomicilio, Movimiento, MetodoPago, Pedido, Producto, ProductoVendido, Receta,
    RegistroLeido, ResumenCliente, Tamano, TotalesPedido, Venta, Verificacion, LineaReceta,
} from './domain';

export interface LineaVerificable {
    detalleId?: string;
    productoId: string;
    tamano: Tamano | null;
    cantidad: number;
    nombre?: string;
}

export interface CatalogoModelApi {
    cargarCatalogo(): Promise<unknown>;
    registrarProducto(datos: unknown): Promise<Producto>;
    actualizarProducto(id: string, datos: unknown): Promise<Producto>;
    desactivarProducto(id: string): Promise<Producto>;
    activarProducto(id: string): Promise<Producto>;
    obtenerProductoPorId(id: string): Producto | null;
    obtenerProductosPorCategoria(categoria: string, opciones?: { soloActivos?: boolean }): Producto[];
    obtenerCatalogoCompleto(opciones?: { soloActivos?: boolean }): Record<'pizza' | 'bebida' | 'helado', Producto[]>;
}

export interface PedidoCancelado extends Pedido {
    estadoAnterior: Pedido['estado'];
}

export interface PedidoModelApi {
    cargarPedidos(): Promise<unknown>;
    crearPedido(datos: { nombre: string; telefono?: string }): Promise<Pedido>;
    agregarProducto(pedidoId: string, producto: Producto, cantidad: number, tamano: Tamano | null): Promise<Pedido>;
    modificarProducto(pedidoId: string, detalleId: string, datos: { cantidad: number }): Promise<Pedido>;
    eliminarProducto(pedidoId: string, detalleId: string): Promise<Pedido>;
    calcularTotal(pedidoId: string): TotalesPedido;
    confirmarPedido(pedidoId: string): Promise<Pedido>;
    cancelarPedido(pedidoId: string, motivo?: string): Promise<PedidoCancelado>;
    eliminarPedido(pedidoId: string): Promise<unknown>;
    marcarPagado(pedidoId: string, metodoPago: string): Promise<Pedido>;
    obtenerPedido(pedidoId: string): Pedido | null;
    listarPedidos(filtro?: { estado?: string | null; fecha?: string | null }): Pedido[];
    obtenerHistorialCliente(clienteId: string): Pedido[];
    calcularTotalPorCliente(clienteId: string): ResumenCliente;
    obtenerClientes(): Cliente[];
}

export interface InventarioModelApi {
    ingredientes: (Omit<ArticuloInventario, 'itemTipo' | 'nivel'> & { activo: boolean })[];
    existencias: (Omit<ArticuloInventario, 'itemTipo' | 'nivel'> & { productoId: string })[];
    cargarInventario(): Promise<unknown>;
    registrarIngrediente(datos: unknown): Promise<ArticuloInventario>;
    registrarExistencia(producto: Producto, opciones?: { stockMinimo?: number }): Promise<unknown>;
    registrarReceta(productoId: string, tamano: Tamano, ingredientes: LineaReceta[]): Promise<Receta>;
    obtenerReceta(productoId: string, tamano: Tamano): Receta | null;
    registrarEntrada(id: string, cantidad: unknown, motivo?: string): Promise<Movimiento>;
    registrarMerma(id: string, cantidad: unknown, motivo: string): Promise<Movimiento>;
    registrarAjuste(id: string, stockReal: unknown, motivo: string): Promise<Movimiento>;
    consultarInventarioGeneral(): { ingredientes: ArticuloInventario[]; productos: ArticuloInventario[] };
    verificarDisponibilidad(lineas: LineaVerificable[]): Verificacion;
    calcularUnidadesDisponibles(productoId: string, tamano?: Tamano | null): number;
    descontarIngredientes(pedido: Pedido): Promise<unknown>;
    revertirConsumo(pedido: Pedido, opciones?: { incluirIngredientes?: boolean }): Promise<unknown[]>;
    obtenerMovimientosPorPeriodo(inicio: string, fin: string): Movimiento[];
    calcularConsumoPorPeriodo(inicio: string, fin: string): Consumo[];
    detectarStockMinimo(): ArticuloInventario[];
}

export interface CajaModelApi {
    cargarCaja(): Promise<unknown>;
    registrarPago(pedido: Pedido, metodoPago: MetodoPago, recibido: number | null): Promise<Venta>;
    obtenerVenta(pedidoId: string): Venta | null;
    obtenerVentasPorCliente(clienteId: string): Venta[];
    obtenerProductosMasVendidos(inicio: string, fin: string, limite?: number): ProductoVendido[];
    generarReporteDiario(fecha: string): Omit<import('./domain').ReporteDiario, 'pendientes' | 'esHoy'>;
    generarReporteSemanal(inicioSemana: string): import('./domain').ReporteSemanal;
    generarCierreCaja(fecha: string, opciones: { pedidosPendientes: number }): Promise<Cierre>;
}

export interface DomicilioModelApi {
    cargarDomicilios(): Promise<unknown>;
    validarDatos(datos: { telefono?: string; direccion?: string; referencias?: string }): { direccion: string; referencias: string };
    registrarSolicitud(pedido: Pedido, datos: { direccion: string; referencias: string }): Promise<Domicilio>;
    esDomicilio(pedidoId: string): boolean;
    obtener(pedidoId: string): Domicilio | null;
    enviar(pedido: Pedido): Promise<Domicilio>;
    registrarEntrega(pedidoId: string, datos: { entregado: boolean; motivo?: string }): Promise<Domicilio>;
    cancelar(pedidoId: string, motivo?: string): Promise<Domicilio | null>;
    eliminar(pedidoId: string): Promise<boolean>;
    listar(filtro?: { fecha?: string | null }): Domicilio[];
    estadisticasDiarias(fecha: string): EstadisticasDomicilio;
    estadisticasSemanales(inicioSemana: string): EstadisticasSemanaDomicilio;
}

export interface FicheroRepositoryApi {
    directorio: FileSystemDirectoryHandle | null;
    conectarCarpeta(handle: FileSystemDirectoryHandle | null): void;
    describirFichero(nombre: string): Promise<Omit<DescripcionFichero, 'nombre' | 'campos'>>;
    reposicionarLectura(nombre: string, posicion: number): Promise<RegistroLeido | null>;
    compactarFichero(nombre: string): Promise<{ liberados: number; bytesLiberados: number }>;
    exportarJSON(nombre: string): Promise<{ nombreArchivo: string; contenido: string }>;
    importarJSON(archivo: File): Promise<{ nombre: string; registros: number }>;
}
