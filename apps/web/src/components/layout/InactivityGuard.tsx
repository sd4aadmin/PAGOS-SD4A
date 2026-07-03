"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { logout } from "@/app/actions/auth";

const INACTIVE_MS = 10 * 60 * 1000;  // 10 minutos
const WARNING_MS = 60 * 1000;         // aviso 1 minuto antes

const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

export function InactivityGuard() {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAll = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const doLogout = useCallback(async () => {
    clearAll();
    await logout();
  }, []);

  const reset = useCallback(() => {
    clearAll();
    setShowWarning(false);
    setSecondsLeft(60);

    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(60);
      countdownRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(countdownRef.current!);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }, INACTIVE_MS - WARNING_MS);

    timerRef.current = setTimeout(() => {
      doLogout();
    }, INACTIVE_MS);
  }, [doLogout]);

  useEffect(() => {
    reset();
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearAll();
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [reset]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 mx-4 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <span className="text-2xl">⏱️</span>
        </div>
        <div>
          <h2 className="font-semibold text-foreground text-lg">¿Sigues ahí?</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tu sesión se cerrará en <span className="font-bold text-amber-600">{secondsLeft}s</span> por inactividad.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={doLogout}
            className="flex-1 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted/50"
          >
            Cerrar sesión
          </button>
          <button
            onClick={reset}
            className="flex-1 py-2 bg-sd4a-dark text-white rounded-lg text-sm font-medium hover:bg-[#075e69]"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
