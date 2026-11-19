import { ApiError } from "@/api/client";
import { useCommand } from "@/shared/hooks/useCommand";

/** A timed-out write must replay its original payload, even if a background read changed versions. */
export function useContainerCommand<T>(send: (operationId: string, input: T) => Promise<unknown>, saved: () => void | Promise<void>) {
  const command = useCommand(send, saved);
  const uncertain = command.isError && (!(command.error instanceof ApiError) || command.error.status === 0);
  return { ...command, uncertain, retry() { if (command.variables !== undefined) command.submit(command.variables); } };
}
