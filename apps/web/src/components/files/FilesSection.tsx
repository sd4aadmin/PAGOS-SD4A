"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Upload, X, FileText, Image, Archive, FileSpreadsheet, FileType, FolderOpen, Download, Trash2, Loader2, Tag, AlignLeft, Calendar, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectFile {
  id: string;
  drive_file_id: string;
  filename: string;
  category: string;
  mime_type: string;
  size_bytes: number;
  version: number;
  version_label: string | null;
  description: string | null;
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
  { value: "01_MEMORIAS",   label: "Memorias",    icon: "📋" },
  { value: "02_PLANOS",     label: "Planos",       icon: "📐" },
  { value: "03_FOTOGRAFIAS",label: "Fotografías",  icon: "🖼️" },
  { value: "04_MODELOS_BIM",label: "Modelos",      icon: "🏗️" },
  { value: "05_RESPALDOS",  label: "Respaldos",    icon: "💾" },
];

function fileIcon(mime: string) {
  if (mime.includes("pdf")) return <FileText className="w-5 h-5 text-red-400" />;
  if (mime.includes("image")) return <Image className="w-5 h-5 text-blue-400" />;
  if (mime.includes("zip")) return <Archive className="w-5 h-5 text-yellow-500" />;
  if (mime.includes("sheet") || mime.includes("excel")) return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
  if (mime.includes("revit") || mime.includes("ifc")) return <FolderOpen className="w-5 h-5 text-purple-400" />;
  return <FileType className="w-5 h-5 text-muted-foreground" />;
}

function formatSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function isPreviewable(mime: string) {
  return mime.startsWith("image/") || mime.includes("pdf");
}

