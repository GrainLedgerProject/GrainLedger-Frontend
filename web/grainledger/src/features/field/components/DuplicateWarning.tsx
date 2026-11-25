import { useEffect, useState } from "react";
import { procurementEndpoints, type FarmerDuplicateRequest, type PlotDuplicateRequest } from "@/api/procurement";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";

export function DuplicateWarning({ request }: { request: FarmerDuplicateRequest | PlotDuplicateRequest | null }) {
  const text = useWorkflowText();
  const payload = request ? JSON.stringify(request) : "";
  const [result, setResult] = useState<{
    payload: string;
    data?: Awaited<ReturnType<typeof procurementEndpoints.checkFarmerDuplicate> | ReturnType<typeof procurementEndpoints.checkPlotDuplicate>>;
  } | null>(null);
  useEffect(() => {
    if (!payload) return;
    let active = true;
    const timer = window.setTimeout(() => {
      const fields = JSON.parse(payload) as FarmerDuplicateRequest | PlotDuplicateRequest;
      const check = "geometry" in fields ? procurementEndpoints.checkPlotDuplicate(fields) : procurementEndpoints.checkFarmerDuplicate(fields);
      void check.then(data => { if (active) setResult({ payload, data }); })
        .catch(() => { if (active) setResult({ payload }); });
    }, 400);
    return () => { active = false; window.clearTimeout(timer); };
  }, [payload]);

  if (!payload) return null;
  if (result?.payload !== payload) return <p role="status">{text("Đang kiểm tra trùng…", "Checking for duplicates…")}</p>;
  if (!result.data) return <p role="status">{text("Chưa kiểm tra được bản ghi trùng.", "Duplicate check is unavailable.")}</p>;
  if (!result.data.items?.length) return null;
  return <div role="status" className="space-y-1 rounded-lg border border-accent-warning/30 p-3">
    <p className="font-semibold">{text("Có bản ghi tương tự. Kiểm tra trước khi lưu.", "Possible duplicates found. Review before saving.")}</p>
    <ul className="list-disc ps-5">{result.data.items.map(row => <li key={row.id}>
      {row.code} · {"name" in row ? row.name : `${row.distanceMeters.toFixed(1)} m`}
    </li>)}</ul>
    {result.data.hasMore && <p>{text("Còn các kết quả tương tự khác.", "Additional matches exist.")}</p>}
  </div>;
}
