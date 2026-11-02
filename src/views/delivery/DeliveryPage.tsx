// 05 · Domicilio — tablero de reparto (I10). Cada cliente lleva el color de su estado y el texto,
// para no depender solo del color.

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import {
    useDeliveryActions, useDomicilioDiaQuery, useDomicilioSemanaQuery, useDomiciliosQuery, useFechaDomicilio, useSemanaDomicilio,
} from '../../store/delivery.store';
import { useNotify } from '../../store/notifications';
import { useSafeRead } from '../../store/useBusinessMutation';
import { deliveryService } from '../../services/delivery.service';
import { dia, etiquetaTamano, hora, moneda, numero } from '../../shared/format';
import { CloseDialogButton, Dialog } from '../components/Dialog';
import { Section, SectionHeader, busyProps } from '../components/SectionHeader';
import type { Domicilio, EstadoDomicilio, Pedido } from '../../types/domain';

const ESTADO: Record<EstadoDomicilio, { texto: string; clase: string }> = {
    captura: { texto: 'En captura', clase: 'captura' },
    en_proceso: { texto: 'En proceso de entrega', clase: 'proceso' },
    entregado: { texto: 'Entregado', clase: 'entregado' },
    no_entregado: { texto: 'No entregado', clase: 'fallido' },
    cancelado: { texto: 'Cancelado', clase: 'cancelado' },
};

const p = (valor: number) => ({ '--p': valor }) as CSSProperties;

