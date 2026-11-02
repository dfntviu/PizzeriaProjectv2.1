// 04 · Caja — cobros del mostrador (I8), corte del día, semana, más vendidos y cierre (I9).

import { useState, type CSSProperties, type FormEvent } from 'react';
import {
    useCashierActions, useCorteQuery, useFechaCaja, useMasVendidosQuery, usePeriodoMasVendidos, usePorCobrarQuery,
    useSemanaCaja, useSemanaQuery,
} from '../../store/cashier.store';
import { useNotify } from '../../store/notifications';
import { useSafeRead } from '../../store/useBusinessMutation';
import { cashierService } from '../../services/cashier.service';
import { ETIQUETA_METODO, dia, dosDigitos, etiquetaTamano, fechaHora, hora, leerFormulario, moneda, numero } from '../../shared/format';
import { CloseDialogButton, Dialog } from '../components/Dialog';
import { Section, SectionHeader, busyProps } from '../components/SectionHeader';
import type { Cierre, MetodoPago, Pedido, ProductoVendido, ReporteDiario, TotalesPedido, Venta } from '../../types/domain';

type DialogoCaja =
    | { tipo: 'cobro'; pedido: Pedido; totales: TotalesPedido }
    | { tipo: 'ticket'; venta: Venta }
    | { tipo: 'cierre'; cierre: Cierre }
    | { tipo: 'confirmar-cierre'; fecha: string; pendientes: number }
    | { tipo: 'ventas-cliente'; ventas: Venta[] }
    | null;

const p = (valor: number) => ({ '--p': valor }) as CSSProperties;

