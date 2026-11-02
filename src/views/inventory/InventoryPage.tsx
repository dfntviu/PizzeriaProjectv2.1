// 03 · Inventario — alertas, existencias, recetas técnicas, consumo y movimientos (I6).

import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import {
    useAlertasQuery, useConsultaConsumo, useConsumoQuery, useExistenciasQuery, useInventoryActions, useMovimientosQuery,
    usePeriodoMovimientos, usePizzasQuery, useRecetaQuery, useRecetaSeleccionada,
} from '../../store/inventory.store';
import { useNotify } from '../../store/notifications';
import { ETIQUETA_TAMANO, TAMANOS, fechaHora, leerFormulario, numero } from '../../shared/format';
import { CloseDialogButton, Dialog } from '../components/Dialog';
import { Section, SectionHeader, busyProps } from '../components/SectionHeader';
import type { TipoMovimientoManual, VistaReceta } from '../../services/inventory.service';
import type { ArticuloInventario, LineaReceta, NivelStock, TipoMovimiento } from '../../types/domain';

const NIVEL: Record<NivelStock, string> = { ok: 'Suficiente', bajo: 'Bajo mínimo', agotado: 'Agotado' };
const TIPO: Record<TipoMovimiento, string> = { entrada: 'Entrada', merma: 'Merma', ajuste: 'Ajuste', consumo: 'Consumo', devolucion: 'Devolución' };
const FORM: Record<TipoMovimientoManual, { titulo: string; rotulo: string; cantidad: string; motivo: string; requerido: boolean }> = {
    entrada: { titulo: 'Entrada de almacén', rotulo: 'Recepción de mercancía', cantidad: 'Cantidad recibida', motivo: 'Proveedor o nota', requerido: false },
    merma: { titulo: 'Registrar merma', rotulo: 'Pérdida de inventario', cantidad: 'Cantidad perdida', motivo: 'Motivo (caducado, dañado…)', requerido: true },
    ajuste: { titulo: 'Ajuste por conteo', rotulo: 'Inventario físico', cantidad: 'Existencia contada', motivo: 'Justificación', requerido: true },
};

type DialogoInventario = { tipo: 'movimiento'; movimiento: TipoMovimientoManual; id: string } | { tipo: 'ingrediente' } | null;