export default function FilesSection({ projectId, canUpload, role }: Props) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showUpload, setShowUpload] = useState(false);
  const [preview, setPreview] = useState<ProjectFile | null>(null);

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
    const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const fileCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = files.filter(f => f.category === cat.value).length;
    return acc;
  }, {} as Record<string, number>);

  const canDownloadAny = files.some(f => f.can_download);
  const isBlocked = files.length > 0 && !canDownloadAny;

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">Archivos del proyecto</h3>
          {isBlocked && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
              🔒 Paga el saldo pendiente para descargar archivos
            </p>
          )}
        </div>
        {canUpload && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, #0A7881, #68B2B7)" }}
          >
            <Upload className="w-4 h-4" />
            Subir archivo
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setActiveCategory("all")}
          className={cn(
            "text-xs px-3 py-1.5 rounded-full border transition-colors",
            activeCategory === "all"
              ? "text-white border-transparent"
              : "border-border text-muted-foreground hover:bg-muted"
          )}
          style={activeCategory === "all" ? { background: "linear-gradient(135deg, #0A7881, #68B2B7)" } : {}}
        >
          Todos ({files.length})
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setActiveCategory(c.value)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition-colors",
              activeCategory === c.value
                ? "text-white border-transparent"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
            style={activeCategory === c.value ? { background: "linear-gradient(135deg, #0A7881, #68B2B7)" } : {}}
          >
            {c.icon} {c.label}
            {fileCounts[c.value] > 0 && <span className="ml-1 opacity-80">({fileCounts[c.value]})</span>}
          </button>
        ))}
      </div>

      {/* File list */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando archivos...
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm gap-2">
          <FolderOpen className="w-10 h-10 opacity-20" />
          No hay archivos {activeCategory !== "all" ? "en esta carpeta" : "en este proyecto"}
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((f) => {
            const catInfo = CATEGORIES.find(c => c.value === f.category);
            return (
              <div key={f.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-border hover:bg-muted/40 transition-colors">
                {/* Icon */}
                <div className="mt-0.5 shrink-0">{fileIcon(f.mime_type)}</div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{f.filename}</p>
                    {f.version_label && (
                      <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                        <Tag className="w-2.5 h-2.5" />{f.version_label}
                      </span>
                    )}
                    {f.version > 1 && !f.version_label && (
                      <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                        Rev. {f.version}
                      </span>
                    )}
                    {f.is_deliverable && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                        Entregable
                      </span>
                    )}
                  </div>
                  {f.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-start gap-1">
                      <AlignLeft className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{f.description}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(f.created_at)}
                    </span>
                    <span>{catInfo ? `${catInfo.icon} ${catInfo.label}` : f.category}</span>
                    <span>{formatSize(f.size_bytes)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isPreviewable(f.mime_type) && (
                    <button
                      onClick={() => setPreview(f)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title={f.can_download ? "Previsualizar" : "Vista previa parcial"}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  {f.can_download ? (
                    <button
                      onClick={() => handleDownload(f.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Descargar"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="p-2 text-amber-400" title="Pago pendiente">🔒</span>
                  )}
                  {canUpload && (
                    <button
                      onClick={() => handleDelete(f.id)}
                      disabled={deletingId === f.id}
                      className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                      title="Eliminar"
                    >
                      {deletingId === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          projectId={projectId}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); load(); }}
        />
      )}

      {/* Preview modal */}
      {preview && (
        <PreviewModal
          file={preview}
          canDownload={preview.can_download}
          onClose={() => setPreview(null)}
          onDownload={() => handleDownload(preview.id)}
        />
      )}
    </div>
  );
}

// ─── PREVIEW MODAL ────────────────────────────────────────────────────────────

function PreviewModal({ file, canDownload, onClose, onDownload }: {
  file: ProjectFile; canDownload: boolean; onClose: () => void; onDownload: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limited, setLimited] = useState(false);
  const [mime, setMime] = useState(file.mime_type);

  useEffect(() => {
    let objectUrl: string | null = null;
    (async () => {
      try {
        const res = await fetch(`/api/proxy/files/preview/${file.id}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(typeof err.detail === "string" ? err.detail : "No se pudo cargar la previsualización");
          return;
        }
        setLimited(res.headers.get("X-Preview-Limited") === "1");
        const serverMime = res.headers.get("Content-Type") || file.mime_type;
        setMime(serverMime);
        const blob = await res.blob();
        const typed = new Blob([blob], { type: serverMime });
        objectUrl = URL.createObjectURL(typed);
        setUrl(objectUrl);
      } catch {
        setError("Error de red al cargar la previsualización");
      }
    })();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.id, file.mime_type]);

  const isImage = mime.startsWith("image/");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {fileIcon(file.mime_type)}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{file.filename}</p>
              <p className="text-xs text-muted-foreground">{formatSize(file.size_bytes)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {canDownload && (
              <button
                onClick={onDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg,#0A7881,#68B2B7)" }}
              >
                <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Descargar</span>
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Aviso de vista parcial */}
        {limited && (
          <div className="px-4 sm:px-5 py-2.5 border-b border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 shrink-0">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              🔒 Vista previa parcial — paga el saldo pendiente para ver el documento completo y descargarlo.
            </p>
          </div>
        )}

        {/* Contenido */}
        <div className="flex-1 min-h-0 bg-muted/30 flex items-center justify-center overflow-auto">
          {error ? (
            <p className="text-sm text-muted-foreground p-10 text-center">{error}</p>
          ) : !url ? (
            <div className="flex items-center gap-2 text-muted-foreground py-20 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" /> Cargando previsualización…
            </div>
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={file.filename} className="max-w-full max-h-[75vh] object-contain p-2" />
          ) : (
            <iframe src={url} title={file.filename} className="w-full h-[75vh] border-0" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── UPLOAD MODAL ─────────────────────────────────────────────────────────────

function UploadModal({ projectId, onClose, onUploaded }: {
  projectId: string; onClose: () => void; onUploaded: () => void;
}) {
  const { data: session } = useSession();
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [description, setDescription] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [isDeliverable, setIsDeliverable] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File) { setFile(f); setError(null); }

  async function upload() {
    if (!file || !session?.accessToken) return;
    setError(null);
    setUploading(true);
    setUploadProgress(0);
    try {
      const form = new FormData();
      form.append("file", file);
      const params = new URLSearchParams({
        category,
        is_deliverable: String(isDeliverable),
        ...(description.trim() && { description: description.trim() }),
        ...(versionLabel.trim() && { version_label: versionLabel.trim() }),
      });

      // Upload directly to Railway API to bypass Vercel's 4.5 MB proxy limit
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${apiUrl}/api/v1/files/project/${projectId}?${params}`);
        xhr.setRequestHeader("Authorization", `Bearer ${session.accessToken}`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(typeof err.detail === "string" ? err.detail : "Error al subir el archivo"));
            } catch {
              reject(new Error(`Error ${xhr.status} al subir el archivo`));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Error de red al subir el archivo"));
        xhr.send(form);
      });

      onUploaded();
    } catch (e: any) {
      setError(e.message ?? "Error al subir el archivo");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Subir archivo</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Carpeta */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <FolderOpen className="w-4 h-4 inline mr-1.5 opacity-70" />
              Carpeta de destino
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-3 rounded-xl border text-xs font-medium transition-colors",
                    category === c.value
                      ? "border-transparent text-white"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                  style={category === c.value ? { background: "linear-gradient(135deg, #0A7881, #68B2B7)" } : {}}
                >
                  <span className="text-xl">{c.icon}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Versión */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              <Tag className="w-4 h-4 inline mr-1.5 opacity-70" />
              Versión <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <input
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              placeholder="ej: v1.0, Rev A, Final, Corregido..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-sd4a-mid/50"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              <AlignLeft className="w-4 h-4 inline mr-1.5 opacity-70" />
              Descripción <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Describe brevemente el contenido o los cambios de esta versión..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-sd4a-mid/50 resize-none"
            />
          </div>

          {/* Entregable */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isDeliverable}
              onChange={(e) => setIsDeliverable(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-foreground">Marcar como entregable al cliente</span>
          </label>

          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f); }}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
              dragOver ? "border-sd4a-mid bg-sd4a-mid/10" : "border-border hover:border-sd4a-mid/50 hover:bg-muted/50"
            )}
          >
            {file ? (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2 text-foreground font-medium text-sm">
                  <FileText className="w-5 h-5 text-sd4a-mid" />
                  {file.name}
                </div>
                <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                <p className="text-xs text-sd4a-mid">Clic para cambiar archivo</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  Arrastra el archivo aquí o <span className="text-sd4a-mid font-medium">selecciona uno</span>
                </p>
                <p className="text-xs text-muted-foreground">PDF, DWG, DXF, XLSX, PNG, JPG, ZIP, RVT — máx. 100 MB</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.dwg,.dxf,.docx,.xlsx,.pptx,.zip,.jpg,.jpeg,.png,.rvt,.ifc"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button
              onClick={upload}
              disabled={uploading || !file}
              className="flex-1 py-2.5 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #0A7881, #68B2B7)" }}
            >
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> {uploadProgress > 0 ? `${uploadProgress}%` : "Subiendo..."}</> : <><Upload className="w-4 h-4" /> Subir archivo</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