export function CashierPage() {
    const notificar = useNotify();
    const leer = useSafeRead();
    const [dialogo, setDialogo] = useState<DialogoCaja>(null);
    const cerrarDialogo = () => setDialogo(null);
    const [fecha, setFecha] = useFechaCaja();
    const [semana, setSemana] = useSemanaCaja();
    const [periodo, setPeriodo] = usePeriodoMasVendidos();

    const pendientes = usePorCobrarQuery();
    const corte = useCorteQuery(fecha);
    const reporteSemana = useSemanaQuery(semana);
    const masVendidos = useMasVendidosQuery(periodo);

    const { cobrar, cerrar } = useCashierActions({
        alCobrar: (venta, advertencia) => {
            if (advertencia) notificar('error', advertencia);
            setDialogo({ tipo: 'ticket', venta });
        },
        alCerrar: (cierre) => setDialogo({ tipo: 'cierre', cierre }), // la confirmación no queda abierta bajo el resumen
    });

    const abrirCobro = (pedidoId: string) => {
        const datos = leer(() => cashierService.prepareCharge(pedidoId));
        if (datos) setDialogo({ tipo: 'cobro', ...datos });
    };

    const verMasVendidos = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const { inicio = '', fin = '' } = leerFormulario(e.currentTarget);
        if (inicio > fin) notificar('error', 'La fecha inicial no puede ser posterior a la final.');
        else setPeriodo({ inicio, fin });
    };

    const verTicket = (pedidoId: string) => {
        const venta = leer(() => cashierService.getSale(pedidoId));
        if (venta) setDialogo({ tipo: 'ticket', venta });
    };

    return (
        <Section panel="caja" etiqueta="Caja">
            <SectionHeader numero="04" titulo="Caja" lema="Cobra los pedidos que salieron de cocina y cierra el día." />
            <div className="caja">
                <section className="bloque caja__pendientes">
                    <h3 className="bloque__titulo">Por cobrar</h3>
                    <div data-zona="pendientes">
                        {pendientes.data && (pendientes.data.length ? (
                            <ul className="pendientes">{pendientes.data.map((pe, i) => (
                                <li key={pe.id} className="pendiente" style={{ '--i': i } as CSSProperties}>
                                    <span className="pendiente__turno mono">{dosDigitos(pe.turno)}</span>
                                    <div className="pendiente__datos">
                                        <strong>{pe.clienteNombre}</strong>
                                        <span className="tenue">{pe.folio} · en cocina desde {hora(pe.confirmadoEn)} · {pe.detalles.reduce((s, d) => s + d.cantidad, 0)} art.</span>
                                    </div>
                                    <span className="pendiente__total mono">{moneda(pe.total)}</span>
                                    <button type="button" className="boton boton--primario boton--chico" data-accion="cobrar" onClick={() => abrirCobro(pe.id)}>Cobrar</button>
                                </li>
                            ))}</ul>
                        ) : <p className="vacio">Nada pendiente. Los pedidos aparecen aquí al confirmarse en el mostrador.</p>)}
                    </div>
                </section>
                <section className="bloque caja__dia">
                    <div className="bloque__cabeza">
                        <h3 className="bloque__titulo">Corte del día</h3>
                        <label className="campo campo--linea"><span className="oculto">Fecha</span>
                            <input type="date" data-accion="fecha" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} /></label>
                    </div>
                    <div data-zona="dia">{corte.data && (
                        <DailyReport r={corte.data} alCerrar={() => setDialogo({ tipo: 'confirmar-cierre', fecha: corte.data.fecha, pendientes: corte.data.pendientes.length })}
                            alTicket={verTicket} alCliente={(id) => setDialogo({ tipo: 'ventas-cliente', ventas: cashierService.getClientSales(id) })} />
                    )}</div>
                </section>
            </div>
            <div className="rejilla-2">
                <section className="bloque">
                    <div className="bloque__cabeza">
                        <h3 className="bloque__titulo">Semana</h3>
                        <label className="campo campo--linea"><span className="oculto">Semana de</span>
                            <input type="date" data-accion="semana" value={reporteSemana.data?.inicio ?? semana} onChange={(e) => e.target.value && setSemana(e.target.value)} /></label>
                    </div>
                    <div data-zona="semana">
                        {!reporteSemana.data ? <p className="vacio">Elige un día para ver su semana (lunes a domingo).</p> : (() => {
                            const r = reporteSemana.data;
                            const maximo = Math.max(...r.dias.map((d) => d.total), 1);
                            return (
                                <>
                                    <p className="tabla__titulo">{dia(r.inicio)} – {dia(r.fin)} · <strong className="mono">{moneda(r.total)}</strong> en {r.numVentas} ventas</p>
                                    <ol className="columnas">{r.dias.map((d) => (
                                        <li key={d.fecha} title={`${moneda(d.total)} · ${d.numVentas} ventas`}>
                                            <span className="columnas__valor mono">{d.total ? numero(Math.round(d.total)) : ''}</span>
                                            <span className="columnas__barra" style={p(d.total / maximo)} />
                                            <span className="columnas__dia">{dia(d.fecha).split(' ')[0]}</span></li>
                                    ))}</ol>
                                    {r.productos.length > 0 && <details className="desplegable"><summary>Unidades por producto</summary><ProductsTable productos={r.productos} /></details>}
                                </>
                            );
                        })()}
                    </div>
                </section>
                <section className="bloque">
                    <h3 className="bloque__titulo">Más vendidos</h3>
                    <form className="filtros" data-accion="mas-vendidos" onSubmit={verMasVendidos} key={`${periodo.inicio}-${periodo.fin}`}>
                        <label className="campo campo--linea"><span>Del</span><input type="date" name="inicio" required defaultValue={periodo.inicio} /></label>
                        <label className="campo campo--linea"><span>al</span><input type="date" name="fin" required defaultValue={periodo.fin} /></label>
                        <button className="boton boton--chico">Ver</button>
                    </form>
                    <div data-zona="ranking">
                        {masVendidos.data && (masVendidos.data.length ? (() => {
                            const maximo = Math.max(...masVendidos.data.map((x) => x.unidades), 1);
                            return (
                                <ol className="ranking">{masVendidos.data.map((x, i) => (
                                    <li key={`${x.productoId}|${x.tamano}`} style={{ '--i': i } as CSSProperties}>
                                        <span className="ranking__puesto mono">{i + 1}</span>
                                        <span className="ranking__nombre">{x.nombre}{x.tamano && <> <span className="tenue">{etiquetaTamano(x.tamano)}</span></>}</span>
                                        <span className="ranking__barra" style={p(x.unidades / maximo)} />
                                        <span className="mono">{x.unidades} u. · {moneda(x.importe)}</span></li>
                                ))}</ol>
                            );
                        })() : <p className="vacio">Sin ventas en ese periodo.</p>)}
                    </div>
                </section>
            </div>

            {dialogo?.tipo === 'cobro' && (
                <ChargeDialog pedido={dialogo.pedido} totales={dialogo.totales} ocupado={cobrar.isPending} onClose={cerrarDialogo}
                    alCobrar={(metodo, recibido) => void cobrar.run({ pedidoId: dialogo.pedido.id, metodo, recibido })} />
            )}
            {dialogo?.tipo === 'ticket' && <TicketDialog venta={dialogo.venta} onClose={cerrarDialogo} />}
            {dialogo?.tipo === 'cierre' && <ClosingDialog cierre={dialogo.cierre} onClose={cerrarDialogo} />}
            {dialogo?.tipo === 'confirmar-cierre' && (
                <Dialog id="confirmar-cierre" onClose={cerrarDialogo} ancho="dialogo--angosto">
                    <p className="dialogo__rotulo dialogo__rotulo--alerta">Acción definitiva</p>
                    <h3 className="dialogo__titulo">¿Cerrar la caja del {dia(dialogo.fecha)}?</h3>
                    <p>Después del cierre ya no se podrán registrar cobros en esa fecha.</p>
                    {dialogo.pendientes > 0 && <p className="alerta">Hay {dialogo.pendientes} pedido(s) en cocina sin cobrar; quedarán anotados en el cierre.</p>}
                    <div className="formulario__acciones">
                        <CloseDialogButton className="boton boton--texto">Volver</CloseDialogButton>
                        <button type="button" data-accion="confirmar-cierre" onClick={() => void cerrar.run(dialogo.fecha)}
                            {...busyProps(cerrar.isPending, 'boton boton--primario')}>Cerrar caja</button>
                    </div>
                </Dialog>
            )}
            {dialogo?.tipo === 'ventas-cliente' && (
                <Dialog id="ventas-cliente" onClose={cerrarDialogo}>
                    <p className="dialogo__rotulo">Ventas por cliente</p>
                    <h3 className="dialogo__titulo">{dialogo.ventas[0]?.clienteNombre ?? 'Cliente'}</h3>
                    <p>{dialogo.ventas.length} compra(s) · <strong className="mono">{moneda(dialogo.ventas.reduce((s, v) => s + v.importe, 0))}</strong></p>
                    <table className="tabla tabla--compacta">
                        <thead><tr><th>Fecha</th><th>Folio</th><th>Pago</th><th className="num">Importe</th></tr></thead>
                        <tbody>{dialogo.ventas.map((v) => (
                            <tr key={v.id}><td>{fechaHora(v.fecha)}</td><td className="mono">{v.folio}</td>
                                <td>{ETIQUETA_METODO[v.metodoPago]}</td><td className="num mono">{moneda(v.importe)}</td></tr>
                        ))}</tbody>
                    </table>
                </Dialog>
            )}
        </Section>
    );
}

