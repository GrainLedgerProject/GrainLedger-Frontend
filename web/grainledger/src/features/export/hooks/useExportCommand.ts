import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";

/** Keep the command ID when retrying the same request after an uncertain response. */
export function useExportCommand<T>(send: (operationId: string, input: T) => Promise<unknown>, saved: () => void | Promise<void>) {
  const previous = useRef<{ payload: string; id: string } | null>(null);
  const busy = useRef(false);
  const mutation = useMutation({
    mutationFn: (input: T) => {
      const payload = JSON.stringify(input);
      if (previous.current?.payload !== payload) previous.current = { payload, id: crypto.randomUUID() };
      return send(previous.current.id, input);
    },
    onSuccess: async () => { previous.current = null; await saved(); },
    onSettled: () => { busy.current = false; },
  });
  return { ...mutation, submit(input: T) {
    if (!busy.current) { busy.current = true; mutation.mutate(input); }
  } };
}
