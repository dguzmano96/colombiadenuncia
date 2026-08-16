import Link from "next/link";
import { CAPTURA_PATH } from "@/pwa/precache";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Sin conexión</h1>
      <p className="text-sm text-stone-700">
        Puedes abrir la captura desde este dispositivo. Las denuncias se guardan
        aquí hasta que haya red.
      </p>
      <Link className="text-sm font-medium text-amber-800 underline" href={CAPTURA_PATH}>
        Ir a captura
      </Link>
    </main>
  );
}