function DailyReport({ r, alCerrar, alTicket, alCliente }: { r: ReporteDiario; alCerrar: () => void; alTicket: (id: string) => void; alCliente: (id: string) => void }) {
    const maximo = Math.max(...Object.values(r.porMetodo), 1);
    return (
        <>
            <div className="corte">
                <p className="corte__total"><span className="corte__etiqueta">Ingresos {r.esHoy ? 'de hoy' : dia(r.fecha)}</span>
                    <span className="corte__cifra mono">{moneda(r.total)}</span></p>
                <div className="cifras">
                    <div className="cifra"><span className="cifra__valor">{r.numVentas}</span><span className="cifra__nombre">ventas</span></div>
                    <div className="cifra"><span className="cifra__valor">{r.unidades}</span><span className="cifra__nombre">artículos</span></div>
                    <div className="cifra"><span className="cifra__valor">{moneda(r.ticketPromedio)}</span><span className="cifra__nombre">ticket promedio</span></div>
                </div>
                <ul className="barras">{(Object.entries(r.porMetodo) as [MetodoPago, number][]).map(([m, v]) => (
                    <li key={m}><span>{ETIQUETA_METODO[m]}</span><span className="barras__pista"><span style={p(v / maximo)} /></span>
                        <span className="mono">{moneda(v)}</span></li>
                ))}</ul>
                {r.cierre
                    ? <p className="sello sello--cerrado">Caja cerrada · {fechaHora(r.cierre.generadoEn)}</p>
                    : <>
                        <button type="button" className="boton boton--ancho" data-accion="cerrar-caja" onClick={alCerrar}>Cerrar caja del {dia(r.fecha)}</button>
                        {r.pendientes.length > 0 && <p className="alerta tenue">{r.pendientes.length} pedido(s) de este día siguen sin cobrar.</p>}
                    </>}
            </div>
            {r.ventas.length > 0 && (
                <details className="desplegable">
                    <summary>Ventas del día ({r.ventas.length})</summary>
                    <table className="tabla tabla--compacta">
                        <thead><tr><th>Hora</th><th>Folio</th><th>Cliente</th><th>Pago</th><th className="num">Importe</th></tr></thead>
                        <tbody>{r.ventas.map((v) => (
                            <tr key={v.id}>
                                <td>{hora(v.fecha)}</td>
                                <td><button type="button" className="enlace mono" data-accion="ticket" onClick={() => alTicket(v.pedidoId)}>{v.folio}</button></td>
                                <td><button type="button" className="enlace" data-accion="cliente" onClick={() => alCliente(v.clienteId)}>{v.clienteNombre}</button></td>
                                <td>{ETIQUETA_METODO[v.metodoPago]}</td>
                                <td className="num mono">{moneda(v.importe)}</td></tr>
                        ))}</tbody>
                    </table>
                </details>
            )}
            {r.productos.length > 0 && (
                <details className="desplegable">
                    <summary>Productos vendidos ({r.productos.reduce((s, x) => s + x.unidades, 0)} u.)</summary>
                    <ProductsTable productos={r.productos} />
                </details>
            )}
        </>
    );
}

