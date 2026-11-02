import type { ReactNode } from 'react';

interface Props {
    numero: string;
    titulo: string;
    lema: ReactNode;
    children?: ReactNode; // acción a la derecha (botón o grupo)
}

export function SectionHeader({ numero, titulo, lema, children }: Props) {
    return (
        <header className="seccion__cabecera">
            <p className="seccion__numero">{numero}</p>
            <div>
                <h2 className="seccion__titulo">{titulo}</h2>
                <p className="seccion__lema">{lema}</p>
            </div>
            {children}
        </header>
    );
}

/** Contenedor de cada sección. Se monta con la ruta, así que la animación «entrando» corre al navegar. */
export function Section({ panel, etiqueta, children }: { panel: string; etiqueta: string; children: ReactNode }) {
    return <section data-panel={panel} className="seccion entrando" aria-label={etiqueta}>{children}</section>;
}

/**
 * Props de un botón que dispara una escritura: ++ mientras está en curso queda desactivado,
 * con aria-busy y el indicador «boton--ocupado» (antes VistaBase.#ocupar). ++
 */
export function busyProps(ocupado: boolean, clase: string, deshabilitado = false) {
    return {
        className: ocupado ? `${clase} boton--ocupado` : clase,
        disabled: ocupado || deshabilitado,
        'aria-busy': ocupado || undefined,
    } as const;
}
