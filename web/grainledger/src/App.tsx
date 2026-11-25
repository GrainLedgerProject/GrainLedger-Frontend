import { router } from "@/app/router/routes";
import { SessionQueryProvider } from "@/app/providers/SessionQueryProvider";
import { RouterProvider } from "react-router-dom";
import { FeedbackHost } from "@/app/layout/FeedbackHost";
import { useProcurementSync } from "@/features/field/offline/useProcurementSync";

export function App() {
  useProcurementSync();

  return (
    <SessionQueryProvider>
      <RouterProvider router={router} />
      <FeedbackHost />
    </SessionQueryProvider>
  );
}

export default App;
