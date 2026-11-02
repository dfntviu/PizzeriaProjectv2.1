// Tipos del dominio tal como los devuelven los modelos de ../src/model (JavaScript).
// Es la frontera tipada: los servicios convierten lo que sale de los modelos a estos tipos
// y el resto de la app (store y vistas) solo conoce estos tipos.
// Los nombres de campo se conservan en español porque son los del modelo de datos (esquemas.js);
// en F1 se corresponden con las columnas de Postgres (cliente_nombre ↔ clienteNombre, etc.).

export type Categoria = 'pizza' | 'bebida' | 'helado';
export type Tamano = 'chica' | 'mediana' | 'grande';
export type Unidad = 'g' | 'ml' | 'pz';
export type EstadoPedido = 'abierto' | 'confirmado' | 'pagado' | 'cancelado';
export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia';
export type MetodoPagoPedido = MetodoPago | 'contraentrega' | '';
export type TipoMovimiento = 'entrada' | 'merma' | 'ajuste' | 'consumo' | 'devolucion';
export type EstadoDomicilio = 'captura' | 'en_proceso' | 'entregado' | 'no_entregado' | 'cancelado';
export type NivelStock = 'ok' | 'bajo' | 'agotado';
export type TipoAviso = 'exito' | 'info' | 'error';

export type PreciosPizza = Record<Tamano, number>;

export interface Producto {
    id: string;
    nombre: string;
    categoria: Categoria;
    descripcion: string;
    presentacion: string;
    unidad: string;
    precio: number | null;
    precios: PreciosPizza | null;
    activo: boolean;
}

export interface DetallePedido {
    id: string;
    pedidoId: string;
    productoId: string;
    nombre: string;
    categoria: Categoria;
    tamano: Tamano | '';
    precioUnitario: number; // I2: congelado al agregar la línea
    cantidad: number;
    subtotal: number;
}

export interface Pedido {
    id: string;
    folio: string;
    turno: number | null;
    clienteId: string;
    clienteNombre: string;
    clienteTelefono: string;
    fecha: string;
    estado: EstadoPedido;
    metodoPago: MetodoPagoPedido;
    total: number;
    confirmadoEn: string | null;
    pagadoEn: string | null;
    canceladoEn: string | null;
    motivoCancelacion: string;
    detalles: DetallePedido[];
}

export interface TotalesPedido {
    articulos: number;
    base: number;
    iva: number;
    total: number;
}

export interface Domicilio {
    id: string; // = id del pedido
    folio: string;
    clienteId: string;
    clienteNombre: string;
    telefono: string;
    direccion: string;
    referencias: string;
    estado: EstadoDomicilio;
    solicitadoEn: string;
    confirmadoEn: string | null;
    cerradoEn: string | null;
    minutos: number | null;
    aTiempo: boolean;
    total: number;
    importeCobrado: number;
    motivo: string;
    // Calculados por el modelo al consultar:
    plazo: number;
    transcurridos: number | null;
    retrasado: boolean;
}

/** Pedido con su domicilio (o null) para la etiqueta «Domicilio». */
export interface PedidoConEntrega extends Pedido {
    domicilio: Domicilio | null;
}

export interface Cliente {
    clienteId: string;
    nombre: string;
    telefono: string;
    pedidos: number;
}

export interface ResumenCliente {
    pedidos: number;
    total: number;
}

/** Producto del menú con las unidades que alcanzan con el stock actual. */
export type PizzaEnMenu = Producto & { categoria: 'pizza'; disponibles: Record<Tamano, number> };
export type ProductoSimpleEnMenu = Producto & { disponibles: number };
export interface Menu {
    pizza: PizzaEnMenu[];
    bebida: ProductoSimpleEnMenu[];
    helado: ProductoSimpleEnMenu[];
}

export interface ArticuloInventario {
    id: string;
    nombre: string;
    unidad: Unidad;
    stock: number;
    stockMinimo: number;
    activo?: boolean;
    productoId?: string;
    itemTipo: 'ingrediente' | 'producto';
    nivel: NivelStock;
}

export interface Faltante {
    itemId: string;
    nombre: string;
    unidad: string;
    cantidad: number;
    disponible: number;
    falta: number;
}

export interface Verificacion {
    disponible: boolean;
    faltantes: Faltante[];
    sinReceta: string[];
}

export interface LineaReceta {
    ingredienteId: string;
    cantidad: number;
    nombre?: string;
    unidad?: string;
}

export interface Receta {
    productoId: string;
    tamano: Tamano;
    ingredientes: LineaReceta[];
}

export interface Movimiento {
    id: string;
    fecha: string;
    tipo: TipoMovimiento;
    itemTipo: 'ingrediente' | 'producto';
    itemId: string;
    itemNombre: string;
    unidad: string;
    cantidad: number;
    stockResultante: number;
    motivo: string;
    pedidoId: string;
}

export interface Consumo {
    itemId: string;
    nombre: string;
    unidad: string;
    cantidad: number;
}

export interface DetalleVenta {
    id: string;
    productoId: string;
    nombre: string;
    categoria: Categoria;
    tamano: Tamano | '';
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
}

export interface Venta {
    id: string;
    pedidoId: string;
    folio: string;
    turno: number;
    clienteId: string;
    clienteNombre: string;
    fecha: string;
    metodoPago: MetodoPago;
    importe: number;
    recibido: number;
    cambio: number;
    detalles: DetalleVenta[];
}

export interface ProductoVendido {
    productoId: string;
    nombre: string;
    tamano: Tamano | '';
    unidades: number;
    importe: number;
}

export interface Cierre {
    id: string;
    fecha: string;
    numVentas: number;
    total: number;
    efectivo: number;
    tarjeta: number;
    transferencia: number;
    pedidosPendientes: number;
    generadoEn: string;
    productos?: ProductoVendido[];
}

export interface ReporteDiario {
    fecha: string;
    numVentas: number;
    total: number;
    porMetodo: Record<MetodoPago, number>;
    ticketPromedio: number;
    unidades: number;
    productos: ProductoVendido[];
    ventas: Venta[];
    cierre: Cierre | null;
    pendientes: Pedido[];
    esHoy: boolean;
}

export interface ReporteSemanal {
    inicio: string;
    fin: string;
    numVentas: number;
    total: number;
    dias: { fecha: string; numVentas: number; total: number }[];
    productos: ProductoVendido[];
}

export interface EstadisticasDomicilio {
    inicio: string;
    fin: string;
    atendidos: number;
    entregados: number;
    noEntregados: number;
    aTiempo: number;
    porcentajeATiempo: number;
    recaudacion: number;
    perdida: number;
    minutosPromedio: number;
}

export interface EstadisticasDiaDomicilio extends EstadisticasDomicilio {
    fecha: string;
    esHoy: boolean;
}

export interface EstadisticasSemanaDomicilio extends EstadisticasDomicilio {
    dias: { fecha: string; atendidos: number; recaudacion: number }[];
}

export interface CampoEsquema {
    nombre: string;
    tipo: string;
    bytes: number;
}

export interface DescripcionFichero {
    nombre: string;
    campos: CampoEsquema[];
    longitudRegistro: number;
    registros: number;
    activos: number;
    borrados: number;
    bytes: number;
}

export interface RegistroLeido {
    posicion: number;
    borrado: boolean;
    registro: Record<string, unknown>;
}

export interface Establecimiento {
    nombre: string;
    lema: string;
    direccion: string;
    telefono: string;
    fotos: { src: string; alt: string }[];
}
