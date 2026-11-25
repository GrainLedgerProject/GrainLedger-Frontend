import { useCommand, type UseCommandOptions } from "@/shared/hooks/useCommand";
import { isUncertainCommandError } from "@/shared/hooks/pendingCommandStore";

export function useContainerCommand<T>(
  send: (operationId: string, input: T) => Promise<unknown>,
  saved: () => void | Promise<void>,
  options?: UseCommandOptions<T>,
) {
  const command = useCommand(send, saved, options);
  const liveUncertain =
    command.isError && isUncertainCommandError(command.error);
  const uncertain = liveUncertain || command.hasPendingRecovery;

  return {
    ...command,
    uncertain,
  };
}
