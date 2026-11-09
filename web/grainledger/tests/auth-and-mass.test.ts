import { describe, expect, it } from "vitest";
import {
  acceptInvitationSchema,
  changePasswordSchema,
  editProfileSchema,
  signInSchema,
} from "@/features/auth/model/authSchemas";
import { checkMassBalance, formatMass } from "@/shared/utils/decimalMass";
import { decodeJwtPayload, isJwtExpired } from "@/shared/utils/jwt";
import { normalizeUserRole } from "@/shared/types/roles";

describe("Xác thực dữ liệu tài khoản", () => {
  it("chặn email sai và mật khẩu đăng nhập dưới 8 ký tự", () => {
    expect(signInSchema.safeParse({ email: "sai", password: "12345678", rememberMe: true }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "a@b.vn", password: "1234567", rememberMe: true }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "a@b.vn", password: "12345678", rememberMe: false }).success).toBe(true);
  });

  it("chỉ nhận mật khẩu lời mời mạnh và xác nhận trùng khớp", () => {
    const password = "StrongPass123!";
    expect(acceptInvitationSchema.safeParse({ password, confirmPassword: password }).success).toBe(true);
    expect(acceptInvitationSchema.safeParse({ password: "weakpassword123", confirmPassword: "weakpassword123" }).success).toBe(false);
    expect(acceptInvitationSchema.safeParse({ password, confirmPassword: "StrongPass123?" }).success).toBe(false);
  });

  it("không cho đổi sang mật khẩu cũ hoặc xác nhận sai", () => {
    const currentPassword = "OldStrong123!";
    expect(changePasswordSchema.safeParse({ currentPassword, newPassword: currentPassword, confirmNewPassword: currentPassword }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword, newPassword: "NewStrong123!", confirmNewPassword: "Different123!" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword, newPassword: "NewStrong123!", confirmNewPassword: "NewStrong123!" }).success).toBe(true);
  });

  it("kiểm tra giới hạn tên và định dạng điện thoại", () => {
    expect(editProfileSchema.safeParse({ displayName: "A", language: "vi", phoneNumber: "0901234567" }).success).toBe(false);
    expect(editProfileSchema.safeParse({ displayName: "Nguyễn An", language: "vi", phoneNumber: "abc" }).success).toBe(false);
    expect(editProfileSchema.safeParse({ displayName: "Nguyễn An", language: "en", phoneNumber: "+84 901 234 567" }).success).toBe(true);
  });
});

describe("JWT và vai trò", () => {
  const token = (payload: object) => `header.${btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}.signature`;

  it("đọc payload JWT và từ chối token lỗi định dạng", () => {
    expect(decodeJwtPayload(token({ sub: "user-1", role: "MILL_ADMIN" }))).toMatchObject({ sub: "user-1", role: "MILL_ADMIN" });
    expect(decodeJwtPayload("invalid")).toBeNull();
  });

  it("coi token trong vùng đệm 15 giây là sắp hết hạn", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    expect(isJwtExpired(token({ exp: nowSeconds + 10 }))).toBe(true);
    expect(isJwtExpired(token({ exp: nowSeconds + 60 }))).toBe(false);
  });

  it("chuẩn hóa tên vai trò từ backend", () => {
    expect(normalizeUserRole("PurchasingStaff")).toBe("CUSTOMER_PROCUREMENT_OFFICER");
    expect(normalizeUserRole("MillManager")).toBe("MILL_MANAGER");
    expect(normalizeUserRole("StockViewer")).toBe("AUTHORIZED_STOCK_VIEWER");
  });
});

describe("Cân bằng khối lượng", () => {
  it("chấp nhận cân bằng chính xác và tại biên dung sai 0,5%", () => {
    expect(checkMassBalance("1000", "950", "50").isBalanced).toBe(true);
    const atBoundary = checkMassBalance("1000", "955", "50");
    expect(atBoundary.allowedKg.toString()).toBe("5");
    expect(atBoundary.varianceKg.toString()).toBe("5");
    expect(atBoundary.isBalanced).toBe(true);
  });

  it("từ chối sai lệch vượt dung sai mà không mắc lỗi số thực", () => {
    expect(checkMassBalance("1000", "955.001", "50").isBalanced).toBe(false);
    expect(checkMassBalance("0.3", "0.1", "0.2", 0).isBalanced).toBe(true);
  });

  it("định dạng khối lượng theo ngôn ngữ", () => {
    expect(formatMass("88000.5", 3, "vi")).toBe("88.000,500");
    expect(formatMass("88000.5", 3, "en")).toBe("88,000.500");
  });
});
