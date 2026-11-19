import { useAuthStore } from "@/app/store/authStore";
import type { UserProfile } from "@/shared/types/session";

/** Scope durable offline records to the account and organization that created them. */
export function selectSessionOwner({ user }: { user: UserProfile | null }): string | null {
  return user ? `${user.organizationId ?? "none"}:${user.id}` : null;
}

export function selectSessionScope(state: ReturnType<typeof useAuthStore.getState>): string {
  return JSON.stringify([state.sessionVersion, selectSessionOwner(state), state.user?.role, state.user?.permissions.toSorted()]);
}

export function currentOfflineOwnerKey(): string | null {
  return selectSessionOwner(useAuthStore.getState());
}
