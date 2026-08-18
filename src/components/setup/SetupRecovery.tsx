import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type SetupRecoveryProps = {
  onImport: (json: string) => Promise<boolean>;
};

export function SetupRecovery({ onImport }: SetupRecoveryProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "failed">("idle");

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const ok = await onImport(text);
      if (!ok) setStatus("failed");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="mb-2 text-center text-xl font-bold text-card-foreground sm:text-2xl">
          Không thể đọc dữ liệu quán
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Dữ liệu local hỏng hoặc thiếu. Nhập bản sao lưu phiên bản 2. Tệp chứa hash PIN — không chia sẻ. Bản v1 không dùng được.
        </p>
        <Button type="button" className="h-11 w-full" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          Chọn tệp sao lưu
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          aria-label="Nhập sao lưu"
          className="sr-only"
          onChange={(event) => void onFile(event)}
        />
        {status === "failed" ? (
          <p role="alert" className="mt-4 text-center text-sm text-destructive">
            Không thể nhập sao lưu.
          </p>
        ) : null}
      </div>
    </main>
  );
}
