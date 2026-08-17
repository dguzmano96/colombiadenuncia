import { redirect } from "next/navigation";
import { MAPA_PATH } from "@/pwa/precache";

export default function TablaZonalPage() {
  redirect(`${MAPA_PATH}#tabla-zonal`);
}
