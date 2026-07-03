"use client";

import { useState, useEffect, useRef } from "react";

interface ProjectFile {
  id: string;
  drive_file_id: string;
  filename: string;
  category: string;
  mime_type: string;
  size_bytes: number;
  version: number;
  is_deliverable: boolean;
  uploaded_by: string;
  created_at: string;
  can_download: boolean;
}

interface Props {
  projectId: string;
  canUpload: boolean;
  role?: string;
}

const CATEGORIES = [
  { value: "01_MEMORIAS", label: "Memorias" },
  { value: "02_PLANOS", label: "Planos" },
  { value: "03_CALCULOS", label: "Cálculos" },
  { value: "04_LICENCIAS", label: "Licencias" },
  { value: "05_FOTOGRAFIAS", label: "Fotografías" },
  { value: "06_MODELOS_BIM", label: "Modelos BIM" },
  { value: "07_RESPALDOS", label: "Respaldos" },
];

function fileIcon(mime: string) {
  if (mime.includes("pdf")) return "📄";
  if (mime.includes("image")) return "🖼️";
  if (mime.includes("zip")) return "🗜️";
  if (mime.includes("sheet") || mime.includes("excel")) return "📊";
  if (mime.includes("word")) return "📝";
  if (mime.includes("presentation")) return "📑";
  if (mime.includes("revit") || mime.includes("ifc")) return "🏗️";
  return "📁";
}

function formatSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesSection({ projectId, canUpload, role }: Props) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [uploadCategory, setUploadCategory] = useState(CATEGORIES[0].value);
  const [isDeliverable, setIsDeliverable] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const url = activeCategory === "all"
        ? `/api/proxy/files/project/${projectId}`
        : `/api/proxy/files/project/${projectId}?category=${activeCategory}`;
      const res = await fetch(url);
      if (res.ok) setFiles(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId, activeCategory]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(
        `/api/proxy/files/project/${projectId}?category=${uploadCategory}&is_deliverable=${isDeliverable}`,
        { method: "POST", body: form }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(typeof err.detail === "string" ? err.detail : "Error al subir archivo");
      } else {
        await load();
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm("¿Eliminar este archivo? Esta acción no se puede deshacer.")) return;
    setDeletingId(fileId);
    try {
      await fetch(`/api/proxy/files/${fileId}`, { method: "DELETE" });
      await load();
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (fileId: string) => {
    const res = await fetch(`/api/proxy/files/download/${fileId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(typeof err.detail === "string" ? err.detail : "No puedes descargar este archivo");
      return;
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="(.+)"/);
    const name = match ? match[1] : "archivo";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = files.filter((f) => f.category === cat.value);
    return acc;
  }, {} as Record<string, ProjectFile[]>);

  const canDownloadAny = files.some((f) => f.can_download);
  const isBlocked = files.length > 0 && !canDownloadAny;

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-foreground">Archivos del proyecto</h3>
          {isBlocked && (
            <p className="text-xs text-amber-600 mt-1">
              🔒 Debes pagar el saldo pendiente para descargar archivos
            </p>
          )}
        </div>

        {canUpload && (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isDeliverable}
                onChange={(e) => setIsDeliverable(e.target.checked)}
                className="rounded"
              />
              Entregable
            </label>
            <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              uploading ? "bg-muted text-muted-foreground" : "bg-[#102a6e] text-white hover:bg-[#1a3a8f]"
            }`}>
              {uploading ? "Subiendo..." : "↑ Subir archivo"}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
                accept=".pdf,.docx,.xlsx,.pptx,.zip,.jpg,.jpeg,.png,.rvt,.ifc"
              />
            </label>
          </div>
        )}
      </div>

      {/* Filtro por categoría */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setActiveCategory("all")}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            activeCategory === "all"
              ? "bg-[#102a6e] text-white border-[#102a6e]"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          Todos
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setActiveCategory(c.value)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              activeCategory === c.value
                ? "bg-[#102a6e] text-white border-[#102a6e]"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {c.label}
            {grouped[c.value]?.length > 0 && (
              <span className="ml-1 opacity-70">({grouped[c.value].length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Cargando archivos...</div>
      ) : files.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No hay archivos {activeCategory !== "all" ? "en esta categoría" : "en este proyecto"}
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl">{fileIcon(f.mime_type)}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{f.filename}</p>
                    {f.version > 1 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                        V{f.version}
                      </span>
                    )}
                    {f.is_deliverable && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                        Entregable
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORIES.find((c) => c.value === f.category)?.label ?? f.category}
                    {" · "}{formatSize(f.size_bytes)}
                    {" · "}{new Date(f.created_at).toLocaleDateString("es-CO")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-3 shrink-0">
                {f.can_download ? (
                  <button
                    onClick={() => handleDownload(f.id)}
                    className="text-xs px-3 py-1 rounded-lg bg-[#102a6e] text-white hover:bg-[#1a3a8f]"
                    title="Descargar"
                  >
                    ↓
                  </button>
                ) : (
                  <span className="text-xs px-3 py-1 rounded-lg border border-amber-200 text-amber-500" title="Pago pendiente">
                    🔒
                  </span>
                )}
                {canUpload && (
                  <button
                    onClick={() => handleDelete(f.id)}
                    disabled={deletingId === f.id}
                    className="text-xs px-3 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40"
                  >
                    {deletingId === f.id ? "..." : "✕"}
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
