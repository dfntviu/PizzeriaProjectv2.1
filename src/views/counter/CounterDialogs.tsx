import type { FormEvent } from 'react';
import { CloseDialogButton, Dialog } from '../components/Dialog';
import { busyProps } from '../components/SectionHeader';
import { ETIQUETA_METODO, dosDigitos, etiquetaTamano, fechaHora, hora, leerFormulario, moneda } from '../../shared/format';
import { ESTADO_PEDIDO } from './OrderTables';
import type { Domicilio, MetodoPago, Pedido, TotalesPedido, Verificacion } from '../../types/domain';

export type DialogoMostrador =
    | { tipo: 'faltantes'; verificacion: Verificacion }
    | { tipo: 'turno'; pedido: Pedido; domicilio: Domicilio | null }
    | { tipo: 'detalle'; pedido: Pedido; totales: TotalesPedido }
    | { tipo: 'cancelar'; id: string; folio: string; confirmado: boolean };

export function FaltantesDialog({ verificacion: { faltantes, sinReceta }, onClose }: { verificacion: Verificacion; onClose: () => void }) {
    return (
        <Dialog id="faltantes" onClose={onClose}>
            <p className="dialogo__rotulo dialogo__rotulo--alerta">Inventario insuficiente</p>
            <h3 className="dialogo__titulo">No alcanza para preparar esto</h3>
            {faltantes.length > 0 && (
                <table className="tabla tabla--compacta">
                    <thead><tr><th>Insumo</th><th className="num">Se necesita</th><th className="num">Hay</th><th className="num">Falta</th></tr></thead>
                    <tbody>{faltantes.map((f) => (
                        <tr key={f.itemId}><td>{f.nombre}</td><td className="num">{f.cantidad} {f.unidad}</td>
                            <td className="num">{f.disponible} {f.unidad}</td><td className="num alerta">{f.falta} {f.unidad}</td></tr>
                    ))}</tbody>
                </table>
            )}
            {sinReceta.length > 0 && <p>Sin receta técnica: <strong>{sinReceta.join(', ')}</strong>. Defínela en Inventario.</p>}
            <p className="dialogo__nota">Ofrece otro tamaño o producto, o registra una entrada de almacén.</p>
            <CloseDialogButton autoFocus>Entendido</CloseDialogButton>
        </Dialog>
    );
}

export function TurnoDialog({ pedido, domicilio, onClose }: { pedido: Pedido; domicilio: Domicilio | null; onClose: () => void }) {
    const limite = domicilio && pedido.confirmadoEn
        ? new Date(new Date(pedido.confirmadoEn).getTime() + domicilio.plazo * 60_000).toISOString() : null;
    return (
        <Dialog id="turno" onClose={onClose} ancho="dialogo--angosto">
            <p className="dialogo__rotulo">Pedido {pedido.folio} en cocina</p>
            <p className="turno"><span className="turno__etiqueta">Turno</span><span className="turno__numero">{dosDigitos(pedido.turno)}</span></p>
            <p className="dialogo__centro">{pedido.clienteNombre} · {moneda(pedido.total)}<br />
                <span className="tenue">{domicilio
                    ? `A domicilio: entregar antes de las ${hora(limite)}. Se cobra al entregar.`
                    : 'El cobro queda pendiente en Caja.'}</span></p>
            <CloseDialogButton className="boton boton--primario boton--ancho" autoFocus>Siguiente cliente</CloseDialogButton>
        </Dialog>
    );
}

export function DetalleDialog({ pedido, totales, onClose }: { pedido: Pedido; totales: TotalesPedido; onClose: () => void }) {
    const metodo = pedido.metodoPago && pedido.metodoPago !== 'contraentrega'
        ? ETIQUETA_METODO[pedido.metodoPago as MetodoPago] : 'Contra entrega (domicilio)';
    return (
        <Dialog id="detalle" onClose={onClose}>
            <p className="dialogo__rotulo">{pedido.folio}{pedido.turno ? ` · turno ${pedido.turno}` : ''}</p>
            <h3 className="dialogo__titulo">{pedido.clienteNombre}</h3>
            <p className={`chip chip--${pedido.estado}`}>{ESTADO_PEDIDO[pedido.estado]}</p>
            <table className="tabla tabla--compacta">
                <thead><tr><th>Producto</th><th className="num">Cant.</th><th className="num">Precio</th><th className="num">Importe</th></tr></thead>
                <tbody>{pedido.detalles.map((d) => (
                    <tr key={d.id}><td>{d.nombre}{d.tamano && <> <span className="tenue">{etiquetaTamano(d.tamano)}</span></>}</td>
                        <td className="num">{d.cantidad}</td><td className="num">{moneda(d.precioUnitario)}</td><td className="num">{moneda(d.subtotal)}</td></tr>
                ))}</tbody>
                <tfoot><tr><th colSpan={3}>Total</th><td className="num">{moneda(totales.total)}</td></tr></tfoot>
            </table>
            <dl className="ficha">
                <div><dt>Abierto</dt><dd>{fechaHora(pedido.fecha)}</dd></div>
                {pedido.confirmadoEn && <div><dt>A cocina</dt><dd>{fechaHora(pedido.confirmadoEn)}</dd></div>}
                {pedido.pagadoEn && <div><dt>Pagado</dt><dd>{fechaHora(pedido.pagadoEn)} · {metodo}</dd></div>}
                {pedido.canceladoEn && <div><dt>Cancelado</dt><dd>{fechaHora(pedido.canceladoEn)}{pedido.motivoCancelacion ? ` · ${pedido.motivoCancelacion}` : ''}</dd></div>}
            </dl>
        </Dialog>
    );
}

interface CancelarProps {
    id: string;
    folio: string;
    confirmado: boolean;
    ocupado: boolean;
    alCancelar: (id: string, motivo: string) => void;
    onClose: () => void;
}

/** I7: cancelar un pedido confirmado exige motivo. */
export function CancelarDialog({ id, folio, confirmado, ocupado, alCancelar, onClose }: CancelarProps) {
    const enviar = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        alCancelar(id, leerFormulario(e.currentTarget).motivo ?? '');
    };
    return (
        <Dialog id="cancelar" onClose={onClose} ancho="dialogo--angosto">
            <p className="dialogo__rotulo dialogo__rotulo--alerta">Cancelar {folio}</p>
            <h3 className="dialogo__titulo">¿Cancelar este pedido?</h3>
            <p>{confirmado
                ? 'Ya está en cocina: las bebidas y helados regresan al almacén; los ingredientes de pizza no.'
                : 'Quedará registrado como cancelado en el historial del cliente.'}</p>
            <form data-accion="cancelar" className="formulario" onSubmit={enviar}>
                <label className="campo"><span>Motivo {!confirmado && <em>opcional</em>}</span>
                    <input name="motivo" maxLength={60} required={confirmado} data-autofocus placeholder="Ej. el cliente se retiró" /></label>
                <div className="formulario__acciones">
                    <CloseDialogButton className="boton boton--texto">Volver</CloseDialogButton>
                    <button {...busyProps(ocupado, 'boton boton--peligro')}>Cancelar pedido</button>
                </div>
            </form>
        </Dialog>
    );
}
