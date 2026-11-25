import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationCenter } from "@/app/layout/NotificationCenter";
import { ledgerEndpoints } from "@/api/ledger";
const auth = vi.hoisted(() => ({
  user: {
    id: "one",
    organizationId: "org",
    role: "MILL_MANAGER",
    permissions: [],
  },
}));
vi.mock("@/app/store/authStore", () => ({
  useAuthStore: (select: (s: typeof auth) => unknown) => select(auth),
}));
vi.mock("@/app/store/uiStore", () => ({
  useUiStore: (select: (s: object) => unknown) =>
    select({ isNotificationsOpen: true, setNotificationsOpen: vi.fn() }),
}));
vi.mock("@/api/ledger", () => ({
  ledgerEndpoints: { getNotifications: vi.fn(), readNotification: vi.fn() },
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));
let cache: QueryClient;
const item = {
  id: "notice",
  holdId: "hold",
  lotId: "lot",
  ownerId: "org",
  ownerName: "Owner",
  message: "Real server message",
  createdAt: "2026-11-16T00:00:00Z",
  readAt: null,
};
let read = false;
beforeEach(() => {
  vi.clearAllMocks();
  read = false;
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  vi.mocked(ledgerEndpoints.getNotifications).mockImplementation(
    async (query) => ({
      items:
        query?.pageSize === 1
          ? []
          : [{ ...item, readAt: read ? item.createdAt : null }],
      totalCount: query?.status === "UNREAD" && read ? 0 : 1,
      page: 1,
      pageSize: 20,
      hasMore: false,
    }),
  );
  vi.mocked(ledgerEndpoints.readNotification).mockImplementation(async () => {
    read = true;
    return { id: item.id };
  });
});
afterEach(() => {
  cleanup();
  cache.clear();
});
const mount = () =>
  render(
    <QueryClientProvider client={cache}>
      <NotificationCenter />
    </QueryClientProvider>,
  );
describe("Notification center", () => {
  it("renders server messages and refetches after marking read", async () => {
    mount();
    await screen.findByText(item.message);
    fireEvent.click(
      screen.getByRole("button", { name: "notifications.markRead" }),
    );
    await waitFor(() =>
      expect(ledgerEndpoints.readNotification).toHaveBeenCalled(),
    );
    await screen.findByText("notifications.read");
    expect(
      screen.queryByRole("button", { name: "notifications.markRead" }),
    ).toBeNull();
  });
  it("keeps unread state when marking read fails", async () => {
    vi.mocked(ledgerEndpoints.readNotification).mockRejectedValue(
      new Error("Denied"),
    );
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "notifications.markRead" }),
    );
    await screen.findByText("notifications.readError");
    expect(screen.getByText("notifications.unread")).toBeTruthy();
  });
  it("shows a load error rather than a fake empty state", async () => {
    vi.mocked(ledgerEndpoints.getNotifications).mockRejectedValue(
      new Error("Offline"),
    );
    mount();
    await screen.findByRole("alert");
    expect(screen.queryByText("notifications.empty")).toBeNull();
  });
  it("queries unread filter and isolates data after switching users", async () => {
    const view = mount();
    await screen.findByText(item.message);
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() =>
      expect(ledgerEndpoints.getNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ status: "UNREAD", pageSize: 20 }),
        expect.anything(),
      ),
    );
    auth.user.id = "two";
    vi.mocked(ledgerEndpoints.getNotifications).mockImplementation(
      () => new Promise(() => {}),
    );
    view.rerender(
      <QueryClientProvider client={cache}>
        <NotificationCenter />
      </QueryClientProvider>,
    );
    expect(screen.queryByText(item.message)).toBeNull();
    auth.user.id = "one";
  });
});
