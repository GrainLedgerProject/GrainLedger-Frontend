import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/app/router/ProtectedRoute";
import { DEMO_USERS, useAuthStore } from "@/app/store/authStore";

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
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe("Phân quyền route", () => {
  it("chuyển người chưa đăng nhập đến sign-in và giữ returnUrl", async () => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
    renderAdminRoute("/admin/customers?tab=active");
    expect((await screen.findByTestId("login-location")).textContent).toBe(
      "/sign-in?returnUrl=%2Fadmin%2Fcustomers%3Ftab%3Dactive",
    );
  });

  it("không hiển thị nội dung quản trị cho Stock Viewer", () => {
    useAuthStore.setState({ user: DEMO_USERS.AUTHORIZED_STOCK_VIEWER, isAuthenticated: true });
    renderAdminRoute("/admin/customers");
    expect(screen.getByText("Không có quyền truy cập màn hình này")).toBeTruthy();
    expect(screen.queryByText("Nội dung quản trị")).toBeNull();
  });

  it("cho phép Mill Admin xem nội dung quản trị", () => {
    useAuthStore.setState({ user: DEMO_USERS.MILL_ADMIN, isAuthenticated: true });
    renderAdminRoute("/admin/customers");
    expect(screen.getByText("Nội dung quản trị")).toBeTruthy();
  });
});
