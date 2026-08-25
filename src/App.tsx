import { BrowserRouter } from 'react-router-dom';
import { DataProviderContext } from '@/data/DataProvider';
import type { DataProvider } from '@/data/repositories';
import { AppRoutes } from '@/routes';

/* Providers and the router, nothing else. The data adapter is injected rather
   than imported, which is what makes it swappable (CONTEXT.md §2). */

export function App({ provider }: { provider: DataProvider }) {
  return (
    <DataProviderContext provider={provider}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </DataProviderContext>
  );
}
