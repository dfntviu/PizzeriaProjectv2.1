// Orquestación de la bienvenida con la Web Animations API (portada de PresentacionView v2.1.0).
//   1. Secuencia fotográfica: cada foto aparece, se desvanece y sale en horizontal (×5).
//   2. Remolino: las cinco giran en espiral hacia el centro y quedan superpuestas.
//   3. Datos: nombre, dirección y teléfono aparecen de forma progresiva.
// React pinta el marcado; esta clase solo anima nodos ya montados. Sin estado de negocio.

// Composición final del remolino: desplazamiento (en múltiplos del ancho de foto), giro y capa.
// La foto 2 (pizza) queda al centro y encima.
const COMPOSICION = [
    { x: -0.62, y: -0.16, r: -11, z: 1 },
    { x: 0, y: 0, r: -1, z: 5 },
    { x: -0.34, y: 0.22, r: -4, z: 3 },
    { x: 0.38, y: 0.24, r: 6, z: 4 },
    { x: 0.6, y: -0.2, r: 9, z: 2 },
] as const;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const abortada = () => new DOMException('saltada', 'AbortError');

export class PresentationAnimation {
    private animaciones = new Set<Animation>();
    private detenida = false;
    private saliendo = false;

    constructor(private readonly raiz: HTMLElement, private readonly alTerminar: () => void) {}

    /** Arranca la secuencia. Si se destruye antes (desmontaje), no hace nada más. */
    async iniciar(fotos: string[]): Promise<void> {
        document.addEventListener('keydown', this.alTeclear);
        await this.precargar(fotos);
        if (this.detenida) return;
        const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
        try {
            if (!reducido) {
                await this.secuencia();
                await this.remolino();
            }
            await this.datos(reducido);
        } catch (error) {
            if ((error as Error)?.name !== 'AbortError') throw error; // AbortError = el usuario saltó
        }
    }

    /** «Saltar», Esc o «Entrar al mostrador»: termina lo que esté corriendo y sale con un fundido. */
    terminar = (): void => {
        if (this.saliendo || this.detenida) return;
        this.saliendo = true;
        this.cancelarAnimaciones();
        const salida = this.raiz.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease-in', fill: 'forwards' });
        salida.finished.catch(() => {}).then(() => {
            if (!this.detenida) this.alTerminar();
        });
    };

    /** Limpieza al desmontar (incluye el doble montaje de StrictMode en desarrollo). */
    destruir(): void {
        this.detenida = true;
        document.removeEventListener('keydown', this.alTeclear);
        this.cancelarAnimaciones();
    }

    private alTeclear = (e: KeyboardEvent) => {
        if (e.key === 'Escape') this.terminar();
    };

    // ── etapa 1 ──
    private async secuencia() {
        for (const foto of this.fotos()) {
            foto.classList.add('foto--grande');
            await this.animar(foto, [
                { opacity: 0, transform: 'translate(-50%, -50%) scale(.94)', filter: 'blur(6px)' },
                { opacity: 1, transform: 'translate(-50%, -50%) scale(1)', filter: 'blur(0)' },
            ], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
            await this.pausa(380);
            await this.animar(foto, [
                { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
                { opacity: 0, transform: 'translate(calc(-50% - 55vw), -50%) scale(.98)' },
            ], { duration: 380, easing: 'cubic-bezier(.6,0,.8,.4)' });
            foto.classList.remove('foto--grande');
        }
    }

    // ── etapa 2 ──
    private async remolino() {
        const fotos = this.fotos();
        const ancho = Math.min(window.innerWidth * 0.26, 250);
        const radioInicial = Math.hypot(window.innerWidth, window.innerHeight) * 0.55;
        const pasos = 14;
        const vueltas = 1.25 * 2 * Math.PI;
        await Promise.all(fotos.map((foto, i) => {
            foto.classList.add('foto--carta');
            const destino = COMPOSICION[i % COMPOSICION.length]!;
            foto.style.zIndex = String(destino.z);
            const angulo0 = (i / fotos.length) * 2 * Math.PI;
            const fotogramas = Array.from({ length: pasos + 1 }, (_, k) => {
                const t = k / pasos;
                const suave = 1 - (1 - t) ** 3; // desacelera al llegar
                const angulo = angulo0 + vueltas * suave;
                const radio = radioInicial * (1 - suave);
                const x = Math.cos(angulo) * radio + destino.x * ancho * suave;
                const y = Math.sin(angulo) * radio + destino.y * ancho * suave;
                const giro = (1 - suave) * 540 + destino.r * suave;
                return {
                    opacity: Math.min(1, t * 4),
                    transform: `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px)) rotate(${giro.toFixed(1)}deg) scale(${(0.5 + 0.5 * suave).toFixed(3)})`,
                };
            });
            return this.animar(foto, fotogramas, { duration: 1900, delay: i * 70, easing: 'linear', fill: 'forwards' });
        }));
        await this.pausa(250);
    }

    // ── etapa 3 ──
    private async datos(reducido: boolean) {
        const escena = this.raiz.querySelector<HTMLElement>('[data-escena]');
        if (!escena) return;
        if (reducido) {
            this.fotos().forEach((f, i) => {
                const d = COMPOSICION[i % COMPOSICION.length]!;
                f.classList.add('foto--carta');
                f.style.zIndex = String(d.z);
                f.style.opacity = '1';
                f.style.transform = `translate(calc(-50% + ${d.x * 200}px), calc(-50% + ${d.y * 200}px)) rotate(${d.r}deg)`;
            });
        } else {
            await this.animar(escena, [
                { transform: 'translateY(0) scale(1)' },
                { transform: 'translateY(-13vh) scale(.72)' },
            ], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
        }
        escena.classList.add('presentacion__escena--arriba');
        this.raiz.querySelector('[data-datos]')?.classList.add('visible');
        this.raiz.querySelectorAll<HTMLElement>('[data-paso]').forEach((paso, i) => {
            this.animaciones.add(paso.animate([
                { opacity: 0, transform: 'translateY(14px)', filter: 'blur(4px)' },
                { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' },
            ], { duration: reducido ? 1 : 520, delay: reducido ? 0 : i * 260, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' }));
        });
        this.raiz.querySelector<HTMLElement>('[data-entrar]')?.focus({ preventScroll: true });
    }

    // ── utilidades ──

    private fotos(): HTMLElement[] {
        return [...this.raiz.querySelectorAll<HTMLElement>('[data-foto]')];
    }

    private async animar(elemento: HTMLElement, fotogramas: Keyframe[], opciones: KeyframeAnimationOptions) {
        if (this.saliendo || this.detenida) throw abortada();
        const animacion = elemento.animate(fotogramas, { fill: 'both', ...opciones });
        this.animaciones.add(animacion);
        await animacion.finished; // rechaza con AbortError si se cancela
        return animacion;
    }

    private async pausa(ms: number) {
        await esperar(ms);
        if (this.saliendo || this.detenida) throw abortada();
    }

    private cancelarAnimaciones() {
        this.animaciones.forEach((a) => { if (a.playState !== 'finished') a.finish(); });
        this.animaciones.clear();
    }

    private async precargar(fotos: string[]) {
        // decode() evita que una foto aparezca a medio cargar en plena animación.
        await Promise.all(fotos.map((src) => {
            const img = new Image();
            img.src = src;
            return img.decode().catch(() => {});
        }));
    }
}
