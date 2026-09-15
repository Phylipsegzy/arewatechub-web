"use client";

import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { api, ApiError } from "@/lib/api";

export function PdfActions({ downloadPath, filename }: { downloadPath: string; filename: string }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      await api.download(downloadPath, filename);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not download the PDF");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex items-center gap-4 print:hidden">
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="flex items-center gap-1.5 text-sm text-brand-primary font-medium disabled:opacity-60"
      >
        <Download size={16} />
        {downloading ? "Preparing…" : "Download PDF"}
      </button>
      {/* Print only makes sense on a device with a printer attached to it —
          hidden on small screens (phones/tablets) rather than shown
          everywhere and confusing mobile visitors. */}
      <button
        onClick={() => window.print()}
        className="hidden md:flex items-center gap-1.5 text-sm text-brand-muted font-medium hover:text-brand-dark"
      >
        <Printer size={16} />
        Print
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
