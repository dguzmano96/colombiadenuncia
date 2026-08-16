import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FotoField } from "./FotoField";
import { MSG_NOT_IMAGE, MSG_TOO_LARGE } from "@/media/compress-image";
import { WEBP_MIME } from "@/media/webp-pipeline";

describe("FotoField", () => {
  it("rechaza un archivo que no es imagen y no deja adjunto", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const compress = vi.fn(async () => ({
      ok: false as const,
      code: "not_image" as const,
      message: MSG_NOT_IMAGE,
      strategy: "worker" as const,
    }));
    render(
      <FotoField value={null} onChange={onChange} compress={compress} />,
    );
    await user.upload(
      screen.getByLabelText(/adjuntar imagen/i),
      new File(["nope"], "nota.jpg", { type: "image/jpeg" }),
    );
    expect((await screen.findByRole("alert")).textContent).toBe(MSG_NOT_IMAGE);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("permite continuar sin foto si la compresión falla", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const compress = vi.fn(async () => ({
      ok: false as const,
      code: "too_large" as const,
      message: MSG_TOO_LARGE,
      strategy: "worker" as const,
    }));
    render(<FotoField value={null} onChange={onChange} compress={compress} />);
    await user.upload(
      screen.getByLabelText(/adjuntar imagen/i),
      new File([new Uint8Array(10)], "huge.jpg", { type: "image/jpeg" }),
    );
    expect((await screen.findByRole("alert")).textContent).toBe(MSG_TOO_LARGE);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("acepta un WebP comprimido del worker mockeado", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const blob = new Blob([new Uint8Array(32)], { type: WEBP_MIME });
    const compress = vi.fn(async () => ({
      ok: true as const,
      blob,
      skippedEncode: false,
      strategy: "worker" as const,
    }));
    render(<FotoField value={null} onChange={onChange} compress={compress} />);
    await user.upload(
      screen.getByLabelText(/adjuntar imagen/i),
      new File([new Uint8Array(100)], "shot.jpg", { type: "image/jpeg" }),
    );
    expect(await screen.findByText(/comprimida a WebP/i)).toBeTruthy();
    expect(onChange).toHaveBeenCalledWith(blob);
  });
});
