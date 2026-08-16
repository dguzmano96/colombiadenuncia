export type DenunciaPublishInput = {
  categoria: string;
  relato: string;
  lat: number;
  lon: number;
  fotoBytes?: ArrayBuffer;
  fotoMime?: string;
};

export type DenunciaInsertRow = {
  categoria: string;
  relato: string;
  location: string;
  estado: "publicada";
  trust_score: 0;
  atestiguos_validos: 0;
  reportes_falsedad: 0;
  photo_path: string | null;
};

export type PublishStorage = {
  upload: (
    path: string,
    bytes: ArrayBuffer,
    mime: string,
  ) => Promise<{ ok: true } | { ok: false; status: number }>;
  insert: (
    row: DenunciaInsertRow,
  ) => Promise<{ ok: true; id: string } | { ok: false }>;
  remove?: (path: string) => Promise<void>;
};

export type PublishResult =
  | { ok: true; id: string; photoPath: string | null }
  | { ok: false; reason: "storage" | "insert"; status?: number };

function extensionFor(mime: string | undefined): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return "webp";
}

export function pointWkt(lon: number, lat: number): string {
  return `POINT(${lon} ${lat})`;
}

export async function publishDenuncia(
  input: DenunciaPublishInput,
  storage: PublishStorage,
  idFactory: () => string = () => crypto.randomUUID(),
): Promise<PublishResult> {
  let photoPath: string | null = null;

  if (input.fotoBytes && input.fotoBytes.byteLength > 0) {
    photoPath = `${idFactory()}.${extensionFor(input.fotoMime)}`;
    const uploaded = await storage.upload(
      photoPath,
      input.fotoBytes,
      input.fotoMime ?? "image/webp",
    );
    if (!uploaded.ok) {
      return { ok: false, reason: "storage", status: uploaded.status };
    }
  }

  const inserted = await storage.insert({
    categoria: input.categoria,
    relato: input.relato,
    location: pointWkt(input.lon, input.lat),
    estado: "publicada",
    trust_score: 0,
    atestiguos_validos: 0,
    reportes_falsedad: 0,
    photo_path: photoPath,
  });

  if (!inserted.ok) {
    if (photoPath) {
      await storage.remove?.(photoPath);
    }
    return { ok: false, reason: "insert" };
  }

  return { ok: true, id: inserted.id, photoPath };
}