export function InventoryPage() {
    const notificar = useNotify();
    const [dialogo, setDialogo] = useState<DialogoInventario>(null);
    const [periodo, setPeriodo] = usePeriodoMovimientos();
    const [consulta, setConsulta] = useConsultaConsumo();
    const [seleccion, setSeleccion] = useRecetaSeleccionada();

    const existencias = useExistenciasQuery();
    const alertas = useAlertasQuery();
    const movimientos = useMovimientosQuery(periodo);
    const consumo = useConsumoQuery(consulta);
    const pizzas = usePizzasQuery();
    const receta = useRecetaQuery(seleccion);

    // Primera visita: la primera pizza del catálogo en tamaño mediano (como v2.1.0).
    useEffect(() => {
        const primera = pizzas.data?.[0];
        if (!seleccion && primera) setSeleccion({ productoId: primera.id, tamano: 'mediana' });
    }, [pizzas.data, seleccion, setSeleccion]);

    const acciones = useInventoryActions({
        alTerminar: (tipo, aviso) => {
            notificar(tipo, aviso);
            setDialogo(null);
        },
    });

    const items = existencias.data ? [...existencias.data.ingredientes, ...existencias.data.productos] : [];
    const abrirMovimiento = (movimiento: TipoMovimientoManual, id = '') => setDialogo({ tipo: 'movimiento', movimiento, id });

    const filtrarMovimientos = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const { inicio = '', fin = '' } = leerFormulario(e.currentTarget);
        if (inicio > fin) notificar('error', 'La fecha inicial no puede ser posterior a la final.');
        else setPeriodo({ inicio, fin });
    };

    const consultarConsumo = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        setConsulta({ modo: submitter?.value === 'semana' ? 'semana' : 'dia', fecha: leerFormulario(e.currentTarget).fecha ?? '' });
    };

    return (
        <Section panel="inventario" etiqueta="Inventario">
            <SectionHeader numero="03" titulo="Inventario" lema="Materias primas por peso o volumen, productos terminados por pieza.">
                <div className="seccion__accion grupo-botones">
                    <button type="button" className="boton boton--primario" data-accion="movimiento" data-tipo="entrada" onClick={() => abrirMovimiento('entrada')}>Entrada</button>
                    <button type="button" className="boton" data-accion="movimiento" data-tipo="merma" onClick={() => abrirMovimiento('merma')}>Merma</button>
                    <button type="button" className="boton" data-accion="movimiento" data-tipo="ajuste" onClick={() => abrirMovimiento('ajuste')}>Ajuste</button>
                    <button type="button" className="boton boton--texto" data-accion="nuevo-ingrediente" onClick={() => setDialogo({ tipo: 'ingrediente' })}>+ Ingrediente</button>
                </div>
            </SectionHeader>

            <div data-zona="alertas">
                {alertas.data && (alertas.data.length ? (
                    <div className="alertas" role="status">
                        <p className="alertas__titulo">{alertas.data.length} artículo{alertas.data.length > 1 ? 's' : ''} por reabastecer</p>
                        <ul>{alertas.data.map((a) => (
                            <li key={a.id} className={`alertas__item alertas__item--${a.nivel}`}>
                                <button type="button" className="enlace" data-accion="movimiento" data-tipo="entrada" onClick={() => abrirMovimiento('entrada', a.id)}>{a.nombre}</button>
                                <span className="mono">{numero(a.stock)}/{numero(a.stockMinimo)} {a.unidad}</span></li>
                        ))}</ul>
                    </div>
                ) : <p className="alertas alertas--ok">Todo el inventario está por encima de su mínimo.</p>)}
            </div>

            <div className="rejilla-2">
                <section className="bloque"><h3 className="bloque__titulo">Materias primas</h3>
                    <div data-zona="ingredientes"><StockTable items={existencias.data?.ingredientes ?? []} alEntrada={(id) => abrirMovimiento('entrada', id)} /></div></section>
                <section className="bloque"><h3 className="bloque__titulo">Productos terminados</h3>
                    <div data-zona="productos"><StockTable items={existencias.data?.productos ?? []} alEntrada={(id) => abrirMovimiento('entrada', id)} /></div></section>
            </div>

            <section className="bloque">
                <h3 className="bloque__titulo">Recetas técnicas</h3>
                <p className="bloque__nota">Cantidad de cada insumo por pizza. Al confirmar un pedido se descuenta automáticamente.</p>
                <div data-zona="selector-receta">
                    {pizzas.data && (pizzas.data.length ? (
                        <div className="filtros">
                            <label className="campo campo--linea"><span>Pizza</span>
                                <select data-accion="receta-pizza" value={seleccion?.productoId ?? ''}
                                    onChange={(e) => setSeleccion({ productoId: e.target.value, tamano: seleccion?.tamano ?? 'mediana' })}>
                                    {pizzas.data.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? '' : ' (inactiva)'}</option>)}
                                </select></label>
                            <div className="segmentado" role="radiogroup" aria-label="Tamaño">
                                {TAMANOS.map((t) => (
                                    <label key={t}><input type="radio" name="receta-tamano" value={t} data-accion="receta-tamano"
                                        checked={t === seleccion?.tamano}
                                        onChange={() => seleccion && setSeleccion({ productoId: seleccion.productoId, tamano: t })} />
                                        <span>{ETIQUETA_TAMANO[t]}</span></label>
                                ))}
                            </div>
                        </div>
                    ) : <p className="vacio">Registra una pizza en el catálogo para definir su receta.</p>)}
                </div>
                <div data-zona="receta">
                    {receta.data && (
                        <RecipeEditor key={`${receta.data.producto.id}|${receta.data.tamano}|${receta.dataUpdatedAt}`} vista={receta.data}
                            ocupado={acciones.receta.isPending}
                            alGuardar={(ingredientes) => void acciones.receta.run({ productoId: receta.data!.producto.id, tamano: receta.data!.tamano, ingredientes })} />
                    )}
                </div>
            </section>

            <div className="rejilla-2">
                <section className="bloque">
                    <h3 className="bloque__titulo">Consumo</h3>
                    <form className="filtros" data-accion="consumo" onSubmit={consultarConsumo} key={`consumo-${consumo.data?.fecha ?? consulta.fecha}`}>
                        <label className="campo campo--linea"><span>Fecha</span>
                            <input type="date" name="fecha" required defaultValue={consumo.data?.fecha ?? consulta.fecha} /></label>
                        <button className="boton boton--chico" name="modo" value="dia">Día</button>
                        <button className="boton boton--chico" name="modo" value="semana">Semana</button>
                    </form>
                    <div data-zona="consumo">
                        {consumo.data && (
                            <>
                                <p className="tabla__titulo">{consumo.data.titulo}</p>
                                {consumo.data.consumo.length ? (
                                    <table className="tabla tabla--compacta">
                                        <thead><tr><th>Insumo</th><th className="num">Consumido</th></tr></thead>
                                        <tbody>{consumo.data.consumo.map((c) => (
                                            <tr key={c.itemId}><td>{c.nombre}</td><td className="num mono">{numero(c.cantidad)} {c.unidad}</td></tr>
                                        ))}</tbody>
                                    </table>
                                ) : <p className="vacio">Sin consumo registrado en ese periodo.</p>}
                            </>
                        )}
                    </div>
                </section>
                <section className="bloque">
                    <h3 className="bloque__titulo">Historial de movimientos</h3>
                    <form className="filtros" data-accion="filtrar-movimientos" onSubmit={filtrarMovimientos} key={`mov-${periodo.inicio}-${periodo.fin}`}>
                        <label className="campo campo--linea"><span>Del</span><input type="date" name="inicio" required defaultValue={periodo.inicio} /></label>
                        <label className="campo campo--linea"><span>al</span><input type="date" name="fin" required defaultValue={periodo.fin} /></label>
                        <button className="boton boton--chico">Filtrar</button>
                    </form>
                    <div data-zona="movimientos" className="desplazable">
                        {movimientos.data && (movimientos.data.length ? (
                            <table className="tabla tabla--compacta">
                                <thead><tr><th>Fecha</th><th>Tipo</th><th>Artículo</th><th className="num">Cant.</th><th className="num">Queda</th></tr></thead>
                                <tbody>{movimientos.data.map((m) => (
                                    <tr key={m.id}>
                                        <td>{fechaHora(m.fecha)}</td>
                                        <td><span className={`etiqueta etiqueta--${m.tipo}`}>{TIPO[m.tipo]}</span></td>
                                        <td>{m.itemNombre}<br /><span className="tenue">{m.motivo}</span></td>
                                        <td className={`num mono ${m.cantidad < 0 ? 'negativo' : 'positivo'}`}>{m.cantidad > 0 ? '+' : ''}{numero(m.cantidad)} {m.unidad}</td>
                                        <td className="num mono">{numero(m.stockResultante)}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        ) : <p className="vacio">Sin movimientos en ese periodo.</p>)}
                    </div>
                </section>
            </div>

            {dialogo?.tipo === 'movimiento' && (
                <MovementDialog tipo={dialogo.movimiento} idInicial={dialogo.id} items={items} ocupado={acciones.movimiento.isPending}
                    onClose={() => setDialogo(null)} alGuardar={(datos) => void acciones.movimiento.run({ tipo: dialogo.movimiento, datos })} />
            )}
            {dialogo?.tipo === 'ingrediente' && (
                <IngredientDialog ocupado={acciones.ingrediente.isPending} onClose={() => setDialogo(null)}
                    alGuardar={(datos) => void acciones.ingrediente.run(datos)} />
            )}
        </Section>
    );
}

function StockTable({ items, alEntrada }: { items: ArticuloInventario[]; alEntrada: (id: string) => void }) {
    if (!items.length) return <p className="vacio">Sin registros.</p>;
    return (
        <table className="tabla tabla--compacta">
            <thead><tr><th>Artículo</th><th className="num">Existencia</th><th className="medidor-col"><span className="oculto">Nivel</span></th><th><span className="oculto">Acciones</span></th></tr></thead>
            <tbody>{items.map((i) => {
                const proporcion = Math.min(1, i.stock / Math.max(i.stockMinimo * 3, 1));
                return (
                    <tr key={i.id}>
                        <td>{i.nombre}<br /><span className="tenue">mín. {numero(i.stockMinimo)} {i.unidad}</span></td>
                        <td className="num mono">{numero(i.stock)} <span className="tenue">{i.unidad}</span></td>
                        <td><span className={`medidor medidor--${i.nivel}`} style={{ '--p': proporcion } as CSSProperties} title={NIVEL[i.nivel]}><span /></span></td>
                        <td className="acciones"><button type="button" className="boton boton--texto" data-accion="movimiento" data-tipo="entrada" onClick={() => alEntrada(i.id)}>Entrada</button></td>
                    </tr>
                );
            })}</tbody>
        </table>
    );
}

function RecipeEditor({ vista, ocupado, alGuardar }: { vista: VistaReceta; ocupado: boolean; alGuardar: (l: LineaReceta[]) => void }) {
    const { producto, tamano, receta, ingredientes, disponibles } = vista;
    const cantidades = Object.fromEntries((receta?.ingredientes ?? []).map((l) => [l.ingredienteId, l.cantidad]));
    const ordenados = [...ingredientes.filter((i) => cantidades[i.id]), ...ingredientes.filter((i) => !cantidades[i.id])];
    const enviar = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const lineas = [...e.currentTarget.querySelectorAll<HTMLInputElement>('input[data-ingrediente]')]
            .map((i) => ({ ingredienteId: i.dataset.ingrediente ?? '', cantidad: Number(i.value) }));
        alGuardar(lineas);
    };
    return (
        <form className="receta" data-accion="guardar-receta" onSubmit={enviar}>
            <div className="receta__resumen">
                <p className="receta__nombre">{producto.nombre} <span>{ETIQUETA_TAMANO[tamano]}</span></p>
                <p className={receta ? '' : 'alerta'}>{receta
                    ? <>Con el stock actual alcanza para <strong className="mono">{disponibles}</strong> pizza{disponibles === 1 ? '' : 's'}.</>
                    : 'Sin receta: esta pizza no se puede vender en este tamaño.'}</p>
            </div>
            <div className="receta__lineas">
                {ordenados.map((i) => (
                    <label key={i.id} className={`receta__linea ${cantidades[i.id] ? 'usada' : ''}`}>
                        <span>{i.nombre}</span>
                        <input type="number" min={0} step={1} inputMode="decimal" defaultValue={cantidades[i.id] ?? ''} placeholder="0" data-ingrediente={i.id} />
                        <span className="tenue">{i.unidad}</span></label>
                ))}
            </div>
            <div className="formulario__acciones"><button {...busyProps(ocupado, 'boton boton--primario')}>Guardar receta</button></div>
        </form>
    );
}

