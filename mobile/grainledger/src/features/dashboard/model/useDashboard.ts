import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { useApiResource } from '@/hooks/use-api-resource';
import { ApiError } from '@/services/api/errors';
import { createDashboardService, dashboardSources, dashboardShortcuts } from '../api/dashboardApi';
import { dashboardConfig } from './dashboardConfig';

export function useDashboard() {
  const { client, user } = useAuth();
  const scope = client.getRequestScope();
  const [selection, setSelection] = useState<{ scope: string | null; id: string }>({ scope: null, id: '' });
  const selectedFacility = selection.scope === scope ? selection.id : undefined;
  const service = useMemo(() => user ? createDashboardService(client.api, user) : null, [client, user]);
  const lastAttempt = useRef(0);
  const load = useCallback((signal: AbortSignal) => {
    lastAttempt.current = Date.now();
    if (!service) return Promise.reject(new ApiError('Sign in to view the dashboard.', 401, 'expired'));
    return service.loadOverview(selectedFacility, signal);
  }, [service, selectedFacility]);
  const resource = useApiResource(load);
  const { reload } = resource;
  const refreshWhenStale = useCallback(() => {
    if (Date.now() - lastAttempt.current >= 30_000) void reload();
  }, [reload]);
  useFocusEffect(useCallback(() => { refreshWhenStale(); }, [refreshWhenStale]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => { if (next === 'active') refreshWhenStale(); });
    return () => subscription.remove();
  }, [refreshWhenStale]);
  const role = user?.normalizedRole ?? 'AUTHORIZED_STOCK_VIEWER';
  return { ...resource, user, role, config: dashboardConfig[role], overview: resource.data,
    sources: user ? dashboardSources(user) : [], shortcuts: user ? dashboardShortcuts(user) : [],
    needsFacility: role === 'MILL_MANAGER' || role === 'MILL_OPERATOR',
    fetching: resource.status === 'idle' || resource.status === 'loading',
    setSelectedFacility: (id: string) => setSelection({ scope, id }) };
}
