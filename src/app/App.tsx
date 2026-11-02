// Composición de la app: proveedores (avisos, TanStack Query, router) + puerta de conexión.
// Mientras no hay carpeta conectada no se monta ninguna ruta: las vistas siempre tienen datos.

import { Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { queryClient } from '../store/queryClient';
import { NotificationsProvider } from '../store/notifications';
import { useConnection } from '../store/connection.store';
import { establecimiento } from '../services/connection.service';
import { Presentation } from '../views/presentation/Presentation';
import { ConnectionScreen } from '../views/connection/ConnectionScreen';
import { Layout } from './Layout';
import { RUTAS, RUTA_INICIAL } from './routes';

export function App() {
    return (
        <NotificationsProvider>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <Shell />
                </BrowserRouter>
            </QueryClientProvider>
        </NotificationsProvider>
    );
}

function Shell() {
    const c = useConnection();
    return (
        <>
            {c.presentando && <Presentation datos={establecimiento} alTerminar={c.terminarPresentacion} />}
            {c.estado.fase === 'lista' ? (
                <Routes>
                    <Route element={<Layout carpeta={c.estado.carpeta} alCambiarCarpeta={c.cambiarCarpeta} alVerPresentacion={c.verPresentacion} />}>
                        {RUTAS.map(({ ruta, Vista }) => (
                            <Route key={ruta} path={ruta} element={<Suspense fallback={null}><Vista /></Suspense>} />
                        ))}
                        <Route path="*" element={<Navigate to={RUTA_INICIAL} replace />} />
                    </Route>
                </Routes>
            ) : (
                <ConnectionScreen estado={c.estado} alElegir={() => void c.elegir()} alReconectar={(h) => void c.reconectar(h)} />
            )}
        </>
    );
}
