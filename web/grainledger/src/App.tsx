import { router } from "@/app/router/routes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { FeedbackHost } from "./components/FeedbackHost/FeedbackHost";
import { useProcurementSync } from "./pwa/useProcurementSync";

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
  useProcurementSync();

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <FeedbackHost />
    </QueryClientProvider>
  );
}

export default App;