interface MovementProps {
    tipo: TipoMovimientoManual;
    idInicial: string;
    items: ArticuloInventario[];
    ocupado: boolean;
    alGuardar: (datos: { id: string; cantidad: string; motivo: string }) => void;
    onClose: () => void;
}

function MovementDialog({ tipo, idInicial, items, ocupado, alGuardar, onClose }: MovementProps) {
    const cfg = FORM[tipo];
    const [id, setId] = useState(idInicial);
    const item = items.find((i) => i.id === id);
    const grupos = [['ingrediente', 'Materias primas'], ['producto', 'Productos terminados']] as const;
    const enviar = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const d = leerFormulario(e.currentTarget);
        alGuardar({ id: d.id ?? '', cantidad: d.cantidad ?? '', motivo: d.motivo ?? '' });
    };
    return (
        <Dialog id="movimiento" onClose={onClose} ancho="dialogo--angosto">
            <p className="dialogo__rotulo">{cfg.rotulo}</p>
            <h3 className="dialogo__titulo">{cfg.titulo}</h3>
            <form className="formulario" data-accion="guardar-movimiento" data-tipo={tipo} autoComplete="off" onSubmit={enviar}>
                <label className="campo"><span>Artículo</span>
                    <select name="id" required value={id} onChange={(e) => setId(e.target.value)} data-autofocus={idInicial ? undefined : true}>
                        <option value="">Elige…</option>
                        {grupos.map(([g, nombre]) => (
                            <optgroup key={g} label={nombre}>
                                {items.filter((i) => i.itemTipo === g).map((i) => <option key={i.id} value={i.id}>{i.nombre} — {numero(i.stock)} {i.unidad}</option>)}
                            </optgroup>
                        ))}
                    </select></label>
                <label className="campo"><span>{cfg.cantidad} <em data-zona="unidad">{item ? `en ${item.unidad} · hay ${numero(item.stock)}` : ''}</em></span>
                    <input name="cantidad" type="number" min={tipo === 'ajuste' ? 0 : 0.01} step="any" required inputMode="decimal"
                        data-autofocus={idInicial ? true : undefined} /></label>
                <label className="campo"><span>{cfg.motivo} {!cfg.requerido && <em>opcional</em>}</span>
                    <input name="motivo" maxLength={60} required={cfg.requerido} /></label>
                <div className="formulario__acciones">
                    <CloseDialogButton className="boton boton--texto">Cancelar</CloseDialogButton>
                    <button {...busyProps(ocupado, 'boton boton--primario')}>Registrar {tipo}</button>
                </div>
            </form>
        </Dialog>
    );
}

