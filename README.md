# La Pizzería · Front-end React (fase F0)

React 19 + TypeScript (strict) + Vite 8 + React Router 7 + TanStack Query 5.
**La persistencia no cambia**: siguen siendo los 11 ficheros `.dat` y los mismos modelos de `../src/model`.
Lo único que se reemplazó es la capa de vista y los controladores.

## Uso

```bash
cd web
npm install
npm run dev          # http://localhost:5173 (Chrome o Edge de escritorio)
npm run build        # verifica tipos y genera dist/
npm run test:e2e     # 21 casos E2E × 2: paquete de producción y servidor de desarrollo (StrictMode)
                     # CAPTURAS=carpeta npm run test:e2e guarda capturas
npx playwright install chromium   # solo la primera vez, en un equipo nuevo
```

Las 17 pruebas unitarias se siguen corriendo desde la raíz (`npm test`): prueban los modelos, que no cambiaron.

## Arquitectura SSV (Service-Store-View)

```
View  (src/views/**)      componentes; solo usan hooks del Store. Sin reglas de negocio.
  │
Store (src/store/**)      TanStack Query: consultas, mutaciones, invalidación por dominio
  │                       + estado de interfaz que sobrevive a la navegación (uiState.ts).
Service (src/services/**) casos de uso (antes Controller/*.js). Únicos que conocen los modelos.
  │
Modelos JS (../src/model) los mismos de v2.1.0 → FicheroRepository → data/*.dat
```

| v2.1.0 | F0 (React) |
|---|---|
| `app.js` (composición) | `services/system.ts` + `app/App.tsx` |
| `Controller/ClienteController.js` | `services/orders.service.ts` + `store/counter.store.ts` |
| `Controller/ejecutar.js` | `services/errors.ts` + `store/useBusinessMutation.ts` |
| `VistaBase` (`aria-busy`, doble clic) | `useBusinessMutation` (bloqueo síncrono con ref) + `busyProps` |
| `DashboardView` (secciones, avisos, tema) | `app/Layout.tsx` (React Router), `store/notifications.tsx` |
| `View/*View.js` (`innerHTML`) | `views/*/…Page.tsx` (JSX; React escapa el texto: sin XSS) |
| `setInterval` de Domicilio (30 s) | `refetchInterval` de la consulta (se elimina en F4) |

**Frontera tipada.** Los modelos siguen en JavaScript. `types/models.ts` declara el contrato de los métodos
que usa la capa Service y `types/domain.ts` los datos que devuelven. Si un modelo cambia, se ajusta ahí.

**Invalidación.** Cada caso de uso declara qué dominios toca (`AFECTA` en `store/queryKeys.ts`). Es la misma
tabla que en F4 aplicarán los eventos de Realtime (informe 7.3).

## Rutas

`/mostrador` · `/catalogo` · `/inventario` · `/caja` · `/domicilio` · `/ficheros`. Cada vista se carga
bajo demanda. Al publicar en un hosting estático hay que redirigir toda ruta a `index.html`
(Netlify: `_redirects`; Vercel: `rewrites`; Nginx: `try_files $uri /index.html`).

## Diferencias con v2.1.0

- Navegación con URL propia; recargar conserva la sección (antes siempre volvía al Mostrador).
- CSS idéntico (`src/styles/global.css`) salvo las rutas de las fuentes y `.riel__nav a` en lugar de `button`.
- Las E2E corren también en modo desarrollo: StrictMode ejecuta cada efecto dos veces y ahí apareció un
  fallo que producción no mostraba (los diálogos se cerraban solos; ver `views/components/Dialog.tsx`).
- Mientras corre una escritura, otras del mismo tipo se ignoran (p. ej., dos «Agregar» seguidos de distintos
  productos). Es intencional: equivale al `scope` por pedido del informe (6.5 b).