function ProductsTable({ productos }: { productos: ProductoVendido[] }) {
    return (
        <table className="tabla tabla--compacta">
            <thead><tr><th>Producto</th><th className="num">Unidades</th><th className="num">Importe</th></tr></thead>
            <tbody>{productos.map((x) => (
                <tr key={`${x.productoId}|${x.tamano}`}><td>{x.nombre}{x.tamano && <> <span className="tenue">{etiquetaTamano(x.tamano)}</span></>}</td>
                    <td className="num mono">{x.unidades}</td><td className="num mono">{moneda(x.importe)}</td></tr>
            ))}</tbody>
        </table>
    );
}

interface ChargeProps {
    pedido: Pedido;
    totales: TotalesPedido;
    ocupado: boolean;
    alCobrar: (metodo: MetodoPago, recibido: number | null) => void;
    onClose: () => void;
}

/** I8: en efectivo, recibido ≥ total y el cambio se calcula en vivo. */
function ChargeDialog({ pedido, totales, ocupado, alCobrar, onClose }: ChargeProps) {
    const [metodo, setMetodo] = useState<MetodoPago>('efectivo');
    const [recibido, setRecibido] = useState('');
    const total = totales.total;
    const r = Number(recibido);
    const rapidos = [...new Set([total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, 1000])].filter((v) => v >= total).slice(0, 4);
    const efectivo = metodo === 'efectivo';
    const enviar = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        alCobrar(metodo, efectivo ? r : null);
    };
    return (
        <Dialog id="cobro" onClose={onClose} ancho="dialogo--angosto">
            <p className="dialogo__rotulo">Cobro · {pedido.folio} · turno {pedido.turno}</p>
            <h3 className="dialogo__titulo">{pedido.clienteNombre}</h3>
            <p className="cobro__total mono" data-total={total}>{moneda(total)}</p>
            <form className="formulario" data-accion="registrar-cobro" onSubmit={enviar}>
                <fieldset className="segmentado segmentado--ancho">
                    <legend className="oculto">Método de pago</legend>
                    {(Object.entries(ETIQUETA_METODO) as [MetodoPago, string][]).map(([m, n]) => (
                        <label key={m}><input type="radio" name="metodo" value={m} checked={metodo === m} data-accion="metodo" onChange={() => setMetodo(m)} /><span>{n}</span></label>
                    ))}
                </fieldset>
                <div data-grupo="efectivo" hidden={!efectivo}>
                    <label className="campo"><span>Recibido</span>
                        <input name="recibido" type="number" min={total} step={0.5} inputMode="decimal" required={efectivo} disabled={!efectivo}
                            value={recibido} onChange={(e) => setRecibido(e.target.value)} data-autofocus /></label>
                    <div className="rapidos">{rapidos.map((v) => (
                        <button key={v} type="button" className="boton boton--chico" data-accion="rapido" onClick={() => setRecibido(String(v))}>{moneda(v)}</button>
                    ))}</div>
                    <p className="cobro__cambio">Cambio: <strong className={`mono ${r > 0 && r < total ? 'alerta' : ''}`.trim()} data-zona="cambio">
                        {r >= total ? moneda(r - total) : r ? `faltan ${moneda(total - r)}` : '—'}</strong></p>
                </div>
                <div className="formulario__acciones">
                    <CloseDialogButton className="boton boton--texto">Cancelar</CloseDialogButton>
                    <button {...busyProps(ocupado, 'boton boton--primario')}>Registrar pago</button>
                </div>
            </form>
        </Dialog>
    );
}

