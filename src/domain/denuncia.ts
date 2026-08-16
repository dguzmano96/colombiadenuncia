import { isValidGeoPoint, type GeoPoint } from "./geo";

export const CATEGORIAS = [
  "acaparamiento",
  "reventa",
  "desvío",
  "otro",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export const RELATO_MIN = 20;
export const RELATO_MAX = 1000;

export const ESTADO_PENDIENTE_SYNC = "pendiente_sync" as const;
export const ESTADO_ENVIADA = "enviada" as const;
export const ESTADO_ERROR_SYNC = "error_sync" as const;

export type EstadoLocal =
  | typeof ESTADO_PENDIENTE_SYNC
  | typeof ESTADO_ENVIADA
  | typeof ESTADO_ERROR_SYNC;

export const DESCARGO_LEGAL =
  "Esta plataforma no constituye denuncia penal ni prueba judicial. Es un registro cívico de veeduría comunitaria.";

export type DenunciaInput = {
  categoria: string;
  relato: string;
  geo: GeoPoint | null;
  descargoAceptado: boolean;
};

export type DenunciaLocal = {
  id: string;
  categoria: Categoria;
  relato: string;
  lat: number;
  lon: number;
  estado: EstadoLocal;
  lastError?: string;
  lastErrorDetail?: string;
};

export type ValidationIssue = {
  field: "categoria" | "relato" | "geo" | "descargo";
  message: string;
};

export type ValidationResult =
  | { ok: true; categoria: Categoria; relato: string; geo: GeoPoint }
  | { ok: false; issues: ValidationIssue[] };

export function isCategoria(value: string): value is Categoria {
  return (CATEGORIAS as readonly string[]).includes(value);
}

export function validateDenunciaInput(input: DenunciaInput): ValidationResult {
  const issues: ValidationIssue[] = [];
  const relato = input.relato.trim();

  if (!isCategoria(input.categoria)) {
    issues.push({
      field: "categoria",
      message: "Elige una categoría válida.",
    });
  }

  if (relato.length < RELATO_MIN) {
    issues.push({
      field: "relato",
      message: `El relato debe tener mínimo ${RELATO_MIN} caracteres.`,
    });
  } else if (relato.length > RELATO_MAX) {
    issues.push({
      field: "relato",
      message: `El relato no puede superar ${RELATO_MAX} caracteres.`,
    });
  }

  if (!isValidGeoPoint(input.geo)) {
    issues.push({
      field: "geo",
      message: "Indica la ubicación con GPS o un pin en el mapa.",
    });
  }

  if (!input.descargoAceptado) {
    issues.push({
      field: "descargo",
      message: "Debes confirmar el descargo legal.",
    });
  }

  if (issues.length > 0 || !isCategoria(input.categoria) || !input.geo) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    categoria: input.categoria,
    relato,
    geo: input.geo,
  };
}

export function createDenunciaLocal(
  input: DenunciaInput,
  idFactory: () => string = () => crypto.randomUUID(),
): { ok: true; denuncia: DenunciaLocal } | { ok: false; issues: ValidationIssue[] } {
  const validated = validateDenunciaInput(input);
  if (!validated.ok) {
    return validated;
  }

  return {
    ok: true,
    denuncia: {
      id: idFactory(),
      categoria: validated.categoria,
      relato: validated.relato,
      lat: validated.geo.lat,
      lon: validated.geo.lon,
      estado: ESTADO_PENDIENTE_SYNC,
    },
  };
}
