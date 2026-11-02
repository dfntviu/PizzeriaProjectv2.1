// Armazón de la aplicación: riel con la navegación (React Router) y el área de contenido.

import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { RUTAS } from './routes';

const reloj = new Intl.DateTimeFormat('es-MX', { dateStyle: 'full' }).format(new Date());

interface Props {
    carpeta: string;
    alCambiarCarpeta: () => void;
    alVerPresentacion: () => void;
}

export function Layout({ carpeta, alCambiarCarpeta, alVerPresentacion }: Props) {
    return (
        <div id="app" className="app">
            <aside className="riel">
                <div className="riel__mantel" aria-hidden="true" />
                <p className="marca">La <span>Pizzería</span></p>
                <nav id="navegacion" className="riel__nav" aria-label="Secciones">
                    {RUTAS.map((r) => (
                        <NavLink key={r.ruta} to={`/${r.ruta}`} data-seccion={r.ruta} className={({ isActive }) => (isActive ? 'activa' : '')}>
                            <span className="riel__num">{r.numero}</span>{r.titulo}
                        </NavLink>
                    ))}
                </nav>
                <div className="riel__pie">
                    <p id="reloj" className="riel__fecha">{reloj}</p>
                    <p className="riel__carpeta">Datos en <strong id="carpeta-actual">{carpeta}</strong>/</p>
                    <button type="button" id="cambiar-carpeta" className="boton boton--texto boton--claro" onClick={alCambiarCarpeta}>Cambiar carpeta</button>
                    <button type="button" id="ver-presentacion" className="boton boton--texto boton--claro riel__presentacion" onClick={alVerPresentacion}>Ver presentación</button>
                    <ThemeToggle />
                </div>
            </aside>
            <main className="contenido">
                <Outlet />
            </main>
        </div>
    );
}

/** Tema visual: «kraft» (por defecto) o «crema». Preferencia del navegador, no dato del negocio. */
function ThemeToggle() {
    const raiz = document.documentElement;
    const [tema, setTema] = useState(raiz.dataset.tema ?? 'kraft');
    const alternar = () => {
        const nuevo = tema === 'kraft' ? 'crema' : 'kraft';
        raiz.dataset.tema = nuevo;
        try { localStorage.setItem('pizzeria:tema', nuevo); } catch { /* dura hasta recargar */ }
        setTema(nuevo);
    };
    return (
        <button type="button" id="alternar-tema" className="boton boton--texto boton--claro riel__presentacion riel__tema"
            aria-pressed={tema === 'kraft'} onClick={alternar}>Tema caja de pizza</button>
    );
}
