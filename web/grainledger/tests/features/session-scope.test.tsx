import { act, cleanup, render, screen } from "@testing-library/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { afterEach, expect, it } from "vitest";
import { SessionQueryProvider } from "@/app/providers/SessionQueryProvider";
import { useAuthStore } from "@/app/store/authStore";
import { confirmAction, useFeedbackStore } from "@/app/store/feedbackStore";

afterEach(() => {
  cleanup();
  useAuthStore.setState({ user: null });
});

it("discards cached data and cancels a pending write confirmation when the organization changes", async () => {
  const user = { id: "user", role: "MILL_ADMIN" as const, permissions: ["platform.configure"],
    displayName: "Admin", email: "admin@example.test", isActive: true, organizationId: "mill-a" };
  useAuthStore.setState({ user });
  function Consumer() {
    const cache = useQueryClient();
    const { data } = useQuery<string>({ queryKey: ["setup"], enabled: false });
    return <button onClick={() => cache.setQueryData(["setup"], "previous mill")}>
      {data ?? "empty"}
    </button>;
  }
  render(<SessionQueryProvider><Consumer /></SessionQueryProvider>);
  act(() => screen.getByRole("button").click());
  await screen.findByRole("button", { name: "previous mill" });
  let confirmed!: Promise<boolean>;
  act(() => { confirmed = confirmAction("Approve previous mill change?"); });
  act(() => useAuthStore.setState({ user: { ...user, organizationId: "mill-b" } }));
  expect(await confirmed).toBe(false);
  expect(useFeedbackStore.getState().confirmDialog).toBeNull();
  expect(screen.getByRole("button").textContent).toBe("empty");
});
