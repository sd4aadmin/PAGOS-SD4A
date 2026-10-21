/**
 * Convierte una respuesta fallida de la API en un mensaje que una persona pueda
 * entender y accionar. Los 4xx traen el mensaje en español del backend; los 5xx
 * y las fallas de red nunca se muestran crudos ("Internal Server Error").
 */
export async function apiErrorMessage(res: Response, fallback = "No se pudo completar la acción."): Promise<string> {
  if (res.status >= 500) {
    return res.status === 502 || res.status === 503 || res.status === 504
      ? "El servicio no responde en este momento. Intenta de nuevo en unos minutos; tus datos siguen en el formulario."
      : "Ocurrió un problema de nuestro lado y no se guardó nada. Intenta de nuevo; si se repite, avisa a soporte con la hora aproximada.";
  }
  if (res.status === 401 || res.status === 403) {
    return "No tienes permiso para esta acción o tu sesión venció. Vuelve a iniciar sesión.";
  }
  try {
    const body = await res.clone().json();
    const detail = body?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail)) return "Revisa los campos del formulario: hay datos que no son válidos.";
  } catch {
    /* cuerpo no JSON: se usa el mensaje por defecto */
  }
  return fallback;
}

export const NETWORK_ERROR_MESSAGE = "No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.";
