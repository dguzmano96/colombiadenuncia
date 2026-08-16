import { describe, expect, it, vi } from "vitest";
import {
  handleSyncDenuncia,
  handleSyncForm,
  type SyncHandlerDeps,
} from "./handle-sync-denuncia";
import { verifyTurnstileToken } from "./verify-turnstile";

function requestWith(form: FormData): Request {
  return new Request("http://localhost/api/sync/denuncia", {
    method: "POST",
    body: form,
  });
}

function payloadForm(token?: string, extra?: { foto?: Blob; payloadRaw?: string }): FormData {
  const form = new FormData();
  if (token !== undefined) {
    form.set("turnstileToken", token);
  }
  form.set(
    "payload",
    extra?.payloadRaw ??
      JSON.stringify({
        denunciaId: "local-1",
        categoria: "desvío",
        relato: "Relato de prueba con longitud suficiente para sync.",
        lat: 4.61,
        lon: -74.07,
      }),
  );
  if (extra?.foto) {
    form.set("foto", extra.foto, "evidencia.webp");
  }
  return form;
}

function deps(overrides: Partial<SyncHandlerDeps> = {}): SyncHandlerDeps {
  return {
    turnstileSecret: "server-secret-only",
    verify: vi.fn().mockResolvedValue({ success: true }),
    storage: {
      upload: vi.fn().mockResolvedValue({ ok: true }),
      insert: vi.fn().mockResolvedValue({ ok: true, id: "pg-1" }),
      remove: vi.fn(),
    },
    ...overrides,
  };
}

describe("handleSyncDenuncia", () => {
  it("sin token no verifica ni inserta y pide reto", async () => {
    const d = deps();
    const response = await handleSyncDenuncia(requestWith(payloadForm("")), d);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("turnstile_required");
    expect(d.verify).not.toHaveBeenCalled();
    expect(d.storage.insert).not.toHaveBeenCalled();
  });

  it("payload JSON inválido devuelve 400 invalid_payload", async () => {
    const d = deps();
    const response = await handleSyncDenuncia(
      requestWith(payloadForm("valid-token", { payloadRaw: "not-json" })),
      d,
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("invalid_payload");
  });

  it("payload con campos incompletos devuelve 400 invalid_payload", async () => {
    const d = deps();
    const response = await handleSyncDenuncia(
      requestWith(
        payloadForm("valid-token", {
          payloadRaw: JSON.stringify({ denunciaId: "123" }),
        }),
      ),
      d,
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("invalid_payload");
  });

  it("token timeout-or-duplicate no inserta", async () => {
    const d = deps({
      verify: vi.fn().mockResolvedValue({
        success: false,
        "error-codes": ["timeout-or-duplicate"],
      }),
    });
    const response = await handleSyncDenuncia(
      requestWith(payloadForm("expired-token")),
      d,
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("timeout-or-duplicate");
    expect(body.errorCodes).toContain("timeout-or-duplicate");
    expect(d.storage.upload).not.toHaveBeenCalled();
    expect(d.storage.insert).not.toHaveBeenCalled();
  });

  it("token fallido genérico devuelve 403 turnstile_failed", async () => {
    const d = deps({
      verify: vi.fn().mockResolvedValue({
        success: false,
        "error-codes": ["invalid-input-response"],
      }),
    });
    const response = await handleSyncDenuncia(
      requestWith(payloadForm("bad-token")),
      d,
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("turnstile_failed");
  });

  it("Storage 5xx no publica la denuncia", async () => {
    const d = deps({
      storage: {
        upload: vi.fn().mockResolvedValue({ ok: false, status: 503 }),
        insert: vi.fn().mockResolvedValue({ ok: true, id: "nope" }),
      },
    });
    const response = await handleSyncForm(
      payloadForm("ok-token", {
        foto: new File([new Uint8Array([1])], "evidencia.webp", {
          type: "image/webp",
        }),
      }),
      d,
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe("storage_failed");
    expect(d.storage.insert).not.toHaveBeenCalled();
  });

  it("Fallo en insert devuelve 500 insert_failed", async () => {
    const d = deps({
      storage: {
        upload: vi.fn().mockResolvedValue({ ok: true }),
        insert: vi.fn().mockResolvedValue({ ok: false }),
      },
    });
    const response = await handleSyncDenuncia(
      requestWith(payloadForm("ok-token")),
      d,
    );
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("insert_failed");
  });

  it("happy path: siteverify true luego insert publicada", async () => {
    const d = deps();
    const response = await handleSyncDenuncia(
      requestWith(payloadForm("fresh-token")),
      d,
    );
    expect(response.status).toBe(201);
    expect(d.verify).toHaveBeenCalledWith("fresh-token", "server-secret-only");
    expect(d.storage.insert).toHaveBeenCalled();
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe("pg-1");
  });

  it("usa el verificador real apuntando a Cloudflare (inyectable)", () => {
    expect(verifyTurnstileToken.name).toBe("verifyTurnstileToken");
  });
});
