import { auth } from "@/auth";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

/**
 * Fetch autenticado para Server Components y Server Actions.
 * Adjunta automáticamente el Bearer token de la sesión activa.
 */
export async function serverFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const session = await auth();
  const token = session?.accessToken;

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Error de servidor");
  }

  return res.json() as Promise<T>;
}
