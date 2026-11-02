import { useRef, useState, type FormEvent } from 'react';
import { PLAZO_MINUTOS } from '@model/DomicilioModel.js';
import { leerFormulario } from '../../shared/format';
import { busyProps } from '../components/SectionHeader';
import type { Accion } from '../../store/useBusinessMutation';
import type { NuevoPedido } from '../../services/orders.service';
import type { Pedido } from '../../types/domain';

interface Props {
    crear: Accion<NuevoPedido, Pedido>;
    alCrear: (pedido: Pedido, aDomicilio: boolean) => void;
}

export function NewOrderForm({ crear, alCrear }: Props) {
    const [aDomicilio, setADomicilio] = useState(false);
    const direccion = useRef<HTMLInputElement>(null);

    const alternar = (activo: boolean) => {
        setADomicilio(activo);
        if (activo) queueMicrotask(() => direccion.current?.focus());
    };

    const enviar = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const datos = leerFormulario(form);
        const pedido = await crear.run({ ...datos, domicilio: Boolean(datos.domicilio) } as NuevoPedido);
        if (!pedido) return;
        alCrear(pedido, aDomicilio);
        form.reset();
        setADomicilio(false);
    };

    return (
        <form className="nuevo-pedido" data-accion="crear-pedido" autoComplete="off" onSubmit={enviar}>
            <label className="campo"><span>Cliente</span>
                <input name="nombre" required maxLength={40} placeholder="Nombre de quien ordena" /></label>
            <label className="campo"><span>Teléfono <em data-zona="tel-nota">{aDomicilio ? 'obligatorio' : 'opcional'}</em></span>
                <input name="telefono" inputMode="tel" maxLength={15} placeholder="55 1234 5678" required={aDomicilio} /></label>
            <button {...busyProps(crear.isPending, 'boton boton--primario')}>Abrir pedido</button>
            <label className="interruptor">
                <input type="checkbox" name="domicilio" checked={aDomicilio} onChange={(e) => alternar(e.target.checked)} />
                <span className="interruptor__pista" aria-hidden="true" />
                <span>A domicilio <em>entrega en {PLAZO_MINUTOS} min · se cobra al entregar</em></span>
            </label>
            <fieldset className="nuevo-pedido__entrega" data-grupo="entrega" hidden={!aDomicilio} disabled={!aDomicilio}>
                <legend className="oculto">Datos de entrega</legend>
                <label className="campo"><span>Dirección</span>
                    <input ref={direccion} name="direccion" maxLength={60} placeholder="Calle, número y colonia" required={aDomicilio} /></label>
                <label className="campo"><span>Referencias <em>opcional</em></span>
                    <input name="referencias" maxLength={60} placeholder="Entre calles, color de fachada…" /></label>
            </fieldset>
        </form>
    );
}
