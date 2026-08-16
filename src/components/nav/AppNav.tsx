import Link from "next/link";
import { CAPTURA_PATH, MAPA_PATH } from "@/pwa/precache";

export function AppNav() {
  return (
    <nav
      className="flex gap-4 border-b border-stone-200 bg-white px-4 py-3 text-sm"
      aria-label="Principal"
    >
      <Link className="font-medium text-amber-800 underline" href={CAPTURA_PATH}>
        Captura
      </Link>
      <Link className="font-medium text-amber-800 underline" href={MAPA_PATH}>
        Mapa
      </Link>
    </nav>
  );
}
