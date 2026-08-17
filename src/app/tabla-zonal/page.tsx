import { TablaZonal } from "@/components/zonal/TablaZonal";

export default function TablaZonalPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl bg-stone-50 p-4">
      <h1 className="mb-2 text-xl font-semibold text-stone-900">
        Tabla pública por zona
      </h1>
      <p className="mb-4 text-sm text-stone-700">
        Conteos de denuncias publicadas por departamento y municipio. No se
        muestran coordenadas ni datos personales.
      </p>
      <TablaZonal />
    </main>
  );
}
