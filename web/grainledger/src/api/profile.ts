import type { SessionUserDto } from "./auth";
import { apiFetch } from "./client";

export const profileEndpoints = {
  getProfile: () => apiFetch<SessionUserDto>("/api/profile"),
  updateProfile: (req: UpdateProfileRequest) =>
    apiFetch<SessionUserDto>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(req),
    }),
};

export interface UpdateProfileRequest {
  displayName: string;
  phoneNumber: null | string;
}
