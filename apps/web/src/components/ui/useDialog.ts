"use client";

import { useEffect, useId, useRef } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Comportamiento accesible común de los modales: Esc para cerrar, foco atrapado
 * dentro del panel, bloqueo del scroll de fondo y regreso del foco al elemento
 * que abrió el modal. Se usa sobre el panel existente de cada modal:
 *
 *   const dialog = useDialog(onClose);
 *   <div {...dialog.overlayProps} className="fixed inset-0 ...">
 *     <div {...dialog.panelProps} className="modal-panel ..."> ... <h2 id={dialog.titleId}>
 */
export function useDialog(onClose: () => void, opts: { closeOnOverlay?: boolean } = {}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Se guarda durante el primer render, antes de que un campo con autoFocus
  // robe el foco al montarse; si no, al cerrar se "restauraría" un nodo ya desmontado.
  const openerRef = useRef<HTMLElement | null>(null);
  if (openerRef.current === null && typeof document !== "undefined") {
    openerRef.current = document.activeElement as HTMLElement | null;
  }

  useEffect(() => {
    const panel = panelRef.current;
    const previouslyFocused = openerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (panel && !panel.contains(document.activeElement)) {
      const first =
        panel.querySelector<HTMLElement>("[data-autofocus]") ?? panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === firstEl || active === panel)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return {
    titleId,
    overlayProps: opts.closeOnOverlay
      ? {
          onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) onCloseRef.current();
          },
        }
      : {},
    panelProps: {
      ref: panelRef,
      role: "dialog" as const,
      "aria-modal": true as const,
      "aria-labelledby": titleId,
      tabIndex: -1,
    },
  };
}
