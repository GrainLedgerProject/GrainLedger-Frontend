import { FacilityOverview } from "../components/FacilityOverview";
import { FacilityList } from "../components/FacilityList";
import { FacilityEditor } from "../components/FacilityEditor";
import { LocationClearanceDialog } from "../components/LocationClearanceDialog";
import { useFacilityConfig } from "../hooks/useFacilityConfig";

export function FacilityConfigPage() {
  const config = useFacilityConfig();
  return (
    <div className="space-y-6">
      <FacilityOverview {...config.overview} />
      <FacilityList {...config.facilities} />
      <FacilityEditor {...config.editor} />
      <LocationClearanceDialog {...config.clearance} />
    </div>
  );
}