function IngredientDialog({ ocupado, alGuardar, onClose }: { ocupado: boolean; alGuardar: (d: Record<string, string>) => void; onClose: () => void }) {
    const enviar = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        alGuardar(leerFormulario(e.currentTarget));
    };
    return (
        <Dialog id="ingrediente" onClose={onClose} ancho="dialogo--angosto">
            <p className="dialogo__rotulo">Materia prima</p>
            <h3 className="dialogo__titulo">Nuevo ingrediente</h3>
            <form className="formulario" data-accion="guardar-ingrediente" autoComplete="off" onSubmit={enviar}>
                <label className="campo"><span>Nombre</span><input name="nombre" required maxLength={40} data-autofocus /></label>
                <div className="formulario__fila formulario__fila--3">
                    <label className="campo"><span>Unidad</span><select name="unidad" defaultValue="g">
                        <option value="g">gramos (g)</option><option value="ml">mililitros (ml)</option><option value="pz">piezas (pz)</option></select></label>
                    <label className="campo"><span>Stock inicial</span><input name="stockInicial" type="number" min={0} step="any" defaultValue={0} /></label>
                    <label className="campo"><span>Mínimo</span><input name="stockMinimo" type="number" min={0} step="any" defaultValue={0} /></label>
                </div>
                <div className="formulario__acciones">
                    <CloseDialogButton className="boton boton--texto">Cancelar</CloseDialogButton>
                    <button {...busyProps(ocupado, 'boton boton--primario')}>Registrar</button>
                </div>
            </form>
        </Dialog>
    );
}

