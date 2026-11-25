import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import "@/app/i18n";
import { AppSidebar } from "@/app/layout/AppSidebar";
import { ProtectedRoute } from "@/app/router/ProtectedRoute";
import { useAuthStore, type UserProfile } from "@/app/store/authStore";
import { isPendingUserAccess, toUserProfile } from "@/features/auth/api/sessionUser";

const TEST_USERS: Record<"AUTHORIZED_STOCK_VIEWER" | "MILL_ADMIN", UserProfile> = {
  AUTHORIZED_STOCK_VIEWER: {
    id: "user-sv-1",
    email: "viewer@grainledger.vn",
    displayName: "Người xem tồn kho",
    role: "AUTHORIZED_STOCK_VIEWER",
    isActive: true,
    permissions: [],
  },
  MILL_ADMIN: {
    id: "user-ma-1",
    email: "admin@grainledger.vn",
    displayName: "Quản trị nhà máy",
    role: "MILL_ADMIN",
    isActive: true,
    permissions: ["*"],
  },
};

const TEST_ACCESS_TOKEN = "mock-test-jwt.payload.signature";

function SignInLocation() {
  const location = useLocation();
  return <div data-testid="login-location">{location.pathname + location.search}</div>;
}

function renderAdminRoute(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/sign-in" element={<SignInLocation />} />
        <Route path="/admin/customers" element={
          <ProtectedRoute allowedRoles={["MILL_ADMIN"]}>
            <div>Nội dung quản trị</div>
          </ProtectedRoute>
        } />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false });
});

describe("Phân quyền route", () => {
  it("chuyển người chưa đăng nhập đến sign-in và giữ returnUrl", async () => {
    useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false });
    renderAdminRoute("/admin/customers?tab=active");
    expect((await screen.findByTestId("login-location")).textContent).toBe(
      "/sign-in?returnUrl=%2Fadmin%2Fcustomers%3Ftab%3Dactive",
    );
  });

  it("không hiển thị nội dung quản trị cho Stock Viewer", () => {
    useAuthStore.setState({
      user: TEST_USERS.AUTHORIZED_STOCK_VIEWER,
      accessToken: TEST_ACCESS_TOKEN,
      isAuthenticated: true,
    });
    renderAdminRoute("/admin/customers");
    expect(screen.getByText("Không có quyền truy cập màn hình này")).toBeTruthy();
    expect(screen.queryByText("Nội dung quản trị")).toBeNull();
  });

  it("cho phép Mill Admin xem nội dung quản trị", () => {
    useAuthStore.setState({
      user: TEST_USERS.MILL_ADMIN,
      accessToken: TEST_ACCESS_TOKEN,
      isAuthenticated: true,
    });
    renderAdminRoute("/admin/customers");
    expect(screen.getByText("Nội dung quản trị")).toBeTruthy();
  });

  it("hiển thị trạng thái chờ phân quyền và khóa route nghiệp vụ với user role = null", () => {
    const pendingProfile = toUserProfile({
      id: "user-pending",
      email: "pending@grainledger.vn",
      displayName: "Người dùng mới",
      phoneNumber: null,
      role: null,
      organizationId: null,
      organizationName: null,
      isActive: false,
      permissions: [],
    });
    expect(pendingProfile.hasAssignedRole).toBe(false);
    expect(isPendingUserAccess(pendingProfile)).toBe(true);

    useAuthStore.setState({
      user: pendingProfile,
      accessToken: TEST_ACCESS_TOKEN,
      isAuthenticated: true,
    });
    renderAdminRoute("/admin/customers");
    expect(
      screen.getByText("Tài khoản đang chờ quản trị viên cấp quyền"),
    ).toBeTruthy();
    expect(screen.queryByText("Nội dung quản trị")).toBeNull();
    cleanup();

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/home"]}>
          <AppSidebar />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText("Chờ phân quyền")).toBeTruthy();
    expect(screen.getAllByRole("link").map((el) => el.getAttribute("href"))).toEqual([
      "/home",
      "/home",
      "/settings/profile",
    ]);
  });
});
