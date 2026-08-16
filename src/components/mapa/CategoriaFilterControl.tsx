"use client";

import { CATEGORIAS, type Categoria } from "@/domain/denuncia";

export type CategoriaFilterControlProps = {
  selected: readonly Categoria[];
  onChange: (next: Categoria[]) => void;
};

export function CategoriaFilterControl({
  selected,
  onChange,
}: CategoriaFilterControlProps) {
  function toggle(categoria: Categoria) {
    if (selected.includes(categoria)) {
      onChange(selected.filter((item) => item !== categoria));
      return;
    }
    onChange([...selected, categoria]);
  }

  return (
    <section className="flex flex-col gap-2 rounded-md border border-stone-200 bg-white p-3">
      <p className="text-sm font-medium">Filtrar por categoría</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Categorías">
        {CATEGORIAS.map((categoria) => {
          const pressed = selected.includes(categoria);
          return (
            <button
              key={categoria}
              type="button"
              aria-pressed={pressed}
              className={
                pressed
                  ? "rounded-full bg-amber-700 px-3 py-1.5 text-sm text-white"
                  : "rounded-full border border-stone-300 px-3 py-1.5 text-sm"
              }
              onClick={() => toggle(categoria)}
            >
              {categoria}
            </button>
          );
        })}
      </div>
    </section>
  );
}
