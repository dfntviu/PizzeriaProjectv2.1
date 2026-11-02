import { etiquetaTamano, hora, moneda } from '../../shared/format';
import { busyProps } from '../components/SectionHeader';
import type { Comanda } from '../../services/orders.service';

interface Props {
    comanda: Comanda | null;
    ocupadoConfirmar: boolean;
    ocupadoEditar: boolean;
    alCambiarCantidad: (detalleId: string, cantidad: number) => void;
    alQuitar: (detalleId: string) => void;
    alConfirmar: () => void;
    alApartar: () => void;
    alDescartar: () => void;
}

export function ComandaPanel(props: Props) {
    const { comanda } = props;
    // La clave cambia con el pedido: el ticket se «imprime» (anima) solo al cambiar de pedido.
    return (
        <aside className="mostrador__comanda animar" data-zona="comanda" aria-live="polite">
            {comanda ? <ComandaAbierta key={comanda.pedido.id} {...props} comanda={comanda} /> : (
                <div key="vacia" className="comanda comanda--vacia">
                    <p className="comanda__rotulo">Comanda</p>
                    <p className="comanda__guia">Escribe el nombre del cliente y pulsa <strong>Abrir pedido</strong>.
                        Luego agrega pizzas, bebidas o helados del menú.</p>
                </div>
            )}
        </aside>
    );
}

function ComandaAbierta({ comanda, ocupadoConfirmar, ocupadoEditar, alCambiarCantidad, alQuitar, alConfirmar, alApartar, alDescartar }: Props & { comanda: Comanda }) {
    const { pedido, totales, domicilio } = comanda;
    const vacio = pedido.detalles.length === 0;
    return (
        <div className="comanda">
            <div className="comanda__cabeza">
                <p className="comanda__rotulo">Comanda <span className="mono">{pedido.folio}</span></p>
                <p className="comanda__cliente">{pedido.clienteNombre}</p>
                <p className="comanda__meta">Abierta {hora(pedido.fecha)}{pedido.clienteTelefono ? ` · Tel. ${pedido.clienteTelefono}` : ''}</p>
                {domicilio && (
                    <p className="comanda__entrega"><span className="etiqueta etiqueta--domicilio">Domicilio</span>{' '}
                        {domicilio.direccion}{domicilio.referencias && <><br /><span className="tenue">{domicilio.referencias}</span></>}</p>
                )}
            </div>
            {vacio ? <p className="comanda__guia">Sin productos todavía.</p> : (
                <ul className="comanda__lineas">
                    {pedido.detalles.map((d) => (
                        <li key={d.id} className="linea">
                            <div className="linea__desc">
                                <span className="linea__nombre">{d.nombre}</span>
                                <span className="linea__extra">{d.tamano ? `${etiquetaTamano(d.tamano)} · ` : ''}{moneda(d.precioUnitario)} c/u</span>
                            </div>
                            <div className="paso">
                                <button type="button" data-accion="menos" aria-label={`Quitar uno de ${d.nombre}`} disabled={ocupadoEditar}
                                    onClick={() => (d.cantidad > 1 ? alCambiarCantidad(d.id, d.cantidad - 1) : alQuitar(d.id))}>−</button>
                                <span className="mono">{d.cantidad}</span>
                                <button type="button" data-accion="mas" aria-label={`Agregar uno de ${d.nombre}`} disabled={ocupadoEditar}
                                    onClick={() => alCambiarCantidad(d.id, d.cantidad + 1)}>+</button>
                            </div>
                            <span className="linea__importe mono">{moneda(d.subtotal)}</span>
                            <button type="button" className="linea__quitar" data-accion="quitar" aria-label={`Eliminar ${d.nombre}`}
                                disabled={ocupadoEditar} onClick={() => alQuitar(d.id)}>×</button>
                        </li>
                    ))}
                </ul>
            )}
            <dl className="comanda__totales">
                <div><dt>Artículos</dt><dd className="mono">{totales.articulos}</dd></div>
                <div><dt>Base</dt><dd className="mono">{moneda(totales.base)}</dd></div>
                <div><dt>IVA 16 % incluido</dt><dd className="mono">{moneda(totales.iva)}</dd></div>
                <div className="comanda__total"><dt>Total</dt><dd className="mono">{moneda(totales.total)}</dd></div>
            </dl>
            <div className="comanda__acciones">
                <button type="button" data-accion="confirmar" onClick={alConfirmar}
                    {...busyProps(ocupadoConfirmar, 'boton boton--primario boton--ancho', vacio)}>Confirmar y enviar a cocina</button>
                <button type="button" className="boton boton--texto" data-accion="apartar" onClick={alApartar}>Dejar en espera</button>
                <button type="button" className="boton boton--texto boton--peligro" data-accion="descartar" onClick={alDescartar}>
                    {vacio ? 'Descartar' : 'Cancelar pedido'}</button>
            </div>
        </div>
    );
}
