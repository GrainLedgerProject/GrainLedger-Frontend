import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useMutation } from "@tanstack/react-query";
import {
  buildPendingStorageKey,
  clearPendingCommand,
  extractCommandEtag,
  getCurrentPendingOwnerKey,
  isUncertainCommandError,
  loadPendingCommand,
  readPendingCommandSync,
  savePendingCommandSync,
  subscribePendingCommandScope,
  type PendingCommandRecord,
} from "./pendingCommandStore";

export interface UseCommandOptions<T> {
  persistKey?: string;
  extractEtag?: (input: T) => string | undefined;
}

export function useCommand<T>(
  send: (operationId: string, input: T) => Promise<unknown>,
  saved: () => void | Promise<void>,
  options?: UseCommandOptions<T>,
) {
  const ownerKey = useSyncExternalStore(
    subscribePendingCommandScope,
    getCurrentPendingOwnerKey,
    () => "anonymous",
  );
  const persistKey = options?.persistKey;
  const extractEtag = options?.extractEtag;

  const storageKey = useMemo(() => {
    if (!persistKey) return null;
    return buildPendingStorageKey(persistKey, ownerKey);
  }, [persistKey, ownerKey]);

  const [liveRecord, setLiveRecord] = useState<{
    key: string;
    record: PendingCommandRecord<T> | null;
  } | null>(null);

  const restoredPending = useMemo(() => {
    if (!storageKey) return null;
    if (liveRecord && liveRecord.key === storageKey) return liveRecord.record;
    return readPendingCommandSync<T>(storageKey);
  }, [storageKey, liveRecord]);

  const previous = useRef<{ payload: string; id: string } | null>(null);
  const busy = useRef(false);
  const forcedOperationIdRef = useRef<string | undefined>(undefined);
  const activeAttempt = useRef<{
    id: string;
    payload: T;
    payloadJson: string;
    etag?: string;
    createdAt: string;
    storageKey: string | null;
  } | null>(null);

  useEffect(() => {
    if (!storageKey) return;
    let cancelled = false;
    void loadPendingCommand<T>(storageKey).then((asyncRecord) => {
      if (!cancelled) {
        setLiveRecord({ key: storageKey, record: asyncRecord });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const mutation = useMutation({
    mutationFn: async (input: T) => {
      const forcedOperationId = forcedOperationIdRef.current;
      forcedOperationIdRef.current = undefined;
      const payloadJson = JSON.stringify(input);
      let operationId = forcedOperationId;
      if (!operationId) {
        if (restoredPending?.payloadJson === payloadJson) {
          operationId = restoredPending.operationId;
        } else if (previous.current?.payload === payloadJson) {
          operationId = previous.current.id;
        } else {
          operationId = crypto.randomUUID();
        }
      }
      previous.current = { payload: payloadJson, id: operationId };
      const now = new Date().toISOString();
      const etag =
        extractEtag?.(input) ??
        restoredPending?.etag ??
        extractCommandEtag(input);
      const createdAt =
        restoredPending?.operationId === operationId
          ? restoredPending.createdAt
          : now;
      const attempt = {
        id: operationId,
        payload: input,
        payloadJson,
        etag,
        createdAt,
        storageKey,
      };
      activeAttempt.current = attempt;
      if (storageKey) {
        const record: PendingCommandRecord<T> = {
          storageKey,
          operationId,
          payload: input,
          payloadJson,
          etag,
          status: "inflight",
          createdAt,
          updatedAt: now,
        };
        savePendingCommandSync(record);
      }
      return send(operationId, input);
    },
    onSuccess: async () => {
      previous.current = null;
      const keyToClear = activeAttempt.current?.storageKey ?? storageKey;
      activeAttempt.current = null;
      if (keyToClear) {
        setLiveRecord({ key: keyToClear, record: null });
        await clearPendingCommand(keyToClear);
      }
      await saved();
    },
    onError: async (error) => {
      const attempt = activeAttempt.current;
      activeAttempt.current = null;
      const keyToUpdate = attempt?.storageKey ?? storageKey;
      if (isUncertainCommandError(error)) {
        if (attempt && keyToUpdate) {
          const uncertainRecord: PendingCommandRecord<T> = {
            storageKey: keyToUpdate,
            operationId: attempt.id,
            payload: attempt.payload,
            payloadJson: attempt.payloadJson,
            etag: attempt.etag,
            status: "uncertain",
            createdAt: attempt.createdAt,
            updatedAt: new Date().toISOString(),
          };
          savePendingCommandSync(uncertainRecord);
          setLiveRecord({ key: keyToUpdate, record: uncertainRecord });
        }
      } else if (keyToUpdate) {
        setLiveRecord({ key: keyToUpdate, record: null });
        await clearPendingCommand(keyToUpdate);
      }
    },
    onSettled: () => {
      busy.current = false;
    },
  });

  function submit(input: T) {
    if (!busy.current) {
      busy.current = true;
      forcedOperationIdRef.current = undefined;
      mutation.mutate(input);
    }
  }

  function retry() {
    if (busy.current) return;
    if (restoredPending) {
      busy.current = true;
      forcedOperationIdRef.current = restoredPending.operationId;
      mutation.mutate(restoredPending.payload);
      return;
    }
    if (mutation.variables !== undefined) {
      busy.current = true;
      forcedOperationIdRef.current = undefined;
      mutation.mutate(mutation.variables);
    }
  }

  async function discardPending() {
    previous.current = null;
    if (storageKey) {
      setLiveRecord({ key: storageKey, record: null });
      await clearPendingCommand(storageKey);
    }
  }

  const liveUncertain =
    mutation.isError && isUncertainCommandError(mutation.error);
  const uncertain = liveUncertain || restoredPending !== null;

  return {
    ...mutation,
    submit,
    retry,
    discardPending,
    restoredPending,
    hasPendingRecovery: restoredPending !== null,
    uncertain,
  };
}
