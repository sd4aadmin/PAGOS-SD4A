"use client";

import { useState, useEffect, useRef } from "react";

interface Deliverable {
  id: string;
  name: string;
  mime_type: string;
  size?: string;
  description?: string;
  created_at: string;
  can_download: boolean;
}

interface Props {
  projectId: string;
  role: string;
}

function fileIcon(mime: string) {
  if (mime.includes("pdf")) return "📄";
  if (mime.includes("image")) return "🖼️";
  if (mime.includes("zip")) return "🗜️";
  if (mime.includes("sheet")) return "📊";
  if (mime.includes("word")) return "📝";
  if (mime.includes("revit") || mime.includes("ifc")) return "🏗️";
  return "📦";
}

function formatSize(bytes?: string) {
  if (!bytes || bytes === "") return "—";
  const n = parseInt(bytes);
  if (isNaN(n)) return "—";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DeliverablesSection({ projectId, role }: Props) {
  const [data, setData] = useState<{ deliverables: Deliverable[]; has_payment: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const canManage = role === "ADMIN" || role === "ENGINEER";

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proxy/deliverables/project/${projectId}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("description", description);
      const res = await fetch(`/api/proxy/deliverables/project/${projectId}`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(typeof err.detail === "string" ? err.detail : "Error al subir entregable");
      } else {
        setDescription("");
        setShowUpload(false);
        await load();
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este entregable?")) return;
    await fetch(`/api/proxy/deliverables/${id}`, { method: "DELETE" });
    await load();
  };

  const handleDownload = (id: string) => {
    window.open(`/api/proxy/deliverables/${id}/download`, "_blank");
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Entregables</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Archivos finales para descarga del cliente</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-sd4a-dark text-white hover:bg-[#075e69] transition-colors"
          >
            + Subir entregable
          </button>
        )}
      </div>

      {/* Upload form */}
      {showUpload && canManage && (
        <div className="mb-4 p-4 rounded-lg border border-border bg-muted/50 space-y-3">
          <input
            type="text"
            placeholder="Descripción del entregable (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sd4a-mid/50"
          />
          <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-2 border-dashed transition-colors ${
            uploading ? "opacity-50" : "border-sd4a-dark text-sd4a-dark hover:bg-sd4a-dark hover:text-white"
          }`}>
            {uploading ? "Subiendo..." : "📎 Seleccionar archivo"}
            <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      )}

      {/* Payment warning for clients */}
      {!loading && data && role === "CLIENT" && !data.has_payment && data.deliverables.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
          <span>🔒</span>
          <p className="text-sm text-amber-700">Debes realizar el pago total para descargar los archivos.</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Cargando entregables...</div>
      ) : !data || data.deliverables.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">No hay entregables disponibles</div>
      ) : (
        <div className="space-y-2">
          {data.deliverables.map((d) => (
            <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl">{fileIcon(d.mime_type)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                  {d.description && (
                    <p className="text-xs text-muted-foreground truncate">{d.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatSize(d.size)} · {new Date(d.created_at).toLocaleDateString("es-CO")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                {d.can_download ? (
                  <button
                    onClick={() => handleDownload(d.id)}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-sd4a-dark text-white hover:bg-[#075e69] font-medium"
                  >
                    ↓ Descargar
                  </button>
                ) : (
                  <span className="text-xs px-3 py-1.5 rounded-lg bg-muted text-muted-foreground">
                    🔒 Bloqueado
                  </span>
                )}
                {canManage && (
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="text-xs px-3 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
