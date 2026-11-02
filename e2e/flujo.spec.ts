// Prueba de extremo a extremo en Chromium: los 21 casos de v2.1.0 contra la app React.
// Es una sola historia sobre la misma carpeta de datos, así que corre en serie con una página compartida.
//
// Uso: npm run test:e2e        CAPTURAS=carpeta guarda capturas de pantalla.

import { test, type Page } from '@playwright/test';
import { crearAyudantes, prepararContexto } from './support';

test.describe.configure({ mode: 'serial' });

let p: Page;
let h: ReturnType<typeof crearAyudantes>;
const errores: string[] = [];

test.beforeAll(async ({ browser }, info) => {
    const contexto = await browser.newContext({ ...info.project.use });
    await prepararContexto(contexto);
    p = await contexto.newPage();
    h = crearAyudantes(p);
    p.on('pageerror', (e) => errores.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
    p.on('dialog', (d) => { errores.push(`diálogo inesperado: ${d.message()}`); void d.dismiss(); });

    // Carpeta OPFS limpia
    await p.goto('/');
    await p.evaluate(async () => {
        const raiz = await navigator.storage.getDirectory();
        await raiz.removeEntry('data-e2e', { recursive: true }).catch(() => {});
        await new Promise((r) => { const s = indexedDB.deleteDatabase('pizzeria-carpeta'); s.onsuccess = s.onerror = r; });
    });
    await p.reload();
});

test.afterAll(async () => {
    await p.context().close();
});

test('0a. Presentación: secuencia, remolino y datos del local', async () => {
    const inicio = Date.now();
    await p.goto('/?presentacion');
    await p.waitForSelector('.foto--grande', { timeout: 5000 });
    await p.waitForTimeout(250);
    await h.captura('00a-presentacion-secuencia');
    await p.waitForSelector('.foto--carta', { timeout: 10000 });
    await p.waitForTimeout(900);
    await h.captura('00b-presentacion-remolino');
    await p.waitForSelector('[data-entrar]', { state: 'visible', timeout: 12000 });
    await p.waitForTimeout(1600);
    const segundos = (Date.now() - inicio) / 1000;
    h.esperar(segundos < 13, `la presentación tardó ${segundos.toFixed(1)} s`);
    const datos = await h.texto('[data-datos]');
    h.esperar(datos.includes('La Pizzería') && datos.includes('Rinnodontte') && datos.includes('800 210 004X'), 'faltan datos del local');
    await h.captura('00c-presentacion-datos');
    await p.click('[data-entrar]');
    await p.waitForSelector('#presentacion', { state: 'hidden' });
    await p.waitForSelector('[data-conexion="elegir"]');
});

test('0b. Presentación: Esc la salta y "reducir movimiento" va directo a los datos', async () => {
    await p.goto('/?presentacion');
    await p.waitForSelector('.foto--grande');
    await p.keyboard.press('Escape');
    await p.waitForSelector('#presentacion', { state: 'hidden', timeout: 2000 });
    await p.emulateMedia({ reducedMotion: 'reduce' });
    const t0 = Date.now();
    await p.goto('/?presentacion');
    await p.waitForSelector('[data-entrar]', { state: 'visible', timeout: 3000 });
    h.esperar(Date.now() - t0 < 3000, 'con movimiento reducido no fue directa');
    await p.emulateMedia({ reducedMotion: 'no-preference' });
    await p.goto('/');
    await p.waitForSelector('[data-conexion="elegir"]');
});

test('1. Pantalla de conexión y alta de la carpeta (semillas → .dat)', async () => {
    await p.waitForSelector('[data-conexion="elegir"]');
    await h.captura('01-conexion');
    await p.click('[data-conexion="elegir"]');
    await p.waitForSelector('#app .platillo');
    h.esperar((await h.texto('#carpeta-actual')) === 'data-e2e', 'carpeta no mostrada');
    const productos = await h.leerDat('productos');
    h.esperar(productos.size === 12 * 199, `productos.dat mide ${productos.size}`);
    h.esperar((await p.locator('[data-panel="mostrador"] .platillo').count()) === 5, 'no hay 5 pizzas en el menú');
    h.esperar(new URL(p.url()).pathname === '/mostrador', `ruta inicial: ${p.url()}`);
});

test('2. Pedido: sin pedido abierto los botones están bloqueados; abrir y agregar', async () => {
    h.esperar(await p.locator('.platillo button').first().isDisabled(), 'Agregar habilitado sin pedido');
    await p.fill('.nuevo-pedido [name="nombre"]', 'Ana López');
    await p.fill('.nuevo-pedido [name="telefono"]', '55 1234 5678');
    await p.click('.nuevo-pedido button');
    await p.waitForSelector('.comanda__cliente');
    h.esperar((await h.texto('.comanda__rotulo')).includes('P-000001'), 'folio');
    const pep = p.locator('.platillo', { hasText: 'Pepperoni' });
    await pep.locator('input[value="mediana"]').check({ force: true });
    await pep.locator('[name="cantidad"]').fill('2');
    await pep.locator('button').click();
    await p.waitForSelector('.linea');
    await p.click('.pestana[data-categoria="bebida"]');
    const cola = p.locator('.platillo', { hasText: 'Refresco de cola' }).first();
    await cola.locator('[name="cantidad"]').fill('2');
    await cola.locator('button').click();
    await p.waitForFunction(() => document.querySelectorAll('.linea').length === 2);
    const total = await h.texto('.comanda__total dd');
    h.esperar(total.includes('448'), `total ${total}`);
    h.esperar((await h.texto('[data-zona="pedidos"] tbody tr')).includes('448'), 'la lista de pedidos no refleja el total');
    await h.captura('02-comanda');
});

test('3. Editar líneas (+/−/quitar) y recalcular', async () => {
    await p.locator('.linea', { hasText: 'Refresco' }).locator('[data-accion="mas"]').click();
    await p.waitForFunction(() => document.querySelector('.comanda__total dd')!.textContent!.includes('483'));
    await p.locator('.linea', { hasText: 'Refresco' }).locator('[data-accion="menos"]').click();
    await p.waitForFunction(() => document.querySelector('.comanda__total dd')!.textContent!.includes('448'));
});

test('4. Confirmar: turno 01, inventario descontado y movimientos', async () => {
    await p.click('[data-accion="confirmar"]');
    await p.waitForSelector('dialog[open] .turno__numero');
    h.esperar((await h.texto('dialog[open] .turno__numero')) === '01', 'turno');
    await h.captura('03-turno');
    await h.cerrarDialogo();
    h.esperar((await p.locator('.comanda--vacia').count()) === 1, 'la comanda no se liberó');
    await h.ir('inventario');
    const fila = p.locator('[data-zona="ingredientes"] tr', { hasText: 'Queso mozzarella' });
    h.esperar((await fila.innerText()).includes('8,660'), `mozzarella: ${await fila.innerText()}`); // 9000 − 2×170
    h.esperar((await p.locator('[data-zona="movimientos"] .etiqueta--consumo').count()) >= 5, 'sin movimientos de consumo');
    const movs = await h.leerDat('movimientos');
    h.esperar(movs.size % 303 === 0 && movs.size > 0, 'movimientos.dat con longitud incorrecta');
    await h.captura('04-inventario', true);
});

test('5. Caja: cobro en efectivo con cambio y ticket', async () => {
    await h.ir('caja');
    await p.waitForSelector('.pendiente');
    await h.captura('05-caja');
    await p.click('[data-accion="cobrar"]');
    await p.fill('dialog[open] [name="recibido"]', '500');
    h.esperar((await h.texto('dialog[open] [data-zona="cambio"]')).includes('52'), 'cambio en vivo');
    await p.click('dialog[open] form button:not([type="button"])');
    await p.waitForSelector('dialog[open] .ticket');
    h.esperar((await h.texto('dialog[open] .ticket')).includes('52.00'), 'cambio en ticket');
    await h.captura('06-ticket');
    await h.cerrarDialogo();
    h.esperar((await h.texto('.corte__cifra')).includes('448'), 'corte del día');
    h.esperar((await h.texto('[data-zona="semana"]')).includes('448'), 'la semana no se cargó');
    h.esperar((await p.locator('.pendiente').count()) === 0, 'sigue pendiente');
});

test('6. Inventario insuficiente: aviso de faltantes y nada se agrega', async () => {
    await h.ir('mostrador');
    await p.fill('.nuevo-pedido [name="nombre"]', 'Beto');
    await p.click('.nuevo-pedido button');
    await p.click('.pestana[data-categoria="bebida"]');
    const limonada = p.locator('.platillo', { hasText: 'Limonada' });
    await limonada.locator('[name="cantidad"]').fill('7');
    await limonada.locator('button').click();
    await p.waitForSelector('dialog[open] .dialogo__rotulo--alerta');
    h.esperar((await h.texto('dialog[open]')).includes('Limonada'), 'faltante no listado');
    await h.captura('07-faltantes');
    await h.cerrarDialogo();
    h.esperar((await p.locator('.linea').count()) === 0, 'se agregó sin stock');
});

test('7. Cancelar pedido confirmado: el helado regresa al almacén', async () => {
    await p.click('.pestana[data-categoria="helado"]');
    await p.locator('.platillo', { hasText: 'vainilla' }).locator('button').click();
    await p.waitForSelector('.linea');
    await p.click('[data-accion="confirmar"]');
    await p.waitForSelector('dialog[open] .turno__numero');
    h.esperar((await h.texto('dialog[open] .turno__numero')) === '02', 'turno 02');
    await h.cerrarDialogo();
    const fila = p.locator('[data-zona="pedidos"] tr', { hasText: 'Beto' });
    await fila.locator('[data-accion="descartar"]').click();
    await p.fill('dialog[open] [name="motivo"]', 'El cliente se retiró');
    await p.click('dialog[open] form .boton--peligro');
    await p.waitForFunction(() => document.querySelector('[data-zona="pedidos"] .chip--cancelado'));
    await h.ir('inventario');
    const vainilla = await p.locator('[data-zona="productos"] tr', { hasText: 'vainilla' }).innerText();
    h.esperar(vainilla.includes('20'), `vainilla: ${vainilla}`);
    h.esperar((await p.locator('[data-zona="movimientos"] .etiqueta--devolucion').count()) === 1, 'sin devolución');
});

test('8. Inventario: merma con motivo, entrada y receta técnica', async () => {
    await p.click('[data-accion="movimiento"][data-tipo="merma"]');
    await p.selectOption('dialog[open] [name="id"]', 'ing-albahaca');
    await p.fill('dialog[open] [name="cantidad"]', '120');
    await p.fill('dialog[open] [name="motivo"]', 'Se marchitó');
    await p.click('dialog[open] form .boton--primario');
    await p.waitForFunction(() => (document.querySelector('[data-zona="alertas"]') as HTMLElement).innerText.includes('Albahaca'));
    await p.locator('[data-zona="alertas"] button', { hasText: 'Albahaca' }).click();
    await p.fill('dialog[open] [name="cantidad"]', '200');
    await p.click('dialog[open] form .boton--primario');
    await p.waitForFunction(() => !(document.querySelector('[data-zona="alertas"]') as HTMLElement).innerText.includes('Albahaca'));
    await p.selectOption('[data-accion="receta-pizza"]', 'piz-margarita');
    await p.locator('.segmentado input[value="grande"]').check({ force: true });
    await p.waitForFunction(() => document.querySelector('.receta__nombre')?.textContent?.includes('Grande'));
    await p.locator('.receta input[data-ingrediente="ing-albahaca"]').fill('8');
    await p.click('.receta .boton--primario');
    await p.waitForFunction(() => (document.querySelector('.receta input[data-ingrediente="ing-albahaca"]') as HTMLInputElement).value === '8');
    await h.captura('08-receta', true);
});

test('9. Catálogo: alta de bebida (crea existencia), precio editado y desactivación', async () => {
    await h.ir('catalogo');
    await p.click('[data-accion="nuevo"]');
    await p.fill('dialog[open] [name="nombre"]', 'Té helado');
    await p.selectOption('dialog[open] [name="categoria"]', 'bebida');
    await p.fill('dialog[open] [name="presentacion"]', '500 ml');
    await p.fill('dialog[open] [name="precio"]', '38');
    await h.captura('09-alta-producto');
    await p.click('dialog[open] form .boton--primario');
    await p.waitForSelector('tr:has-text("Té helado")');
    await p.click('.pestana[data-categoria="todos"]');
    await p.locator('tr', { hasText: 'Pepperoni' }).locator('[data-accion="editar"]').click();
    await p.fill('dialog[open] [name="mediana"]', '199');
    await p.click('dialog[open] form .boton--primario');
    await p.waitForFunction(() => (document.querySelector('.tabla--catalogo') as HTMLElement).innerText.includes('199.00'));
    await p.locator('tr', { hasText: 'Helado de fresa' }).locator('[data-accion="desactivar"]').click();
    await p.waitForSelector('tr.fila--inactiva:has-text("fresa")');
    await h.captura('10-catalogo', true);
    const exi = await h.leerDat('existencias');
    h.esperar(exi.texto.includes('exi-beb-te-helado'), 'no se creó la existencia');
});

test('10. Precio congelado: el pedido P-000001 conserva $189 tras subir a $199', async () => {
    await h.ir('mostrador');
    await p.selectOption('[data-zona="clientes"]', 'tel-5512345678');
    await p.waitForSelector('[data-zona="historial"] .cifras');
    await p.locator('[data-zona="historial"] [data-accion="ver"]').first().click();
    await p.waitForSelector('dialog[open] .tabla');
    h.esperar((await h.texto('dialog[open] .tabla')).includes('189.00'), 'el precio cambió en el histórico');
    await h.cerrarDialogo();
    await p.click('.pestana[data-categoria="helado"]');
    h.esperar(!(await p.locator('[data-zona="menu"]').innerText()).includes('fresa'), 'producto inactivo en el menú');
});

test('11. Seguridad: el nombre del cliente se muestra como texto (sin XSS)', async () => {
    await p.fill('.nuevo-pedido [name="nombre"]', '<img src=x onerror=alert(1)>');
    await p.click('.nuevo-pedido button');
    await p.waitForSelector('.comanda__cliente');
    h.esperar((await h.texto('.comanda__cliente')) === '<img src=x onerror=alert(1)>', 'nombre alterado');
    h.esperar((await p.locator('.comanda img').count()) === 0, 'se inyectó HTML');
    await p.click('[data-accion="descartar"]'); // sin líneas: se elimina (borrado lógico)
    await p.waitForSelector('.comanda--vacia');
});

test('12. Ficheros: acceso directo a un registro y compactación', async () => {
    await h.ir('ficheros');
    await p.waitForSelector('[data-panel="ficheros"] [data-zona="tabla"] tr');
    await h.captura('11-ficheros');
    const fila = p.locator('[data-panel="ficheros"] [data-zona="tabla"] tr', { hasText: 'pedidos.dat' }).first();
    h.esperar((await fila.innerText()).includes('340'), 'L de pedidos');
    await p.selectOption('form[data-accion="leer"] [name="nombre"]', 'pedidos');
    await p.fill('form[data-accion="leer"] [name="posicion"]', '2');
    await p.click('form[data-accion="leer"] button');
    await p.waitForSelector('.registro');
    const reg = await h.texto('[data-panel="ficheros"] .registro');
    h.esperar(reg.includes("'*' borrado") && reg.includes('bytes 680–1019'), `registro: ${reg.slice(0, 120)}`);
    await h.captura('12-acceso-directo', true);
    const antes = (await h.leerDat('pedidos')).size;
    await fila.locator('[data-accion="compactar"]').click();
    await p.waitForFunction(() => (document.querySelector('#avisos') as HTMLElement).innerText.includes('compactado'));
    const despues = (await h.leerDat('pedidos')).size;
    h.esperar(antes - despues === 340, `compactar: ${antes} → ${despues}`);
});

test('13. Persistencia: al recargar se reconecta la carpeta y los datos siguen', async () => {
    await p.reload();
    // El router conserva la sección: se recarga en /ficheros y se vuelve a ella tras reconectar.
    await p.waitForSelector('#app [data-panel="ficheros"]');
    h.esperar(new URL(p.url()).pathname === '/ficheros', `ruta tras recargar: ${p.url()}`);
    await h.ir('caja');
    h.esperar((await h.texto('.corte__cifra')).includes('448'), 'se perdieron las ventas');
    await h.ir('mostrador');
    h.esperar((await p.locator('[data-zona="pedidos"] tbody tr').count()) === 2, 'pedidos del día');
});

test('14. Cierre de caja bloquea nuevos cobros del día', async () => {
    await p.fill('.nuevo-pedido [name="nombre"]', 'Carla');
    await p.click('.nuevo-pedido button');
    await p.click('.pestana[data-categoria="bebida"]');
    await p.locator('.platillo', { hasText: 'Agua natural' }).locator('button').click();
    await p.waitForSelector('.linea');
    await p.click('[data-accion="confirmar"]');
    await p.waitForSelector('dialog[open] .turno__numero');
    await h.cerrarDialogo();
    await h.ir('caja');
    await p.click('[data-accion="cerrar-caja"]');
    h.esperar((await h.texto('dialog[open]')).includes('1 pedido'), 'no avisa del pendiente');
    await p.click('[data-accion="confirmar-cierre"]', { timeout: 5000 });
    await p.waitForSelector('dialog[open] .ficha');
    await h.captura('13-cierre');
    await h.cerrarDialogo();
    await p.click('[data-accion="cobrar"]');
    await p.locator('dialog[open] .segmentado input[value="tarjeta"]').check({ force: true });
    await p.click('dialog[open] form .boton--primario');
    await p.waitForFunction(() => (document.querySelector('#avisos') as HTMLElement).innerText.includes('cerrada'));
    h.esperar((await h.ultimoAviso()).includes('ya está cerrada'), 'el cobro no se bloqueó');
});

test('14b. Domicilio: captura, etiqueta, fuera de Caja, entrega a tiempo y no entregado', async () => {
    await p.keyboard.press('Escape');
    await h.ir('mostrador');
    const abrirDomicilio = async (nombre: string, telefono: string, direccion: string) => {
        await p.fill('.nuevo-pedido [name="nombre"]', nombre);
        await p.check('.nuevo-pedido [name="domicilio"]', { force: true });
        await p.fill('.nuevo-pedido [name="telefono"]', telefono);
        await p.fill('.nuevo-pedido [name="direccion"]', direccion);
        await p.click('.nuevo-pedido > .boton--primario');
        await p.waitForSelector('.comanda__entrega');
        await p.click('.pestana[data-categoria="pizza"]');
        const pep = p.locator('.platillo', { hasText: 'Pepperoni' });
        await pep.locator('input[value="chica"]').check({ force: true });
        await pep.locator('button').click();
        await p.waitForSelector('.linea');
        await p.click('[data-accion="confirmar"]');
        await p.waitForSelector('dialog[open] .turno__numero');
        h.esperar((await h.texto('dialog[open]')).includes('A domicilio'), 'el turno no indica domicilio');
        await h.cerrarDialogo();
    };
    await abrirDomicilio('Lucía Domicilio', '722 123 4567', 'Av. Calle de la Soledad 12');
    h.esperar((await p.locator('[data-zona="pedidos"] tr', { hasText: 'Lucía' }).locator('.etiqueta--domicilio').count()) === 1, 'sin etiqueta Domicilio');
    await h.ir('caja');
    h.esperar(!(await p.locator('[data-zona="pendientes"]').innerText()).includes('Lucía'), 'el domicilio aparece en Caja');
    await h.ir('domicilio');
    await p.waitForSelector('.entrega--proceso');
    await h.captura('15-domicilio-proceso');
    await p.locator('.entrega', { hasText: 'Lucía' }).locator('[data-accion="entregar"]').click();
    await p.waitForSelector('dialog[open] form[data-accion="registrar-entrega"]');
    await p.click('dialog[open] form .boton--primario');
    await p.waitForSelector('.entrega--entregado');
    h.esperar((await h.texto('.entrega--entregado')).includes('A tiempo'), 'no marcó a tiempo');
    h.esperar((await h.texto('[data-panel="domicilio"] .corte__cifra')).includes('129'), 'recaudación');
    await h.ir('mostrador');
    await abrirDomicilio('Mario Domicilio', '722 765 4321', 'Calle Falsa 123');
    await h.ir('domicilio');
    await p.locator('.entrega', { hasText: 'Mario' }).locator('[data-accion="entregar"]').click();
    await p.locator('dialog[open] input[value="no"]').check({ force: true });
    await p.fill('dialog[open] [name="motivo"]', 'Nadie atendió');
    await p.click('dialog[open] form .boton--primario');
    await p.waitForSelector('.entrega--fallido');
    const resumen = await h.texto('[data-panel="domicilio"] [data-zona="dia"]');
    h.esperar(resumen.includes('129') && /2\s*atendidos/i.test(resumen), `resumen: ${resumen.replace(/\s+/g, ' ')}`);
    await h.captura('16-domicilio', true);
    const dom = await h.leerDat('domicilios');
    h.esperar(dom.size === 2 * 436, `domicilios.dat mide ${dom.size}`);
});

test('15. Doble clic: no duplica pedidos ni productos', async () => {
    await p.keyboard.press('Escape');
    await h.ir('mostrador');
    const antes = await p.locator('[data-zona="pedidos"] tbody tr').count();
    await p.fill('.nuevo-pedido [name="nombre"]', 'Doble Clic');
    await p.dblclick('.nuevo-pedido button');
    await p.waitForSelector('.comanda__cliente');
    await p.waitForTimeout(400);
    const despues = await p.locator('[data-zona="pedidos"] tbody tr').count();
    h.esperar(despues === antes + 1, `se abrieron ${despues - antes} pedidos`);
    await p.click('.pestana[data-categoria="bebida"]');
    await p.locator('.platillo', { hasText: 'Agua natural' }).locator('button').dblclick();
    await p.waitForSelector('.linea');
    await p.waitForTimeout(400);
    const cantidad = await h.texto('.linea .paso .mono');
    h.esperar(cantidad === '1', `cantidad tras doble clic: ${cantidad}`);
});

test('15b. Tema: caja de pizza por defecto, alterna a crema y se recuerda', async () => {
    h.esperar((await p.getAttribute('html', 'data-tema')) === 'kraft', 'el tema por defecto no es kraft');
    await p.click('#alternar-tema');
    h.esperar((await p.getAttribute('html', 'data-tema')) === 'crema', 'no cambió a crema');
    h.esperar((await p.getAttribute('#alternar-tema', 'aria-pressed')) === 'false', 'aria-pressed');
    await p.reload();
    await p.waitForSelector('#app .platillo');
    h.esperar((await p.getAttribute('html', 'data-tema')) === 'crema', 'el tema no se recordó');
    await p.click('#alternar-tema');
    h.esperar((await p.getAttribute('html', 'data-tema')) === 'kraft', 'no volvió a kraft');
});

test('16. Vista móvil (390 px) sin desbordes horizontales', async () => {
    await p.keyboard.press('Escape');
    await p.setViewportSize({ width: 390, height: 844 });
    await h.ir('mostrador');
    await h.captura('14-movil', true);
    const desborde = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    h.esperar(desborde <= 1, `desborde de ${desborde}px`);
});

test('17. Sin errores en consola', async () => {
    h.esperar(errores.length === 0, errores.join(' | '));
});
