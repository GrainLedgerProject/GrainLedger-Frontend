import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ledgerEndpoints, type CorrectionOperation } from "@/api/ledger";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";

export function CorrectionEvidence({ original, value, onChange }: { original: Pick<CorrectionOperation, "ownerId" | "facilityId">; value: string; onChange: (value: string) => void }) {
  const text = useWorkflowText();
  const [file, setFile] = useState<File | null>(null);
  const stored = useRef<{ file: File; id: string } | null>(null);
  const upload = useMutation({ mutationFn: async () => {
    if (!file) throw new Error(text("Chọn tệp chứng cứ.", "Choose an evidence file."));
    if (stored.current?.file !== file) stored.current = { file, id: crypto.randomUUID() };
    const id = stored.current.id;
    const contentBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(text("Không đọc được tệp.", "Could not read file.")));
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.readAsDataURL(file);
    });
    await ledgerEndpoints.uploadEvidence({ id, ownerId: original.ownerId, facilityId: original.facilityId, fileName: file.name, contentType: file.type || "application/octet-stream", contentBase64 });
    return id;
  } });
  return <fieldset className="space-y-2"><legend>{text("Chứng cứ bất biến", "Immutable evidence")}</legend>
    <label>{text("Tệp biên bản / phiếu cân", "Review document / weighing record")}<input type="file" disabled={upload.isPending} onChange={e => { setFile(e.target.files?.[0] ?? null); onChange(""); upload.reset(); }}/></label>
    <button type="button" disabled={!file || upload.isPending || Boolean(value)} onClick={() => upload.mutate(undefined, { onSuccess: onChange })}>{text("Tải chứng cứ lên", "Upload evidence")}</button>
    <Feedback error={upload.error} pending={upload.isPending}/>
    {value && <><p role="status">{text("Đã lưu chứng cứ", "Evidence stored")} · {file?.name}</p><CorrectionEvidenceDownload id={value} fileName={file?.name}/></>}
  </fieldset>;
}

export function CorrectionEvidenceDownload({ id, fileName }: { id: string; fileName?: string }) {
  const text = useWorkflowText();
  const download = useMutation({ mutationFn: async () => {
    const blob = await ledgerEndpoints.getEvidence(id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = fileName || `evidence-${id}`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } });
  return <div><button type="button" disabled={download.isPending} onClick={() => download.mutate()}>{text("Tải chứng cứ đã lưu", "Download stored evidence")}</button><Feedback error={download.error}/></div>;
}