function TicketDialog({ venta, onClose }: { venta: Venta; onClose: () => void }) {
    return (
        <Dialog id="ticket" onClose={onClose} ancho="dialogo--ticket">
            <div className="ticket">
                <p className="ticket__marca">La Pizzería</p>
                <p className="ticket__linea">{fechaHora(venta.fecha)}</p>
                <p className="ticket__linea">{venta.folio} · Turno {dosDigitos(venta.turno)}</p>
                <p className="ticket__linea">{venta.clienteNombre}</p>
                <hr />
                {venta.detalles.map((d) => (
                    <p key={d.id} className="ticket__fila"><span>{d.cantidad} {d.nombre}{d.tamano ? ` ${d.tamano.slice(0, 3).toUpperCase()}` : ''}</span>
                        <span>{moneda(d.subtotal)}</span></p>
                ))}
                <hr />
                <p className="ticket__fila ticket__fila--total"><span>TOTAL</span><span>{moneda(venta.importe)}</span></p>
                <p className="ticket__fila"><span>{ETIQUETA_METODO[venta.metodoPago]}</span><span>{moneda(venta.recibido)}</span></p>
                {venta.cambio > 0 && <p className="ticket__fila"><span>Cambio</span><span>{moneda(venta.cambio)}</span></p>}
                <p className="ticket__pie">IVA incluido · ¡Gracias por su visita!</p>
            </div>
            <CloseDialogButton className="boton boton--ancho" autoFocus>Listo</CloseDialogButton>
        </Dialog>
    );
}

function ClosingDialog({ cierre, onClose }: { cierre: Cierre; onClose: () => void }) {
    return (
        <Dialog id="cierre" onClose={onClose}>
            <p className="dialogo__rotulo">Cierre de caja guardado</p>
            <h3 className="dialogo__titulo">{dia(cierre.fecha)}</h3>
            <p className="corte__cifra mono">{moneda(cierre.total)}</p>
            <dl className="ficha">
                <div><dt>Ventas</dt><dd>{cierre.numVentas}</dd></div>
                <div><dt>Efectivo en caja</dt><dd className="mono">{moneda(cierre.efectivo)}</dd></div>
                <div><dt>Tarjeta</dt><dd className="mono">{moneda(cierre.tarjeta)}</dd></div>
                <div><dt>Transferencia</dt><dd className="mono">{moneda(cierre.transferencia)}</dd></div>
                <div><dt>Pedidos sin cobrar</dt><dd className={cierre.pedidosPendientes ? 'alerta' : ''}>{cierre.pedidosPendientes}</dd></div>
            </dl>
            {cierre.productos && cierre.productos.length > 0 && <ProductsTable productos={cierre.productos} />}
            <CloseDialogButton className="boton boton--primario boton--ancho" autoFocus>Listo</CloseDialogButton>
        </Dialog>
    );
}
