// <dialog> nativo en modo modal (igual que VistaBase.abrirDialogo):
//   · showModal() al montar; Esc, clic en el fondo o el botón × lo cierran y avisan con onClose.
//   · Enfoca el elemento marcado con data-autofocus (React no emite el atributo autofocus).

import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
    id: string;
    onClose: () => void;
    ancho?: 'dialogo--angosto' | 'dialogo--ticket' | '';
    children: ReactNode;
}

export function Dialog({ id, onClose, ancho = '', children }: Props) {
    const ref = useRef<HTMLDialogElement>(null);
    const cerrar = useRef(onClose);
    cerrar.current = onClose;

    useEffect(() => {
        const dialogo = ref.current;
        if (!dialogo) return;
        if (!dialogo.open) dialogo.showModal();
        dialogo.querySelector<HTMLElement>('[data-autofocus]')?.focus();
        // El evento `close` es ASÍNCRONO: close() lo encola y se dispara después. En desarrollo,
        // StrictMode monta, desmonta (close) y vuelve a montar (showModal) el efecto; el `close`
        // encolado del primer desmontaje llegaba al escuchador del segundo montaje y cerraba el
        // diálogo recién reabierto. Si el diálogo sigue abierto, ese aviso es viejo: se ignora.
        const alCerrar = () => {
            if (!dialogo.open) cerrar.current();
        };
        dialogo.addEventListener('close', alCerrar);
        return () => {
            dialogo.removeEventListener('close', alCerrar);
            if (dialogo.open) dialogo.close();
        };
    }, []);

    return (
        <dialog
            ref={ref}
            data-dialogo={id}
            className={`dialogo ${ancho}`.trim()}
            onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}
        >
            <button type="button" className="dialogo__cerrar" data-accion="cerrar-dialogo" aria-label="Cerrar"
                onClick={() => ref.current?.close()}>×</button>
            {children}
        </dialog>
    );
}

/** Botón que cierra el diálogo que lo contiene (Volver, Cancelar, Listo…). */
export function CloseDialogButton({ className = 'boton', autoFocus = false, children }: { className?: string; autoFocus?: boolean; children: ReactNode }) {
    return (
        <button type="button" className={className} data-accion="cerrar-dialogo" data-autofocus={autoFocus || undefined}
            onClick={(e) => e.currentTarget.closest('dialog')?.close()}>{children}</button>
    );
}
