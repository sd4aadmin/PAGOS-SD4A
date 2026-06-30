interface Props {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onChange: (p: number) => void;
}

export function Pagination({ page, totalPages, totalItems, pageSize, onChange }: Props) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  function pages(): (number | "…")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, "…", totalPages];
    if (page >= totalPages - 3) return [1, "…", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "…", page - 1, page, page + 1, "…", totalPages];
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <span className="text-xs text-muted-foreground">{from}–{to} de {totalItems} registros</span>
      <div className="flex gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          className="px-2 py-1 text-xs rounded border border-border hover:bg-muted disabled:opacity-40 text-foreground">
          ‹
        </button>
        {pages().map((p, i) =>
          p === "…"
            ? <span key={i} className="px-2 py-1 text-xs text-muted-foreground">…</span>
            : <button key={i} onClick={() => onChange(p as number)}
                className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                  page === p
                    ? "bg-sd4a-dark text-white border-sd4a-dark"
                    : "border-border hover:bg-muted text-foreground"
                }`}>
                {p}
              </button>
        )}
        <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
          className="px-2 py-1 text-xs rounded border border-border hover:bg-muted disabled:opacity-40 text-foreground">
          ›
        </button>
      </div>
    </div>
  );
}
