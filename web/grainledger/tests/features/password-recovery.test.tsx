import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { authEndpoints } from "@/api/auth";
import i18n from "@/app/i18n";
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage";

afterEach(cleanup);

it("uses the accepted recovery request to complete the reset by OTP", async () => {
  await i18n.changeLanguage("en");
  const request = vi.spyOn(authEndpoints, "forgotPassword").mockResolvedValue(undefined);
  const reset = vi.spyOn(authEndpoints, "resetPassword").mockResolvedValue(undefined);
  render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
  fireEvent.change(screen.getByRole("textbox", { name: /email/i }), { target: { value: "test@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: "Send Verification Code" }));
  const code = await screen.findByLabelText("Six-digit verification code");
  expect(request).toHaveBeenCalledWith({ email: "test@example.test" });
  fireEvent.change(code, { target: { value: "012345" } });
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: "Example-test-2026!" } });
  fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
  expect(await screen.findByText("Your password was reset. Sign in with your new password.")).toBeTruthy();
  expect(reset).toHaveBeenCalledWith({ email: "test@example.test", otp: "012345", newPassword: "Example-test-2026!" });
});
