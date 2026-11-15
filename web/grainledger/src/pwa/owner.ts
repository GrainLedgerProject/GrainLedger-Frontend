import { useAuthStore } from "@/app/store/authStore";

/** Scope durable offline records to the account and organization that created them. */
export function currentOfflineOwnerKey(): string | null {
  const user = useAuthStore.getState().user;
  return user ? `${user.organizationId ?? "none"}:${user.id}` : null;
}