export function DeliveryPage() {
    const notificar = useNotify();
    const leer = useSafeRead();
    const [entrega, setEntrega] = useState<{ domicilio: Domicilio; pedido: Pedido | null } | null>(null);
    const [fecha, setFecha] = useFechaDomicilio();
    const [semana, setSemana] = useSemanaDomicilio();
    const lista = useDomiciliosQuery();
    const diaQ = useDomicilioDiaQuery(fecha);
    const semanaQ = useDomicilioSemanaQuery(semana);

    const { registrar } = useDeliveryActions({
        alRegistrar: (d, advertencia) => {
            if (advertencia) notificar('error', advertencia);
            setEntrega(null);
            notificar(d.estado === 'entregado' ? 'exito' : 'info', d.estado === 'entregado'
                ? `${d.folio} entregado en ${d.minutos} min (${d.aTiempo ? 'a tiempo' : 'fuera de tiempo'}).`
                : `${d.folio} no entregado: ${d.motivo}.`);
        },
    });

    const abrirEntrega = (pedidoId: string) => {
        const datos = leer(() => deliveryService.prepareDelivery(pedidoId));
        if (datos) setEntrega(datos);
    };

    return (
        <Section panel="domicilio" etiqueta="Domicilio">
            <SectionHeader numero="05" titulo="Domicilio" lema="Entrega en 40 minutos o menos. Se cobra al entregar, aparte de la caja del mostrador." />
            <ul className="leyenda" aria-label="Significado de los colores">
                <li className="leyenda__item leyenda__item--entregado">Entregado</li>
                <li className="leyenda__item leyenda__item--proceso">En proceso de entrega</li>
                <li className="leyenda__item leyenda__item--fallido">No entregado</li>
                <li className="leyenda__item leyenda__item--captura">En captura en mostrador</li>
            </ul>
            <div className="reparto">
                <section className="bloque reparto__lista">
                    <h3 className="bloque__titulo">Clientes de hoy</h3>
                    <div data-zona="lista">
                        {lista.data && (lista.data.length ? (
                            <ul className="entregas">{lista.data.map((d, i) => <DeliveryCard key={d.id} d={d} i={i} alEntregar={abrirEntrega} />)}</ul>
                        ) : <p className="vacio">Sin pedidos a domicilio hoy. Se capturan en el Mostrador con la opción «A domicilio».</p>)}
                    </div>
                </section>
                <section className="bloque reparto__resumen">
                    <div className="bloque__cabeza">
                        <h3 className="bloque__titulo">Recaudación</h3>
                        <label className="campo campo--linea"><span className="oculto">Fecha</span>
                            <input type="date" data-accion="fecha" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} /></label>
                    </div>
                    <div data-zona="dia">{diaQ.data && (() => {
                        const r = diaQ.data;
                        return (
                            <div className="corte corte--reparto">
                                <p className="corte__total"><span className="corte__etiqueta">Recaudado {r.esHoy ? 'hoy' : dia(r.fecha)}</span>
                                    <span className="corte__cifra mono">{moneda(r.recaudacion)}</span></p>
                                <div className="cifras">
                                    <div className="cifra"><span className="cifra__valor">{r.atendidos}</span><span className="cifra__nombre">atendidos</span></div>
                                    <div className="cifra"><span className="cifra__valor">{r.porcentajeATiempo}%</span><span className="cifra__nombre">a tiempo</span></div>
                                    <div className="cifra"><span className="cifra__valor">{r.minutosPromedio}′</span><span className="cifra__nombre">promedio</span></div>
                                </div>
                                <dl className="ficha ficha--oscura">
                                    <div><dt>Entregados</dt><dd className="mono">{r.entregados}</dd></div>
                                    <div><dt>No entregados</dt><dd className="mono">{r.noEntregados}</dd></div>
                                    <div><dt>Importe no cobrado</dt><dd className="mono">{moneda(r.perdida)}</dd></div>
                                </dl>
                            </div>
                        );
                    })()}</div>
                    <div className="bloque__cabeza bloque__cabeza--separada">
                        <h3 className="bloque__titulo">Semana</h3>
                        <label className="campo campo--linea"><span className="oculto">Semana de</span>
                            <input type="date" data-accion="semana" value={semanaQ.data?.inicio ?? semana} onChange={(e) => e.target.value && setSemana(e.target.value)} /></label>
                    </div>
                    <div data-zona="semana">{semanaQ.data && (() => {
                        const r = semanaQ.data;
                        const maximo = Math.max(...r.dias.map((d) => d.recaudacion), 1);
                        return (
                            <>
                                <p className="tabla__titulo">{dia(r.inicio)} – {dia(r.fin)} · <strong className="mono">{moneda(r.recaudacion)}</strong>
                                    {' '}en {r.atendidos} pedidos · {r.porcentajeATiempo}% a tiempo</p>
                                <ol className="columnas columnas--reparto">{r.dias.map((d) => (
                                    <li key={d.fecha} title={`${moneda(d.recaudacion)} · ${d.atendidos} pedidos`}>
                                        <span className="columnas__valor mono">{d.atendidos ? numero(d.atendidos) : ''}</span>
                                        <span className="columnas__barra" style={p(d.recaudacion / maximo)} />
                                        <span className="columnas__dia">{dia(d.fecha).split(' ')[0]}</span></li>
                                ))}</ol>
                            </>
                        );
                    })()}</div>
                </section>
            </div>
            {entrega && (
                <DeliveryDialog d={entrega.domicilio} pedido={entrega.pedido} ocupado={registrar.isPending} onClose={() => setEntrega(null)}
                    alRegistrar={(entregado, motivo) => void registrar.run({ pedidoId: entrega.domicilio.id, entregado, motivo })} />
            )}
        </Section>
    );
}

function DeliveryCard({ d, i, alEntregar }: { d: Domicilio; i: number; alEntregar: (id: string) => void }) {
    const e = ESTADO[d.estado];
    const transcurridos = d.transcurridos ?? 0;
    const proporcion = d.estado === 'en_proceso' ? Math.min(1, transcurridos / d.plazo) : 0;
    return (
        <li className={`entrega entrega--${e.clase} ${d.retrasado ? 'entrega--retrasada' : ''}`} style={{ '--i': i } as CSSProperties}>
            <div className="entrega__cabeza">
                <p className="entrega__cliente">{d.clienteNombre}</p>
                <span className="entrega__estado">{e.texto}</span>
            </div>
            <p className="entrega__direccion">{d.direccion}{d.referencias && <span className="tenue"> · {d.referencias}</span>}</p>
            <p className="entrega__meta mono">{d.folio} · Tel. {d.telefono}{d.total ? ` · ${moneda(d.total)}` : ''}</p>
            {d.estado === 'en_proceso' && (
                <>
                    <div className="plazo" role="img" aria-label={`${transcurridos} de ${d.plazo} minutos`}>
                        <span className="plazo__pista"><span style={p(proporcion)} /></span>
                        <span className="plazo__texto mono">{d.retrasado ? `+${transcurridos - d.plazo} min de retraso` : `${transcurridos} / ${d.plazo} min`}</span>
                    </div>
                    <button type="button" className="boton boton--chico boton--primario" data-accion="entregar" onClick={() => alEntregar(d.id)}>Registrar entrega</button>
                </>
            )}
            {d.estado === 'entregado' && (
                <p className="entrega__cierre">
                    <span className={d.aTiempo ? 'positivo' : 'alerta'}>{d.aTiempo ? 'A tiempo' : 'Fuera de tiempo'}</span>
                    {' '}· {d.minutos} min · cobrado <strong className="mono">{moneda(d.importeCobrado)}</strong> · {hora(d.cerradoEn)}</p>
            )}
            {d.estado === 'no_entregado' && <p className="entrega__cierre"><span className="alerta">{d.motivo}</span> · sin cobro · {hora(d.cerradoEn)}</p>}
            {d.estado === 'captura' && <p className="entrega__cierre tenue">Aún no se confirma en el mostrador.</p>}
            {d.estado === 'cancelado' && <p className="entrega__cierre tenue">Cancelado{d.motivo ? `: ${d.motivo}` : ''}</p>}
        </li>
    );
}

