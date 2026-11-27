import { FacilityOverview } from "../components/FacilityOverview";
import { FacilityList } from "../components/FacilityList";
import { FacilityEditor } from "../components/FacilityEditor";
import { LocationClearanceDialog } from "../components/LocationClearanceDialog";
import { useFacilityConfig } from "../hooks/useFacilityConfig";
import { FacilityAssignments } from "../components/FacilityAssignments";
import { useAuthStore } from "@/app/store/authStore";

export function FacilityConfigPage() {
  const config = useFacilityConfig();
  const canConfigure = Boolean(
    useAuthStore((s) => s.user?.permissions.includes("platform.configure")),
  );
  return (
    <div className="space-y-6">
      <FacilityOverview {...config.overview} />
      <FacilityList {...config.facilities} />
      {canConfigure && <FacilityAssignments />}
      {canConfigure && <FacilityEditor {...config.editor} />}
      {canConfigure && <LocationClearanceDialog {...config.clearance} />}
    </div>
  );
}
