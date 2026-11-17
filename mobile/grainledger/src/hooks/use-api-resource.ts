import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { ApiError } from '@/services/api/errors';
import { createAsyncResource } from '@/state/async-resource';

/** Pass a stable loader (service method or useCallback). Auth scope changes replace state before rendering. */
export function useApiResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const { client } = useAuth();
  const scope = client.getRequestScope();
  const resource = useMemo(() => createAsyncResource((signal) => scope === null
    ? Promise.reject(new ApiError('Sign in to continue.', 401, 'expired')) : load(signal)), [load, scope]);
  const state = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getServerSnapshot);
  useEffect(() => {
    if (scope !== null) void resource.run();
    return () => resource.reset();
  }, [resource, scope]);
  return { ...state, isLoading: state.status === 'loading', reload: resource.run, reset: resource.reset };
}
