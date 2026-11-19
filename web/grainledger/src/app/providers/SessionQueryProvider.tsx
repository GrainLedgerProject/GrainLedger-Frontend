import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/app/store/authStore";
import { selectSessionScope } from "@/app/store/sessionOwner";
import { useFeedbackStore } from "@/app/store/feedbackStore";

function SessionQueries({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 5 * 60 * 1000,
      },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export function SessionQueryProvider({ children }: { children: ReactNode }) {
  const scope = useAuthStore(selectSessionScope);
  useEffect(() => useAuthStore.subscribe((next, previous) => {
    if (selectSessionScope(next) === selectSessionScope(previous)) return;
    // A confirmation opened for the previous organization must never authorize a new request.
    useFeedbackStore.getState().resolveConfirm(false);
    useFeedbackStore.setState({ toasts: [] });
  }), []);
  return <SessionQueries key={scope}>{children}</SessionQueries>;
}
