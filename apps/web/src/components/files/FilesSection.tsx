"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  webViewLink?: string;
}

interface Props {
  projectId: string;
  canUpload: boolean;
}

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

function formatSize(bytes?: string) {
  if (!bytes) return "—";
  const n = parseInt(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesSection({ projectId, canUpload }: Props) {
  const { data: session } = useSession();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proxy/files/project/${projectId}`);
      if (res.ok) setFiles(await res.json());
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
      const res = await fetch(`/api/proxy/files/project/${projectId}`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        try {
          const err = await res.json();
          alert(typeof err.detail === "string" ? err.detail : "Error al subir archivo");
        } catch {
          alert("Error al subir archivo");
        }
      } else {
        await load();
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm("¿Eliminar este archivo?")) return;
    setDeletingId(fileId);
    try {
      await fetch(`/api/proxy/files/${fileId}?project_id=${projectId}`, { method: "DELETE" });
      await load();
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (fileId: string, name: string) => {
    window.open(`/api/proxy/files/download/${fileId}`, "_blank");
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Archivos del proyecto</h3>
        {canUpload && (
          <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            uploading ? "bg-muted text-muted-foreground" : "bg-[#102a6e] text-white hover:bg-[#1a3a8f]"
          }`}>
            {uploading ? (
              <><span className="animate-spin">⏳</span> Subiendo...</>
            ) : (
              <><span>↑</span> Subir archivo</>
            )}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
              accept=".pdf,.docx,.xlsx,.pptx,.zip,.jpg,.jpeg,.png,.rvt,.ifc"
            />
          </label>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Cargando archivos...</div>
      ) : files.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No hay archivos en este proyecto
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl">{fileIcon(f.mimeType)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(f.size)} · {new Date(f.createdTime).toLocaleDateString("es-CO")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                {f.webViewLink && (
                  <a
                    href={f.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1 rounded-lg border border-border text-muted-foreground hover:bg-muted"
                  >
                    Ver
                  </a>
                )}
                <button
                  onClick={() => handleDownload(f.id, f.name)}
                  className="text-xs px-3 py-1 rounded-lg bg-[#102a6e] text-white hover:bg-[#1a3a8f]"
                >
                  ↓
                </button>
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
