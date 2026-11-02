import type { CSSProperties, FormEvent } from 'react';
import { CATEGORIAS, ETIQUETA_CATEGORIA, ETIQUETA_TAMANO, TAMANOS, leerFormulario, moneda } from '../../shared/format';
import type { Categoria, Menu, PizzaEnMenu, ProductoSimpleEnMenu, Tamano } from '../../types/domain';

interface Props {
    menu: Menu | undefined;
    categoria: Categoria;
    alElegirCategoria: (c: Categoria) => void;
    hayPedido: boolean;
    /** Devuelve true si se agregó (entonces la tarjeta vuelve a su estado inicial). */
    alAgregar: (datos: { productoId: string; tamano: Tamano | null; cantidad: number }) => Promise<boolean>;
}

const indice = (i: number) => ({ '--i': i }) as CSSProperties;

export function MenuPanel({ menu, categoria, alElegirCategoria, hayPedido, alAgregar }: Props) {
    const enviar = async (e: FormEvent<HTMLFormElement>, productoId: string) => {
        e.preventDefault();
        const form = e.currentTarget;
        const d = leerFormulario(form);
        const ok = await alAgregar({ productoId, tamano: (d.tamano as Tamano) || null, cantidad: Number(d.cantidad) });
        if (ok) form.reset();
    };
    const productos = menu?.[categoria] ?? [];

    return (
        <>
            <nav className="pestanas" aria-label="Categorías del menú" data-zona="pestanas">
                {menu && CATEGORIAS.map((c) => (
                    <button key={c} type="button" className={`pestana ${c === categoria ? 'activa' : ''}`} data-accion="categoria"
                        data-categoria={c} aria-pressed={c === categoria} onClick={() => alElegirCategoria(c)}>
                        {ETIQUETA_CATEGORIA[c]} <span>{menu[c].length}</span>
                    </button>
                ))}
            </nav>
            {/* Las tarjetas se conservan entre renders (key = id): solo se animan al cambiar de categoría. */}
            <div className="menu animar" data-zona="menu">
                {!menu ? null : productos.length === 0
                    ? <p className="vacio">No hay {ETIQUETA_CATEGORIA[categoria].toLowerCase()} activas en el catálogo.</p>
                    : productos.map((p, i) => p.categoria === 'pizza'
                        ? <PizzaCard key={`${categoria}:${p.id}`} p={p as PizzaEnMenu} i={i} bloqueada={!hayPedido} onSubmit={(e) => enviar(e, p.id)} />
                        : <SimpleCard key={`${categoria}:${p.id}`} p={p as ProductoSimpleEnMenu} i={i} bloqueada={!hayPedido} onSubmit={(e) => enviar(e, p.id)} />)}
            </div>
        </>
    );
}

interface CardProps<T> {
    p: T;
    i: number;
    bloqueada: boolean;
    onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

function PizzaCard({ p, i, bloqueada, onSubmit }: CardProps<PizzaEnMenu>) {
    const primerDisponible = (['mediana', 'chica', 'grande'] as const).find((t) => p.disponibles[t] > 0);
    const agotada = !primerDisponible;
    return (
        <form className={`platillo platillo--pizza ${agotada ? 'platillo--agotado' : ''}`} style={indice(i)} data-accion="agregar" data-id={p.id} onSubmit={onSubmit}>
            <div className="platillo__cabeza">
                <h4 className="platillo__nombre">{p.nombre}</h4>
                {agotada && <span className="sello">Sin insumos</span>}
            </div>
            <p className="platillo__desc">{p.descripcion}</p>
            <fieldset className="tamanos" disabled={agotada}>
                <legend className="oculto">Tamaño</legend>
                {TAMANOS.map((t) => {
                    const hay = p.disponibles[t] > 0;
                    return (
                        <label key={t} className={`tamano ${hay ? '' : 'tamano--agotado'}`}>
                            <input type="radio" name="tamano" value={t} defaultChecked={t === primerDisponible} disabled={!hay} />
                            <span className="tamano__nombre">{ETIQUETA_TAMANO[t]}</span>
                            <span className="tamano__precio">{moneda(p.precios?.[t])}</span>
                            <span className="tamano__disp">{hay ? `${p.disponibles[t]} disp.` : 'agotada'}</span>
                        </label>
                    );
                })}
            </fieldset>
            <CardFooter deshabilitado={bloqueada || agotada} bloqueada={bloqueada} />
        </form>
    );
}

function SimpleCard({ p, i, bloqueada, onSubmit }: CardProps<ProductoSimpleEnMenu>) {
    const agotado = p.disponibles <= 0;
    return (
        <form className={`platillo ${agotado ? 'platillo--agotado' : ''}`} style={indice(i)} data-accion="agregar" data-id={p.id} onSubmit={onSubmit}>
            <div className="platillo__cabeza">
                <h4 className="platillo__nombre">{p.nombre}</h4>
                <span className="platillo__precio">{moneda(p.precio)}</span>
            </div>
            <p className="platillo__desc">{[p.presentacion, p.descripcion].filter(Boolean).join(' · ')}</p>
            <p className={`platillo__stock ${agotado ? 'agotado' : p.disponibles <= 5 ? 'bajo' : ''}`}>
                {agotado ? 'Agotado' : `${p.disponibles} en existencia`}</p>
            <CardFooter deshabilitado={bloqueada || agotado} bloqueada={bloqueada} />
        </form>
    );
}

function CardFooter({ deshabilitado, bloqueada }: { deshabilitado: boolean; bloqueada: boolean }) {
    return (
        <div className="platillo__pie">
            <label className="cantidad"><span className="oculto">Cantidad</span>
                <input type="number" name="cantidad" defaultValue={1} min={1} max={50} disabled={deshabilitado} /></label>
            <button className="boton boton--chico" disabled={deshabilitado} title={bloqueada ? 'Abre un pedido primero' : ''}>Agregar</button>
        </div>
    );
}
