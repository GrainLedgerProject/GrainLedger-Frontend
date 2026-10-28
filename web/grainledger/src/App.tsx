import '@/app/i18n';
import { router } from '@/app/router/routes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useUiStore } from './app/store/uiStore';
import { getQueuedProcurementCount, onProcurementQueueChanged, syncQueuedProcurements } from './pwa/procurementQueue';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export function App() {
  const setPendingOfflineCount = useUiStore((state) => state.setPendingOfflineCount);

  useEffect(() => {
    const refreshCount = () => {
      void getQueuedProcurementCount().then(setPendingOfflineCount).catch(() => undefined);
    };
    const synchronize = () => {
      void syncQueuedProcurements().finally(refreshCount);
    };

    refreshCount();
    const unsubscribe = onProcurementQueueChanged(refreshCount);
    if (navigator.onLine) synchronize();
    window.addEventListener('online', synchronize);
    return () => {
      window.removeEventListener('online', synchronize);
      unsubscribe();
    };
  }, [setPendingOfflineCount]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
