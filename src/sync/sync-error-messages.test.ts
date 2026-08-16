import { describe, expect, it } from "vitest";
import { formatSyncError } from "./sync-error-messages";

describe("formatSyncError", () => {
  it("formatea error server_misconfigured", () => {
    const msg = formatSyncError("server_misconfigured");
    expect(msg).toMatch(/TURNSTILE_SECRET_KEY o Supabase/);
  });

  it("formatea error turnstile_failed con errorCodes", () => {
    const msg = formatSyncError("turnstile_failed", null, [
      "invalid-input-response",
    ]);
    expect(msg).toMatch(/Turnstile/);
    expect(msg).toMatch(/invalid-input-response/);
  });

  it("formatea error timeout-or-duplicate", () => {
    const msg = formatSyncError("timeout-or-duplicate");
    expect(msg).toMatch(/expiró o ya fue utilizado/);
  });

  it("formatea error storage_failed", () => {
    const msg = formatSyncError("storage_failed");
    expect(msg).toMatch(/Supabase Storage/);
  });

  it("formatea error insert_failed", () => {
    const msg = formatSyncError("insert_failed");
    expect(msg).toMatch(/base de datos/);
  });

  it("formatea error network_error", () => {
    const msg = formatSyncError("network_error");
    expect(msg).toMatch(/conexión de red/);
  });

  it("respeta detalle personalizado si se proporciona", () => {
    const msg = formatSyncError("server_misconfigured", "Faltan credenciales.");
    expect(msg).toBe("Faltan credenciales.");
  });

  it("maneja errores desconocidos limpiamente", () => {
    const msg = formatSyncError("custom_error_code");
    expect(msg).toMatch(/custom_error_code/);
  });
});
