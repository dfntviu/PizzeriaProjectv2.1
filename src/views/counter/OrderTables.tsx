import { dosDigitos, fechaHora, hora, moneda } from '../../shared/format';
import type { Cliente, PedidoConEntrega, ResumenCliente } from '../../types/domain';

export const ESTADO_PEDIDO = { abierto: 'En captura', confirmado: 'En cocina', pagado: 'Pagado', cancelado: 'Cancelado' } as const;

/** Un domicilio no entregado se muestra como tal, no como un «Cancelado» genérico. */
function Chip({ p }: { p: PedidoConEntrega }) {
    if (p.domicilio?.estado === 'no_entregado') return <span className="chip chip--cancelado">No entregado</span>;
    if (p.domicilio && p.estado === 'confirmado') return <span className="chip chip--confirmado">En reparto</span>;
    return <span className={`chip chip--${p.estado}`}>{ESTADO_PEDIDO[p.estado]}</span>;
}

interface TodayProps {
    pedidos: PedidoConEntrega[];
    alVer: (p: PedidoConEntrega) => void;
    alCancelar: (p: PedidoConEntrega) => void;
}

export function OrdersToday({ pedidos, alVer, alCancelar }: TodayProps) {
    if (!pedidos.length) return <div data-zona="pedidos"><p className="vacio">Aún no hay pedidos hoy.</p></div>;
    return (
        <div data-zona="pedidos">
            <table className="tabla">
                <thead><tr><th>Folio</th><th>Turno</th><th>Cliente</th><th>Hora</th><th>Estado</th><th className="num">Total</th><th><span className="oculto">Acciones</span></th></tr></thead>
                <tbody>{pedidos.map((p) => (
                    <tr key={p.id}>
                        <td className="mono">{p.folio}</td>
                        <td className="mono">{p.turno ? dosDigitos(p.turno) : '—'}</td>
                        <td>{p.clienteNombre}{p.domicilio && <> <span className="etiqueta etiqueta--domicilio">Domicilio</span></>}</td>
                        <td>{hora(p.fecha)}</td>
                        <td><Chip p={p} /></td>
                        <td className="num mono">{moneda(p.total)}</td>
                        <td className="acciones">
                            <button type="button" className="boton boton--texto" data-accion="ver" onClick={() => alVer(p)}>{p.estado === 'abierto' ? 'Retomar' : 'Ver'}</button>
                            {(p.estado === 'abierto' || p.estado === 'confirmado') && (
                                <button type="button" className="boton boton--texto boton--peligro" data-accion="descartar" onClick={() => alCancelar(p)}>Cancelar</button>
                            )}
                        </td>
                    </tr>
                ))}</tbody>
            </table>
        </div>
    );
}

interface HistoryProps {
    clientes: Cliente[];
    clienteId: string;
    alElegir: (clienteId: string) => void;
    historial: { historial: PedidoConEntrega[]; resumen: ResumenCliente } | undefined;
    alVer: (p: PedidoConEntrega) => void;
}

export function ClientHistory({ clientes, clienteId, alElegir, historial, alVer }: HistoryProps) {
    return (
        <div className="historial">
            <label className="campo campo--linea"><span>Cliente</span>
                <select data-accion="ver-historial" data-zona="clientes" value={clienteId} onChange={(e) => alElegir(e.target.value)}>
                    <option value="">{clientes.length ? 'Elige un cliente…' : 'Sin clientes todavía'}</option>
                    {clientes.map((c) => (
                        <option key={c.clienteId} value={c.clienteId}>{c.nombre}{c.telefono ? ` · ${c.telefono}` : ''} ({c.pedidos})</option>
                    ))}
                </select></label>
            <div data-zona="historial">
                {!clienteId || !historial ? <p className="vacio">Elige un cliente para ver sus compras.</p> : (
                    <>
                        <div className="cifras">
                            <div className="cifra"><span className="cifra__valor">{historial.historial.length}</span><span className="cifra__nombre">pedidos</span></div>
                            <div className="cifra"><span className="cifra__valor">{historial.resumen.pedidos}</span><span className="cifra__nombre">pagados</span></div>
                            <div className="cifra"><span className="cifra__valor">{moneda(historial.resumen.total)}</span><span className="cifra__nombre">total comprado</span></div>
                        </div>
                        <table className="tabla tabla--compacta">
                            <thead><tr><th>Fecha</th><th>Folio</th><th>Productos</th><th>Estado</th><th className="num">Total</th></tr></thead>
                            <tbody>{historial.historial.map((p) => (
                                <tr key={p.id}>
                                    <td>{fechaHora(p.fecha)}</td>
                                    <td><button type="button" className="enlace mono" data-accion="ver" onClick={() => alVer(p)}>{p.folio}</button>
                                        {p.domicilio && <><br /><span className="etiqueta etiqueta--domicilio">Domicilio</span></>}</td>
                                    <td>{p.detalles.map((d) => `${d.cantidad}× ${d.nombre}${d.tamano ? ` ${d.tamano}` : ''}`).join(', ') || '—'}</td>
                                    <td><Chip p={p} /></td>
                                    <td className="num mono">{moneda(p.total)}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </>
                )}
            </div>
        </div>
    );
}
