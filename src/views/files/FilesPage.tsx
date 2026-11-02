// 06 · Ficheros — la persistencia a la vista: cada .dat, su longitud de registro y acceso directo.

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useFicherosQuery, useFilesActions } from '../../store/files.store';
import { useNotify } from '../../store/notifications';
import { filesService } from '../../services/files.service';
import { traducirError } from '../../services/errors';
import { numero } from '../../shared/format';
import { Section, SectionHeader } from '../components/SectionHeader';
import type { RegistroLeido } from '../../types/domain';

const formatear = (v: unknown): string => (v === null || v === '' ? '∅' : v === true ? 'S' : v === false ? 'N' : String(v));

interface Lectura {
    nombre: string;
    posicion: number;
    leido: RegistroLeido | null;
}

export function FilesPage() {
    const notificar = useNotify();
    const { data } = useFicherosQuery();
    const [seleccion, setSeleccion] = useState({ nombre: filesService.names()[0] ?? '', posicion: '0' });
    const [lectura, setLectura] = useState<Lectura | null>(null);
    const [leyendo, setLeyendo] = useState(false);
    const { compactar, importar } = useFilesActions({ avisar: notificar });

    const leer = async (nombre: string, posicion: number) => {
        if (leyendo) return;
        setLeyendo(true);
        try {
            setLectura({ nombre, posicion, leido: await filesService.readAt(nombre, posicion) });
        } catch (error) {
            const t = traducirError(error);
            notificar('error', t.tipo === 'mensaje' ? t.mensaje : 'Error');
        } finally {
            setLeyendo(false);
        }
    };

    const enviar = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        void leer(seleccion.nombre, Number(seleccion.posicion));
    };

    const exportar = async (nombre: string) => {
        try {
            const { nombreArchivo, contenido } = await filesService.exportJson(nombre);
            const url = URL.createObjectURL(new Blob([contenido], { type: 'application/json' }));
            const enlace = Object.assign(document.createElement('a'), { href: url, download: nombreArchivo });
            document.body.append(enlace);
            enlace.click();
            enlace.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            const t = traducirError(error);
            notificar('error', t.tipo === 'mensaje' ? t.mensaje : 'Error');
        }
    };

    const alElegirRespaldo = (e: ChangeEvent<HTMLInputElement>) => {
        const archivo = e.target.files?.[0];
        e.target.value = ''; // permite volver a elegir el mismo archivo
        if (archivo) void importar.run(archivo);
    };

    return (
        <Section panel="ficheros" etiqueta="Ficheros">
            <SectionHeader numero="06" titulo="Ficheros" lema={<>Registros de longitud fija: el registro <em>n</em> empieza en el byte <em>n × L</em>.</>}>
                <label className="boton seccion__accion">Restaurar respaldo…
                    <input type="file" accept=".json,application/json" className="oculto" data-accion="importar" onChange={alElegirRespaldo} /></label>
            </SectionHeader>
            {data && (
                <>
                    <p className="bloque__nota" data-zona="carpeta">Carpeta conectada: <strong>{data.carpeta}/</strong> ·
                        {' '}{data.ficheros.length} ficheros · {numero(data.ficheros.reduce((s, f) => s + f.bytes, 0))} bytes</p>
                    <div data-zona="tabla">
                        <table className="tabla">
                            <thead><tr><th>Fichero</th><th className="num">L (bytes)</th><th className="num">Registros</th><th className="num">Activos</th>
                                <th className="num">Borrados</th><th className="num">Tamaño</th><th><span className="oculto">Acciones</span></th></tr></thead>
                            <tbody>{data.ficheros.map((f) => (
                                <tr key={f.nombre}>
                                    <td><button type="button" className="enlace mono" data-accion="inspeccionar"
                                        onClick={() => { setSeleccion({ nombre: f.nombre, posicion: '0' }); void leer(f.nombre, 0); }}>{f.nombre}.dat</button>
                                        <br /><span className="tenue">{f.campos.length} campos</span></td>
                                    <td className="num mono">{f.longitudRegistro}</td>
                                    <td className="num mono">{f.registros}</td>
                                    <td className="num mono">{f.activos}</td>
                                    <td className={`num mono ${f.borrados ? 'alerta' : ''}`}>{f.borrados}</td>
                                    <td className="num mono">{numero(f.bytes)} B</td>
                                    <td className="acciones">
                                        <button type="button" className="boton boton--texto" data-accion="compactar" disabled={!f.borrados || compactar.isPending}
                                            aria-busy={compactar.isPending || undefined} onClick={() => void compactar.run(f.nombre)}>Compactar</button>
                                        <button type="button" className="boton boton--texto" data-accion="exportar" onClick={() => void exportar(f.nombre)}>Respaldo</button>
                                    </td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </>
            )}
            <section className="bloque">
                <h3 className="bloque__titulo">Acceso directo</h3>
                <p className="bloque__nota">Lee un solo registro del disco con <code>File.slice(n·L, (n+1)·L)</code> + <code>FileReader</code>, sin cargar el fichero completo.</p>
                <form className="filtros" data-accion="leer" onSubmit={enviar}>
                    <label className="campo campo--linea"><span>Fichero</span>
                        <select name="nombre" data-zona="nombres" value={seleccion.nombre} onChange={(e) => setSeleccion((s) => ({ ...s, nombre: e.target.value }))}>
                            {filesService.names().map((n) => <option key={n} value={n}>{n}.dat</option>)}
                        </select></label>
                    <label className="campo campo--linea"><span>Posición</span>
                        <input name="posicion" type="number" min={0} required value={seleccion.posicion}
                            onChange={(e) => setSeleccion((s) => ({ ...s, posicion: e.target.value }))} /></label>
                    <button className="boton boton--chico" disabled={leyendo}>Leer registro</button>
                </form>
                <div data-zona="registro">{lectura && <Registro {...lectura} />}</div>
            </section>
        </Section>
    );
}

function Registro({ nombre, posicion, leido }: Lectura) {
    const campos = filesService.fieldsOf(nombre);
    const L = 2 + campos.reduce((s, c) => s + c.bytes, 0);
    if (!leido) return <p className="vacio">Posición {posicion}: fin de fichero (EOF).</p>;
    let desplazamiento = 1;
    return (
        <div className={`registro ${leido.borrado ? 'registro--borrado' : ''}`}>
            <p className="registro__cabeza mono">{nombre}.dat · posición {posicion} · bytes {posicion * L}–{posicion * L + L - 1}
                {' '}· estado <strong>{leido.borrado ? "'*' borrado" : "'A' activo"}</strong></p>
            <table className="tabla tabla--compacta">
                <thead><tr><th>Campo</th><th>Tipo</th><th className="num">Desde</th><th className="num">Bytes</th><th>Valor</th></tr></thead>
                <tbody>{campos.map((c) => {
                    const desde = desplazamiento;
                    desplazamiento += c.bytes;
                    return (
                        <tr key={c.nombre}><td className="mono">{c.nombre}</td><td>{c.tipo}</td><td className="num mono">{desde}</td>
                            <td className="num mono">{c.bytes}</td><td className="mono">{formatear(leido.registro[c.nombre])}</td></tr>
                    );
                })}</tbody>
            </table>
        </div>
    );
}
