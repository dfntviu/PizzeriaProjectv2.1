// 02 · Catálogo — filtro por categoría, alta, edición y activación (I11 la valida el modelo).

import { useState, type FormEvent } from 'react';
import { useCatalogActions, useCatalogoQuery, useFiltroCatalogo } from '../../store/catalog.store';
import { useNotify } from '../../store/notifications';
import { catalogService, type DatosProducto, type FiltroCatalogo } from '../../services/catalog.service';
import { CATEGORIAS, ETIQUETA_CATEGORIA, SINGULAR_CATEGORIA, TAMANOS, leerFormulario, moneda } from '../../shared/format';
import { CloseDialogButton, Dialog } from '../components/Dialog';
import { Section, SectionHeader, busyProps } from '../components/SectionHeader';
import type { Categoria, Producto } from '../../types/domain';

export function CatalogPage() {
    const notificar = useNotify();
    const [filtro, setFiltro] = useFiltroCatalogo();
    const [formulario, setFormulario] = useState<{ producto: Producto | null } | null>(null);
    const { data } = useCatalogoQuery(filtro);
    const { registrar, editar, disponibilidad } = useCatalogActions({
        alGuardar: (categoria, aviso) => {
            notificar('exito', aviso);
            setFormulario(null);
            if (categoria) setFiltro(categoria); // tras un alta se muestra su categoría (como v2.1.0)
        },
    });

    const cambiarDisponibilidad = async (p: Producto, activo: boolean) => {
        const r = await disponibilidad.run({ id: p.id, activo });
        if (r) notificar(activo ? 'exito' : 'info', activo ? `${r.nombre} vuelve al menú.` : `${r.nombre} ya no aparece en el menú.`);
    };

    const total = data ? Object.values(data.conteo).reduce((a, b) => a + b, 0) : 0;
    const filtros: [FiltroCatalogo, string, number][] = data
        ? [['todos', 'Todo', total], ...CATEGORIAS.map((c): [FiltroCatalogo, string, number] => [c, ETIQUETA_CATEGORIA[c], data.conteo[c]])]
        : [];

    return (
        <Section panel="catalogo" etiqueta="Catálogo">
            <SectionHeader numero="02" titulo="Catálogo" lema="Pizzas con precio por tamaño, bebidas y helados con precio único.">
                <button type="button" className="boton boton--primario seccion__accion" data-accion="nuevo" onClick={() => setFormulario({ producto: null })}>Nuevo producto</button>
            </SectionHeader>
            <nav className="pestanas" aria-label="Filtrar catálogo" data-zona="filtros">
                {filtros.map(([c, nombre, n]) => (
                    <button key={c} type="button" className={`pestana ${c === filtro ? 'activa' : ''}`} aria-pressed={c === filtro}
                        data-accion="filtrar" data-categoria={c} onClick={() => setFiltro(c)}>{nombre} <span>{n}</span></button>
                ))}
            </nav>
            <div data-zona="tabla">
                {data && (data.productos.length === 0 ? <p className="vacio">No hay productos en esta categoría.</p> : (
                    <table className="tabla tabla--catalogo">
                        <thead><tr><th>Producto</th><th>Categoría</th><th className="num">Precio</th><th>Inventario</th><th>Estado</th><th><span className="oculto">Acciones</span></th></tr></thead>
                        <tbody>{data.productos.map((p) => (
                            <tr key={p.id} className={p.activo ? '' : 'fila--inactiva'}>
                                <td><strong>{p.nombre}</strong><br /><span className="tenue">{[p.presentacion, p.descripcion].filter(Boolean).join(' · ')}</span></td>
                                <td><span className={`etiqueta etiqueta--${p.categoria}`}>{SINGULAR_CATEGORIA[p.categoria]}</span></td>
                                <td className="num mono">{p.categoria === 'pizza' && p.precios
                                    ? <span className="precios">CH {moneda(p.precios.chica)}<br />MD {moneda(p.precios.mediana)}<br />GD {moneda(p.precios.grande)}</span>
                                    : moneda(p.precio)}</td>
                                <td>{p.categoria === 'pizza'
                                    ? <span className={data.recetas[p.id] === 3 ? '' : 'alerta'}>{data.recetas[p.id]}/3 recetas</span>
                                    : <><span className="mono">{data.stock[p.id] ?? 0}</span> pz</>}</td>
                                <td><span className={`chip ${p.activo ? 'chip--pagado' : 'chip--cancelado'}`}>{p.activo ? 'En menú' : 'Inactivo'}</span></td>
                                <td className="acciones">
                                    <button type="button" className="boton boton--texto" data-accion="editar"
                                        onClick={() => setFormulario({ producto: catalogService.getProduct(p.id) })}>Editar</button>
                                    {p.activo
                                        ? <button type="button" className="boton boton--texto boton--peligro" data-accion="desactivar" onClick={() => void cambiarDisponibilidad(p, false)}>Desactivar</button>
                                        : <button type="button" className="boton boton--texto" data-accion="activar" onClick={() => void cambiarDisponibilidad(p, true)}>Activar</button>}
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                ))}
            </div>
            {formulario && (
                <ProductDialog producto={formulario.producto} ocupado={registrar.isPending || editar.isPending} onClose={() => setFormulario(null)}
                    alGuardar={(id, datos) => void (id ? editar.run({ id, datos }) : registrar.run(datos))} />
            )}
        </Section>
    );
}

interface DialogProps {
    producto: Producto | null;
    ocupado: boolean;
    alGuardar: (id: string | null, datos: DatosProducto) => void;
    onClose: () => void;
}

function ProductDialog({ producto, ocupado, alGuardar, onClose }: DialogProps) {
    const editando = Boolean(producto);
    const [categoria, setCategoria] = useState<Categoria>(producto?.categoria ?? 'pizza');
    const esPizza = categoria === 'pizza';

    const enviar = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const d = leerFormulario(e.currentTarget);
        const datos: DatosProducto = {
            nombre: d.nombre ?? '',
            descripcion: d.descripcion,
            presentacion: d.presentacion,
            ...(esPizza
                ? { precios: { chica: d.chica ?? '', mediana: d.mediana ?? '', grande: d.grande ?? '' } }
                : { precio: d.precio }),
            ...(editando ? {} : { categoria, stockMinimo: d.stockMinimo }),
        };
        alGuardar(producto?.id ?? null, datos);
    };

    return (
        <Dialog id="producto" onClose={onClose}>
            <p className="dialogo__rotulo">{producto ? `Editar · ${producto.id}` : 'Alta en catálogo'}</p>
            <h3 className="dialogo__titulo">{producto ? producto.nombre : 'Nuevo producto'}</h3>
            <form className="formulario" data-accion="guardar" autoComplete="off" onSubmit={enviar}>
                <div className="formulario__fila">
                    <label className="campo"><span>Nombre</span>
                        <input name="nombre" required maxLength={40} defaultValue={producto?.nombre ?? ''} data-autofocus /></label>
                    <label className="campo"><span>Categoría</span>
                        <select name="categoria" value={categoria} disabled={editando} onChange={(e) => setCategoria(e.target.value as Categoria)}>
                            {CATEGORIAS.map((c) => <option key={c} value={c}>{SINGULAR_CATEGORIA[c]}</option>)}
                        </select></label>
                </div>
                <label className="campo"><span>Descripción <em>opcional</em></span>
                    <input name="descripcion" maxLength={60} defaultValue={producto?.descripcion ?? ''} /></label>
                <label className="campo"><span>Presentación</span>
                    <input name="presentacion" maxLength={24} defaultValue={producto?.presentacion ?? ''} placeholder="600 ml, Vaso 120 g…" /></label>
                <fieldset className="formulario__grupo" data-grupo="pizza" hidden={!esPizza} disabled={!esPizza}>
                    <legend>Precio por tamaño</legend>
                    <div className="formulario__fila formulario__fila--3">
                        {TAMANOS.map((t) => (
                            <label key={t} className="campo"><span>{t[0]!.toUpperCase() + t.slice(1)}</span>
                                <input name={t} type="number" min={1} step={0.5} inputMode="decimal" required={esPizza}
                                    defaultValue={producto?.precios?.[t] ?? ''} /></label>
                        ))}
                    </div>
                </fieldset>
                <fieldset className="formulario__grupo" data-grupo="unico" hidden={esPizza} disabled={esPizza}>
                    <legend>Precio y almacén</legend>
                    <div className="formulario__fila">
                        <label className="campo"><span>Precio</span>
                            <input name="precio" type="number" min={1} step={0.5} inputMode="decimal" required={!esPizza}
                                defaultValue={producto?.precio ?? ''} /></label>
                        {!editando && (
                            <label className="campo"><span>Stock mínimo</span>
                                <input name="stockMinimo" type="number" min={0} step={1} defaultValue={5} /></label>
                        )}
                    </div>
                </fieldset>
                {editando && <p className="dialogo__nota">Cambiar el precio no altera los pedidos ya registrados: cada uno guarda el precio con el que se vendió.</p>}
                <div className="formulario__acciones">
                    <CloseDialogButton className="boton boton--texto">Cancelar</CloseDialogButton>
                    <button {...busyProps(ocupado, 'boton boton--primario')}>{editando ? 'Guardar cambios' : 'Registrar'}</button>
                </div>
            </form>
        </Dialog>
    );
}
