import { useIsFocused } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/** Native equivalent of source focus freshness. Do not discard an open form or duplicate the initial resource load. */
export function useDomainRefresh(reload: () => Promise<unknown>, blocked = false) {
  const focused = useIsFocused();
  const wasFocused = useRef(false);
  const visited = useRef(false);
  useEffect(() => {
    if (focused) {
      if (!wasFocused.current && visited.current && !blocked) void reload();
      visited.current = true;
    }
    wasFocused.current = focused;
  }, [focused, blocked, reload]);
  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      if (previous !== 'active' && next === 'active' && focused && !blocked) void reload();
      previous = next;
    });
    return () => subscription.remove();
  }, [focused, blocked, reload]);
}
