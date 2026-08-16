import { PublicMapIsland } from "@/components/mapa/PublicMapIsland";

export default function MapaPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl bg-stone-50 p-4">
      <h1 className="mb-3 text-xl font-semibold text-stone-900">
        Mapa de denuncias públicas
      </h1>
      <PublicMapIsland />
    </main>
  );
}
