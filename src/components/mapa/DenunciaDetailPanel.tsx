"use client";

import { DESCARGO_LEGAL } from "@/domain/denuncia";
import { YA_NO_ESTA_PUBLICO, type PublicDetalle } from "@/mapa/public-detalle";

export type DetallePanelState =
  | { kind: "loading" }
  | { kind: "ready"; detalle: PublicDetalle }
  | { kind: "gone"; message: string }
  | { kind: "error" };

type Props = {
  state: DetallePanelState;
  onClose: () => void;
};

export function DenunciaDetailPanel({ state, onClose }: Props) {
  return (
    <aside
      className="rounded-md border border-stone-300 bg-white p-4 text-sm shadow-sm"
      role="dialog"
      aria-label="Detalle de denuncia pública"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-stone-900">Detalle</h2>
        <button
          type="button"
          className="rounded border border-stone-300 px-2 py-1 text-xs"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>

      {state.kind === "loading" ? (
        <p role="status">Cargando detalle…</p>
      ) : null}

      {state.kind === "error" ? (
        <p role="alert">No se pudo cargar el detalle.</p>
      ) : null}

      {state.kind === "gone" ? (
        <p role="status">{state.message || YA_NO_ESTA_PUBLICO}</p>
      ) : null}

      {state.kind === "ready" ? (
        <dl className="grid gap-2">
          <div>
            <dt className="font-medium text-stone-600">Categoría</dt>
            <dd>{state.detalle.categoria}</dd>
          </div>
          <div>
            <dt className="font-medium text-stone-600">Relato</dt>
            <dd className="whitespace-pre-wrap">{state.detalle.relato}</dd>
          </div>
          <div>
            <dt className="font-medium text-stone-600">Trust Score</dt>
            <dd>{state.detalle.trust_score}</dd>
          </div>
          <div>
            <dt className="font-medium text-stone-600">Atestiguos válidos</dt>
            <dd>{state.detalle.atestiguos_validos}</dd>
          </div>
          <div>
            <dt className="font-medium text-stone-600">Reportes de falsedad</dt>
            <dd>{state.detalle.reportes_falsedad}</dd>
          </div>
          {state.detalle.photo_url ? (
            <div>
              <dt className="font-medium text-stone-600">Foto</dt>
              <dd>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={state.detalle.photo_url}
                  alt="Evidencia pública"
                  className="mt-1 max-h-48 w-full rounded object-contain"
                />
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <p className="mt-3 border-t border-stone-200 pt-2 text-xs text-stone-600">
        {DESCARGO_LEGAL}
      </p>
    </aside>
  );
}
