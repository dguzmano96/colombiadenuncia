"use client";

import {
  ACERCAR_NO_DISPONIBLE,
  CLUSTER_LEAVES_PAGE_SIZE,
} from "@/mapa/supercluster-index";

type Props = {
  ids: string[];
  hasMore: boolean;
  canZoom: boolean;
  onSelect: (id: string) => void;
  onNext: () => void;
  onClose: () => void;
};

export function ClusterLeavesPanel({
  ids,
  hasMore,
  canZoom,
  onSelect,
  onNext,
  onClose,
}: Props) {
  return (
    <aside
      className="rounded-md border border-stone-300 bg-white p-4 text-sm shadow-sm"
      role="dialog"
      aria-label="Puntos del cluster"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-stone-900">
          Puntos en este grupo
        </h2>
        <button
          type="button"
          className="rounded border border-stone-300 px-2 py-1 text-xs"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
      {!canZoom ? (
        <p role="status" className="mb-2 text-stone-700">
          {ACERCAR_NO_DISPONIBLE}
        </p>
      ) : null}
      <ul className="grid gap-1">
        {ids.slice(0, CLUSTER_LEAVES_PAGE_SIZE).map((id) => (
          <li key={id}>
            <button
              type="button"
              className="w-full rounded border border-stone-200 px-2 py-1 text-left hover:bg-stone-50"
              onClick={() => onSelect(id)}
            >
              {id}
            </button>
          </li>
        ))}
      </ul>
      {hasMore ? (
        <button
          type="button"
          className="mt-3 rounded bg-amber-700 px-3 py-1 text-white"
          onClick={onNext}
        >
          Siguientes
        </button>
      ) : null}
    </aside>
  );
}
