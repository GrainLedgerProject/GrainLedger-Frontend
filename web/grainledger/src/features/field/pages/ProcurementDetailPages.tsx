import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { procurementEndpoints } from "@/api/procurement";
import { useAuthStore } from "@/app/store/authStore";
import { labResultPath } from "@/features/compliance/paths";
import { millPaths } from "@/features/mill/paths";
import { Feedback, Panel, Workflow } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { fieldPaths, receiptPath, sourceLotPath } from "../paths";

const stockLot = (id: string) => millPaths.lot.replace(":lotId", encodeURIComponent(id));

export function ProcurementDetailPage() {
  const text = useWorkflowText();
  const { receiptId } = useParams();
  const query = useQuery({ queryKey: ["procurement-detail", receiptId], queryFn: () => procurementEndpoints.getProcurement(receiptId!), enabled: Boolean(receiptId) });
  const record = query.data;
  return <Workflow title={record?.code ?? text("Chi tiết phiếu thu mua", "Procurement receipt")} actions={<Link to={fieldPaths.receipts}>{text("Danh sách phiếu", "Receipts")}</Link>}>
    <Feedback error={query.error} pending={query.isPending} />
    {record && <Panel title={text("Thông tin thu mua", "Procurement details")}>
      <p>{record.farmerName ?? record.farmerCode ?? record.farmerId} · {new Date(record.receivedAt).toLocaleString()} · {record.status}</p>
      <p>{text("Tổng khối lượng thu mua", "Total net mass")} · {record.totalNetMassKg} kg</p>
      <div className="overflow-x-auto"><table>
        <thead><tr><th scope="col">{text("Dòng và lô nguồn", "Line and source lot")}</th>
          <th scope="col">{text("Thửa và mùa vụ", "Plot and season")}</th>
          <th scope="col">{text("Khối lượng tịnh (kg)", "Net mass (kg)")}</th>
          <th scope="col">{text("Độ ẩm (%)", "Moisture (%)")}</th></tr></thead>
        <tbody>{record.items.map(line => <tr key={line.id}>
          <th scope="row">{line.lineNo} · <Link to={sourceLotPath(line.sourceLotId)}>{line.lotCode}</Link></th>
          <td>{line.plotCode ?? line.plotId} · {line.seasonName ?? line.seasonId} · {line.riceVariety}</td>
          <td>{line.netMassKg}</td><td>{line.moisturePercent}</td>
        </tr>)}</tbody>
      </table></div>
    </Panel>}
  </Workflow>;
}

export function SourceLotDetailPage() {
  const text = useWorkflowText();
  const { sourceLotId } = useParams();
  const canCapture = useAuthStore(s => s.user?.permissions.includes("purchases.write"));
  const canReadLab = useAuthStore(s => s.user?.permissions.some(p => p === "lab.read" || p === "lab.write"));
  const query = useQuery({ queryKey: ["procurement-source-lot", sourceLotId], queryFn: () => procurementEndpoints.getSourceLot(sourceLotId!), enabled: Boolean(sourceLotId) });
  const record = query.data;
  const samplePage = `${fieldPaths.samples}?sourceLotId=${encodeURIComponent(sourceLotId ?? "")}`;
  return <Workflow title={record?.lotCode ?? text("Chi tiết lô nguồn", "Source lot details")} actions={<Link to={record ? receiptPath(record.procurementId) : fieldPaths.receipts}>{record?.procurementCode ?? text("Phiếu thu mua", "Procurement receipts")}</Link>}>
    <Feedback error={query.error} pending={query.isPending} />
    {record && <>
      <Panel title={text("Nguồn gốc", "Provenance")}>
        <p>{[record.farmerName, record.plotCode, record.seasonName, record.riceVariety].filter(Boolean).join(" · ")}</p>
        <p>{text("Khối lượng lúc thu mua", "Procurement net mass")} · {record.initialNetMassKg} kg · {text("Độ ẩm", "Moisture")} {record.moisturePercent}%</p>
        <p>{text("Tiếp nhận", "Receiving")} · {record.receivingStatus} · {text("Khả dụng", "Usable stock")} {record.usableStockKg} kg</p>
        <Link to={`${fieldPaths.declarations}?plotSeasonId=${encodeURIComponent(record.plotSeasonId)}`}>{text("Lịch sử phun thuốc", "Pesticide history")}</Link>
      </Panel>
      <Panel title={text("Vị trí tồn kho và dòng dõi", "Stock positions and lineage")}>
        {!record.currentStock.length && <p>{text("Chưa có vị trí tồn kho.", "No stock positions.")}</p>}
        <ul>{record.currentStock.map(row => <li key={`${row.currentStockLotId}:${row.locationId}`}>
          <Link to={stockLot(row.currentStockLotId)}>{row.currentStockLotCode}</Link> · {row.onHandKg} kg · {row.availableKg} kg {text("khả dụng", "available")}
        </li>)}</ul>
        {record.lineage.length > 0 && <ul>{record.lineage.map((row, index) => <li key={`${row.lotId}:${index}`}>
          <Link to={stockLot(row.lotId)}>{row.lotCode}</Link> · {row.quantityKg} kg
        </li>)}</ul>}
      </Panel>
      <Panel title={text("Mẫu và kết quả xét nghiệm", "Samples and laboratory results")}>
        <p><Link to={samplePage}>{text("Mở danh sách mẫu", "Open samples")} ({record.sampleIds.length})</Link></p>
        {canCapture && <Link to={`${samplePage}&create=1`}>{text("Lấy mẫu từ lô này", "Collect sample from this lot")}</Link>}
        {canReadLab && <ul>{record.confirmedLabReportIds.map(id => <li key={id}><Link to={labResultPath(id)}>{id}</Link></li>)}</ul>}
      </Panel>
    </>}
  </Workflow>;
}
