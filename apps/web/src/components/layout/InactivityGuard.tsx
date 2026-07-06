"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Clock } from "lucide-react";

const INACTIVITY_MS = 20 * 60 * 1000;  // 20 min de inactividad → logout
const WARNING_MS    =  2 * 60 * 1000;  // aviso 2 min antes

const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

export function InactivityGuard() {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_MS / 1000);
  const logoutTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const countdownRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  function clearTimers() {
    clearTimeout(logoutTimer.current);
    clearTimeout(warningTimer.current);
    clearInterval(countdownRef.current);
  }

  const doLogout = useCallback(async () => {
    clearTimers();
    await signOut({ callbackUrl: "/login" });
  }, []);

  const resetTimers = useCallback(() => {
    clearTimers();
    setShowWarning(false);

    warningTimer.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(WARNING_MS / 1000);
      countdownRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) { clearInterval(countdownRef.current); return 0; }
          return s - 1;
        });
      }, 1000);
    }, INACTIVITY_MS - WARNING_MS);

    logoutTimer.current = setTimeout(doLogout, INACTIVITY_MS);
  }, [doLogout]);

  useEffect(() => {
    EVENTS.forEach((e) => window.addEventListener(e, resetTimers, { passive: true }));
    resetTimers();
    return () => {
      clearTimers();
      EVENTS.forEach((e) => window.removeEventListener(e, resetTimers));
    };
  }, [resetTimers]);

  if (!showWarning) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
          <Clock className="w-7 h-7 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Sesión por expirar</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Por inactividad, la sesión se cerrará en
          </p>
          <p className="text-4xl font-bold text-amber-600 dark:text-amber-400 mt-2 tabular-nums">
            {mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${secs}s`}
          </p>
        </div>
        <div className="flex gap-3 pt-1">
          <button
            onClick={resetTimers}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #0A7881, #68B2B7)" }}
          >
            Seguir conectado
          </button>
          <button
            onClick={doLogout}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </div>
    </div>
  );
}
