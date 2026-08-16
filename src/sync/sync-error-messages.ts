export function formatSyncError(
  error?: string | null,
  detail?: string | null,
  errorCodes?: string[],
): string {
  const codesStr =
    errorCodes && errorCodes.length > 0 ? ` (${errorCodes.join(", ")})` : "";

  switch (error) {
    case "server_misconfigured":
      return (
        (detail ||
          "El servidor no tiene configuradas las variables de entorno requeridas (TURNSTILE_SECRET_KEY o Supabase).") +
        codesStr
      );
    case "turnstile_required":
      return (
        (detail ||
          "Se requiere verificación de seguridad (Turnstile) para enviar la denuncia.") +
        codesStr
      );
    case "turnstile_missing":
      return (
        (detail ||
          "No se pudo obtener el token de verificación de seguridad. Comprueba bloqueadores de contenido o recarga la página.") +
        codesStr
      );
    case "turnstile_failed":
      return (
        (detail ||
          "La validación de seguridad anti-bot (Turnstile) no fue aprobada.") +
        codesStr
      );
    case "timeout-or-duplicate":
      return (
        (detail ||
          "El token de verificación expiró o ya fue utilizado. Se generará uno nuevo.") +
        codesStr
      );
    case "storage_failed":
      return (
        (detail ||
          "Error al subir la fotografía de evidencia a Supabase Storage.") +
        codesStr
      );
    case "insert_failed":
      return (
        (detail ||
          "Error al guardar la denuncia en la base de datos de Supabase.") +
        codesStr
      );
    case "invalid_payload":
      return (
        (detail ||
          "El formato de los datos de la denuncia es inválido para el servidor.") +
        codesStr
      );
    case "network_error":
      return (
        (detail ||
          "Error de conexión de red al comunicarse con el servidor.") +
        codesStr
      );
    case "geojson_unavailable":
      return (
        (detail ||
          "No se pudieron consultar las denuncias públicas del servidor.") +
        codesStr
      );
    default:
      if (detail) return detail + codesStr;
      if (error) return `Error de sincronización: ${error}${codesStr}`;
      return "Error desconocido durante la sincronización.";
  }
}