interface DialogProps {
    d: Domicilio;
    pedido: Pedido | null;
    ocupado: boolean;
    alRegistrar: (entregado: boolean, motivo: string) => void;
    onClose: () => void;
}

/** Registro del repartidor: solo «¿se entregó?». El cobro y el «a tiempo» los calcula el sistema. */
function DeliveryDialog({ d, pedido, ocupado, alRegistrar, onClose }: DialogProps) {
    const [entregado, setEntregado] = useState(true);
    const motivoRef = useRef<HTMLInputElement>(null);
    useEffect(() => { if (!entregado) motivoRef.current?.focus(); }, [entregado]);
    const transcurridos = d.transcurridos ?? 0;
    const aTiempo = transcurridos <= d.plazo;
    const enviar = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const motivo = motivoRef.current?.value ?? '';
        // Si se escribió un motivo y luego se cambió a «Entregado», ese texto se descarta.
        alRegistrar(entregado, entregado ? '' : motivo);
    };
    return (
        <Dialog id="entrega" onClose={onClose} ancho="dialogo--angosto">
            <p className="dialogo__rotulo">Repartidor · {d.folio}</p>
            <h3 className="dialogo__titulo">{d.clienteNombre}</h3>
            <p className="tenue">{d.direccion}</p>
            <ul className="lista-simple">{(pedido?.detalles ?? []).map((l) => (
                <li key={l.id}>{l.cantidad} × {l.nombre}{l.tamano ? ` ${etiquetaTamano(l.tamano)}` : ''}</li>
            ))}</ul>
            <form className="formulario" data-accion="registrar-entrega" onSubmit={enviar}>
                <fieldset className="segmentado segmentado--ancho">
                    <legend className="oculto">¿Pedido entregado?</legend>
                    <label><input type="radio" name="resultado" value="si" checked={entregado} onChange={() => setEntregado(true)} /><span>Entregado</span></label>
                    <label><input type="radio" name="resultado" value="no" checked={!entregado} onChange={() => setEntregado(false)} /><span>No entregado</span></label>
                </fieldset>
                <dl className="ficha" data-grupo="si" hidden={!entregado}>
                    <div><dt>Tiempo</dt><dd className={aTiempo ? 'positivo' : 'alerta'}>{transcurridos} min · {aTiempo ? 'a tiempo' : 'fuera de tiempo'}</dd></div>
                    <div><dt>Cobro (total del pedido)</dt><dd className="mono"><strong>{moneda(d.total)}</strong></dd></div>
                </dl>
                <label className="campo" data-grupo="no" hidden={entregado}><span>Motivo</span>
                    <input ref={motivoRef} name="motivo" maxLength={60} disabled={entregado} required={!entregado}
                        placeholder="Ej. nadie atendió, dirección incorrecta" /></label>
                <p className="dialogo__nota">Todo o nada: si no se entrega no se cobra, y lo preparado no regresa al almacén.</p>
                <div className="formulario__acciones">
                    <CloseDialogButton className="boton boton--texto">Cancelar</CloseDialogButton>
                    <button {...busyProps(ocupado, 'boton boton--primario')}>Registrar</button>
                </div>
            </form>
        </Dialog>
    );
}
