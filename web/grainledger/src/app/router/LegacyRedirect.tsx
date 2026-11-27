import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuthStore } from "@/app/store/authStore";
import { adminPaths } from "@/features/admin/paths";
import { compliancePaths, labResultPath } from "@/features/compliance/paths";
import { fieldPaths, receiptPath, sourceLotPath } from "@/features/field/paths";
import { millPaths } from "@/features/mill/paths";

export function LegacyRedirect({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

export function LegacyLabReportRedirect() {
  const { id = "" } = useParams();
  const { search } = useLocation();
  return <Navigate to={`${labResultPath(id)}${search}`} replace />;
}

export function LegacyParamRedirect({ build }: { build: (id: string) => string }) {
  const { id = "" } = useParams();
  const { search } = useLocation();
  const target = build(id);
  if (!search) return <Navigate to={target} replace />;
  const joiner = target.includes("?") ? "&" : "?";
  return <Navigate to={`${target}${joiner}${search.replace(/^\?/, "")}`} replace />;
}

export function LegacyFarmerRedirect() {
  const { id = "" } = useParams();
  const { search } = useLocation();
  const target =
    id && id !== "new"
      ? `${fieldPaths.farmers}?farmerId=${encodeURIComponent(id)}`
      : fieldPaths.farmers;
  if (!search) return <Navigate to={target} replace />;
  const joiner = target.includes("?") ? "&" : "?";
  return <Navigate to={`${target}${joiner}${search.replace(/^\?/, "")}`} replace />;
}

export function LegacySampleRedirect() {
  const { id = "" } = useParams();
  const { search } = useLocation();
  const role = useAuthStore((state) => state.user?.role);
  const base = role === "CUSTOMER_PROCUREMENT_OFFICER" ? fieldPaths.samples : compliancePaths.samples;
  const target = id ? `${base}?sampleId=${encodeURIComponent(id)}` : base;
  if (!search) return <Navigate to={target} replace />;
  const joiner = target.includes("?") ? "&" : "?";
  return <Navigate to={`${target}${joiner}${search.replace(/^\?/, "")}`} replace />;
}

export function LegacyLotRedirect() {
  return <LegacyParamRedirect build={(id) => millPaths.lot.replace(":lotId", encodeURIComponent(id))} />;
}

export function LegacyProcurementRedirect() {
  return <LegacyParamRedirect build={(id) => receiptPath(id)} />;
}

export function LegacySourceLotRedirect() {
  return <LegacyParamRedirect build={(id) => sourceLotPath(id)} />;
}

export function LegacyPlotRedirect() {
  return <LegacyParamRedirect build={(id) => `${fieldPaths.plots}?plotId=${encodeURIComponent(id)}`} />;
}

export function LegacyPlotSeasonRedirect() {
  return <LegacyParamRedirect build={(id) => `${fieldPaths.seasons}?plotSeasonId=${encodeURIComponent(id)}`} />;
}

export function LegacySprayRedirect() {
  return <LegacyParamRedirect build={(id) => `${fieldPaths.declarations}?declarationId=${encodeURIComponent(id)}`} />;
}

export function LegacyAdminRedirect() {
  const { search } = useLocation();
  const user = useAuthStore((state) => state.user);
  const to =
    user?.role === "MILL_OPERATOR" || user?.role === "MILL_MANAGER"
      ? adminPaths.facilities
      : adminPaths.access;
  return <Navigate to={`${to}${search}`} replace />;
}
