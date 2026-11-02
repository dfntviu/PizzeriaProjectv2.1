// Configuración de TanStack Query para F0.
//
// Hoy la fuente de verdad son los modelos en memoria de ESTA pestaña, y nadie más escribe:
// por eso los datos no caducan solos (staleTime: Infinity) y se refrescan solo al invalidar
// tras cada escritura. En F2, cuando la fuente sea Postgres, se aplica la configuración del
// informe (6.3 y 6.4): staleTime por recurso, reintentos y networkMode 'offlineFirst'.

import { QueryClient } from '@tanstack/react-query';
import type { Dominio } from './queryKeys';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: Infinity,
            retry: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
        },
        mutations: { retry: false },
    },
});

/** Invalida los dominios indicados y espera a que las consultas visibles se vuelvan a leer. */
export function invalidar(client: QueryClient, dominios: readonly Dominio[]): Promise<void> {
    return client.invalidateQueries({ predicate: (q) => dominios.includes(q.queryKey[0] as Dominio) });
}
