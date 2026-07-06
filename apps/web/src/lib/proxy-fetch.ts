"use client";

import { signOut } from "next-auth/react";

/**
 * Wrapper around fetch("/api/proxy/...") that redirects to /login on 401.
 * Drop-in replacement: proxyFetch("/projects") instead of fetch("/api/proxy/projects").
 */
export async function proxyFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `/api/proxy${path.startsWith("/") ? path : "/" + path}`;
  const res = await fetch(url, options);

  if (res.status === 401) {
    await signOut({ callbackUrl: "/login" });
    // Return a never-resolving response so callers don't continue processing
    return new Promise(() => {});
  }

  return res;
}
