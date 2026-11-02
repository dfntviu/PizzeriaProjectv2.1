// Bienvenida animada. Una vez por sesión, con ?presentacion o con «Ver presentación».

import { useEffect, useRef } from 'react';
import { PresentationAnimation } from './presentationAnimation';
import type { Establecimiento } from '../../types/domain';

export function Presentation({ datos, alTerminar }: { datos: Establecimiento; alTerminar: () => void }) {
    const raiz = useRef<HTMLDivElement>(null);
    const animacion = useRef<PresentationAnimation | null>(null);
    const terminar = useRef(alTerminar);
    terminar.current = alTerminar;

    useEffect(() => {
        if (!raiz.current) return;
        const a = new PresentationAnimation(raiz.current, () => terminar.current());
        animacion.current = a;
        void a.iniciar(datos.fotos.map((f) => f.src));
        return () => a.destruir();
    }, [datos]);

    const saltar = () => animacion.current?.terminar();

    return (
        <div ref={raiz} id="presentacion" className="presentacion" role="dialog" aria-modal="true" aria-label={`Presentación de ${datos.nombre}`}>
            <div className="presentacion__mantel" aria-hidden="true" />
            <div className="presentacion__escena" data-escena aria-hidden="true">
                {datos.fotos.map((f, i) => (
                    <figure key={f.src} className="foto" data-foto={i}><img src={f.src} alt="" decoding="async" /></figure>
                ))}
            </div>
            <div className="presentacion__datos" data-datos>
                <p className="presentacion__lema" data-paso>{datos.lema}</p>
                <h1 className="presentacion__nombre" data-paso>{datos.nombre}</h1>
                <p className="presentacion__linea" data-paso>{datos.direccion}</p>
                <p className="presentacion__linea presentacion__linea--tel mono" data-paso>Tel. {datos.telefono}</p>
                <button type="button" className="boton boton--primario presentacion__entrar" data-paso data-entrar onClick={saltar}>Entrar al mostrador</button>
            </div>
            <button type="button" className="presentacion__saltar" data-saltar onClick={saltar}>Saltar <kbd>Esc</kbd></button>
        </div>
    );
}
