// 01 · Mostrador — toma de pedidos: formulario, menú, comanda, pedidos de hoy e historial.

import { useState } from 'react';
import {
    useCategoriaMenu, useClienteConsultado, useClientesQuery, useComandaQuery, useCounterActions, useHistorialQuery,
    useMenuQuery, usePedidosHoyQuery,
} from '../../store/counter.store';
import { useNotify } from '../../store/notifications';
import { useSafeRead } from '../../store/useBusinessMutation';
import { ordersService } from '../../services/orders.service';
import { Section, SectionHeader } from '../components/SectionHeader';
import { NewOrderForm } from './NewOrderForm';
import { MenuPanel } from './MenuPanel';
import { ComandaPanel } from './ComandaPanel';
import { ClientHistory, OrdersToday } from './OrderTables';
import { CancelarDialog, DetalleDialog, FaltantesDialog, TurnoDialog, type DialogoMostrador } from './CounterDialogs';
import type { PedidoConEntrega } from '../../types/domain';

export function CounterPage() {
    const notificar = useNotify();
    const leer = useSafeRead();
    const [dialogo, setDialogo] = useState<DialogoMostrador | null>(null);
    const cerrar = () => setDialogo(null);

    const [categoria, setCategoria] = useCategoriaMenu();
    const [clienteId, setClienteId] = useClienteConsultado();
    const acciones = useCounterActions({ onFaltantes: (verificacion) => setDialogo({ tipo: 'faltantes', verificacion }) });
    const { pedidoActivo, setPedidoActivo } = acciones;

    const menu = useMenuQuery();
    const comanda = useComandaQuery(pedidoActivo);
    const pedidos = usePedidosHoyQuery();
    const clientes = useClientesQuery();
    const historial = useHistorialQuery(clienteId);

    const pedirCancelacion = (p: { id: string; folio: string; estado: string; detalles: unknown[] }) => {
        if (p.estado === 'abierto' && p.detalles.length === 0) {
            void cancelar(p.id, ''); // abierto y vacío: se descarta sin preguntar (I1)
        } else {
            setDialogo({ tipo: 'cancelar', id: p.id, folio: p.folio, confirmado: p.estado === 'confirmado' });
        }
    };

    const cancelar = async (id: string, motivo: string) => {
        const r = await acciones.cancelar.run({ id, motivo });
        if (!r) return;
        notificar('info', r.aviso);
        setDialogo((d) => (d?.tipo === 'cancelar' ? null : d));
    };

    const ver = (p: PedidoConEntrega) => {
        if (p.estado === 'abierto') {
            setPedidoActivo(p.id);
            return;
        }
        const detalle = leer(() => ordersService.getDetail(p.id));
        if (detalle) setDialogo({ tipo: 'detalle', ...detalle });
    };

    const confirmar = async () => {
        const r = await acciones.confirmar.run(undefined);
        if (r) setDialogo({ tipo: 'turno', pedido: r.pedido, domicilio: r.domicilio });
    };

    const comandaActual = comanda.data ?? null;

    return (
        <Section panel="mostrador" etiqueta="Mostrador">
            <SectionHeader numero="01" titulo="Mostrador" lema="Toma el pedido, revisa la comanda y mándala a cocina." />
            <div className="mostrador">
                <div className="mostrador__menu">
                    <NewOrderForm crear={acciones.crear}
                        alCrear={(p, aDomicilio) => notificar('exito', `Pedido ${p.folio} ${aDomicilio ? 'a domicilio ' : ''}abierto para ${p.clienteNombre}.`)} />
                    <MenuPanel menu={menu.data} categoria={categoria} alElegirCategoria={setCategoria} hayPedido={Boolean(comandaActual)}
                        alAgregar={async (linea) => Boolean(await acciones.agregar.run(linea))} />
                </div>
                <ComandaPanel
                    comanda={comandaActual}
                    ocupadoConfirmar={acciones.confirmar.isPending}
                    ocupadoEditar={acciones.editar.isPending}
                    alCambiarCantidad={(detalleId, cantidad) => void acciones.editar.run({ detalleId, cantidad })}
                    alQuitar={(detalleId) => void acciones.editar.run({ detalleId, eliminar: true })}
                    alConfirmar={() => void confirmar()}
                    alApartar={() => setPedidoActivo(null)}
                    alDescartar={() => comandaActual && pedirCancelacion(comandaActual.pedido)}
                />
            </div>
            <section className="bloque">
                <h3 className="bloque__titulo">Pedidos de hoy</h3>
                <OrdersToday pedidos={pedidos.data ?? []} alVer={ver} alCancelar={pedirCancelacion} />
            </section>
            <section className="bloque">
                <h3 className="bloque__titulo">Historial por cliente</h3>
                <ClientHistory clientes={clientes.data ?? []} clienteId={clienteId} alElegir={setClienteId} historial={historial.data} alVer={ver} />
            </section>

            {dialogo?.tipo === 'faltantes' && <FaltantesDialog verificacion={dialogo.verificacion} onClose={cerrar} />}
            {dialogo?.tipo === 'turno' && <TurnoDialog pedido={dialogo.pedido} domicilio={dialogo.domicilio} onClose={cerrar} />}
            {dialogo?.tipo === 'detalle' && <DetalleDialog pedido={dialogo.pedido} totales={dialogo.totales} onClose={cerrar} />}
            {dialogo?.tipo === 'cancelar' && (
                <CancelarDialog id={dialogo.id} folio={dialogo.folio} confirmado={dialogo.confirmado} ocupado={acciones.cancelar.isPending}
                    alCancelar={(id, motivo) => void cancelar(id, motivo)} onClose={cerrar} />
            )}
        </Section>
    );
}
