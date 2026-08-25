import { createContext, useContext, type ReactNode } from 'react';
import type { DataProvider } from './repositories';

/* The provider is injected once, at the root. Nothing reaches for a module
   singleton, so tests (and a future real adapter) swap it by wrapping a
   different value — no mocking of import paths. */

const DataContext = createContext<DataProvider | null>(null);

export function DataProviderContext({
  provider,
  children,
}: {
  provider: DataProvider;
  children: ReactNode;
}) {
  return <DataContext.Provider value={provider}>{children}</DataContext.Provider>;
}

export function useData(): DataProvider {
  const provider = useContext(DataContext);
  if (!provider) {
    throw new Error('useData() must be used inside <DataProviderContext>. See src/main.tsx.');
  }
  return provider;
}
