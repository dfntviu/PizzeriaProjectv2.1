// Pantalla de conexión de la carpeta de datos (antes DashboardView.mostrarConexion / mostrarCargando).

import type { EstadoConexion } from '../../store/connection.store';

interface Props {
    estado: Exclude<EstadoConexion, { fase: 'lista' }>;
    alElegir: () => void;
    alReconectar: (h: FileSystemDirectoryHandle) => void;
}

export function ConnectionScreen({ estado, alElegir, alReconectar }: Props) {
    return (
        <main id="conexion" className="conexion">
            <div className="conexion__mantel" aria-hidden="true" />
            <div className="conexion__tarjeta">
                {estado.fase === 'iniciando' && <p className="conexion__paso">Cargando…</p>}
                {estado.fase === 'incompatible' && (
                    <>
                        <p className="conexion__paso">Navegador no compatible</p>
                        <h1 className="conexion__titulo">Esta pizzería guarda sus datos en ficheros de tu equipo</h1>
                        <p className="conexion__texto">Para leer y escribir la carpeta <code>data/</code> se usa la File System Access API,
                            disponible en <strong>Chrome</strong> y <strong>Edge</strong> de escritorio, servidos por
                            {' '}<code>http://localhost</code> o HTTPS. Abre esta página en uno de ellos.</p>
                    </>
                )}
                {estado.fase === 'cargando' && (
                    <>
                        <p className="conexion__paso">Abriendo ficheros</p>
                        <h1 className="conexion__titulo conexion__titulo--cargando">{estado.mensaje}</h1>
                    </>
                )}
                {estado.fase === 'pedir' && (
                    <>
                        <p className="conexion__paso">Antes de abrir el local</p>
                        <h1 className="conexion__titulo">Conecta la carpeta de datos</h1>
                        <p className="conexion__texto">Catálogo, pedidos, inventario y caja viven en ficheros <code>.dat</code> de registros de
                            longitud fija dentro de una carpeta de tu equipo. Elige la carpeta <code>data/</code> del proyecto
                            (o una vacía: se crea con el menú de ejemplo).</p>
                        <div className="conexion__acciones">
                            {estado.recordada && (
                                <button type="button" className="boton boton--primario" data-conexion="reconectar"
                                    onClick={() => estado.recordada && alReconectar(estado.recordada)}>Seguir con «{estado.recordada.name}»</button>
                            )}
                            <button type="button" className={`boton ${estado.recordada ? '' : 'boton--primario'}`} data-conexion="elegir" onClick={alElegir}>
                                {estado.recordada ? 'Elegir otra carpeta' : 'Elegir carpeta…'}</button>
                        </div>
                        <p className="conexion__nota">El navegador te pedirá permiso para ver y editar los archivos de esa carpeta.</p>
                    </>
                )}
            </div>
        </main>
    );
}
