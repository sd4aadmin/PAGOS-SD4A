"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "sd4a_cookies_accepted";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl flex-wrap items-center gap-4 rounded-2xl bg-slate-900 px-5 py-4 text-white shadow-2xl dark:bg-slate-800"
    >
      <p className="flex-1 basis-64 text-sm leading-relaxed text-white/85">
        Usamos cookies esenciales para el funcionamiento del sitio. Al continuar navegando, aceptas nuestra{" "}
        <a
          href="https://sd4a-web.vercel.app/privacidad.html"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white"
        >
          Política de privacidad
        </a>
        .
      </p>
      <button
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, "true");
          setVisible(false);
        }}
        className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-white/90"
      >
        Aceptar
      </button>
    </div>
  );
}
