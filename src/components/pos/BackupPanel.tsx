import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type BackupPanelProps = {
  persistSession: boolean;
  onExport: () => Promise<string | null>;
  onImport: (json: string) => Promise<boolean | "imported" | "imported-unusable">;
};

type Status = "idle" | "exported" | "imported" | "imported-unusable" | "failed";

export function BackupPanel({ persistSession, onExport, onImport }: BackupPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingJson, setPendingJson] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  const exportBackup = async () => {
    try {
      const json = await onExport();
      if (!json) {
        setStatus("failed");
        return;
      }
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "small-pos-backup.json";
      link.click();
      URL.revokeObjectURL(url);
      setStatus("exported");
    } catch {
      setStatus("failed");
    }
  };

  const pickFile = () => fileRef.current?.click();

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      setPendingJson(text);
    } catch {
      setStatus("failed");
    }
  };

  const confirmImport = async () => {
    if (pendingJson === null) return;
    const json = pendingJson;
    setPendingJson(null);
    try {
      const ok = await onImport(json);
      if (ok === "imported" || ok === true) setStatus("imported");
      else if (ok === "imported-unusable") setStatus("imported-unusable");
      else setStatus("failed");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold text-foreground">Sao lưu dữ liệu</h2>
        <p className="text-xs text-muted-foreground">Tải hoặc thay thế bản sao lưu local. Không hiện mã PIN.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={!persistSession} onClick={() => void exportBackup()}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Tải sao lưu
        </Button>
        <Button type="button" variant="outline" disabled={!persistSession} onClick={pickFile}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          Nhập sao lưu
        </Button>
        <input ref={fileRef} type="file" accept="application/json" className="sr-only" onChange={(event) => void onFile(event)} />
      </div>
      {status === "exported" ? <p role="status" aria-label="Đã tải sao lưu">Đã tải sao lưu</p> : null}
      {status === "imported" ? <p role="status" aria-label="Đã nhập sao lưu">Đã nhập sao lưu</p> : null}
      {status === "imported-unusable" ? <p role="status" aria-label="Đã nhập sao lưu nhưng không dùng được">Đã nhập sao lưu nhưng không dùng được</p> : null}
      {status === "failed" ? <p role="status" aria-label="Không thể sao lưu">Không thể sao lưu</p> : null}

      {pendingJson !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div role="dialog" aria-modal="true" aria-label="Xác nhận nhập sao lưu" className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-foreground">Xác nhận nhập sao lưu</h3>
            <p className="mb-4 text-sm text-muted-foreground">Thao tác này xóa toàn bộ dữ liệu local rồi thay bằng bản sao lưu.</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setPendingJson(null)}>Hủy</Button>
              <Button type="button" variant="destructive" onClick={() => void confirmImport()}>Nhập và thay thế dữ liệu</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
