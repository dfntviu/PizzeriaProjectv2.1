// Avisos (toasts) compartidos por todas las vistas. Mismo comportamiento que DashboardView.notificar:
// 5.2 s visibles, salida animada, máximo 4 a la vez, role="alert" para errores.

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { TipoAviso } from '../types/domain';

const DURACION = 5200;
const MAXIMO = 4;

interface Aviso {
    id: number;
    tipo: TipoAviso;
    mensaje: string;
    saliendo: boolean;
}

type Notificar = (tipo: TipoAviso, mensaje: string) => void;

const Contexto = createContext<Notificar>(() => {});

export function NotificationsProvider({ children }: { children: ReactNode }) {
    const [avisos, setAvisos] = useState<Aviso[]>([]);
    const siguiente = useRef(1);

    const quitar = useCallback((id: number) => setAvisos((a) => a.filter((x) => x.id !== id)), []);

    const notificar = useCallback<Notificar>((tipo, mensaje) => {
        const id = siguiente.current++;
        setAvisos((a) => [...a, { id, tipo, mensaje, saliendo: false }].slice(-MAXIMO));
        setTimeout(() => setAvisos((a) => a.map((x) => (x.id === id ? { ...x, saliendo: true } : x))), DURACION);
        setTimeout(() => quitar(id), DURACION + 400);
    }, [quitar]);

    const valor = useMemo(() => notificar, [notificar]);

    return (
        <Contexto.Provider value={valor}>
            {children}
            <div id="avisos" className="avisos" aria-live="polite">
                {avisos.map((a) => (
                    <div key={a.id} className={`aviso aviso--${a.tipo}${a.saliendo ? ' aviso--saliendo' : ''}`} role={a.tipo === 'error' ? 'alert' : 'status'}>
                        <span className="aviso__marca" aria-hidden="true" />
                        <p>{a.mensaje}</p>
                        <button type="button" className="aviso__cerrar" aria-label="Cerrar aviso" onClick={() => quitar(a.id)}>×</button>
                    </div>
                ))}
            </div>
        </Contexto.Provider>
    );
}

export const useNotify = (): Notificar => useContext(Contexto);
