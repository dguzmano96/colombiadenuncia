import { DenunciaForm } from "@/components/captura/DenunciaForm";
import { SyncDrain } from "@/components/sync/SyncDrain";

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50">
      <SyncDrain />
      <DenunciaForm />
    </main>
  );
}
