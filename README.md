# Colombia Denuncia 🇨🇴

> Plataforma cívica y comunitaria de veeduría y denuncias ciudadanas para garantizar la transparencia en la distribución de ayudas humanitarias tras desastres y emergencias.

---

## 📌 Contexto y Propósito

Ante emergencias y desastres (como sismos o eventos climáticos) en Colombia, la respuesta ciudadana e institucional genera donaciones masivas. No obstante, surgen riesgos de **acaparamiento, desvío o reventa inescrupulosa de víveres y recursos**.

**Colombia Denuncia** es una plataforma web móvil progresiva (PWA) de despliegue rápido, diseñada para visibilizar estas anomalías mediante control social y veeduría comunitaria, con especial énfasis en **resiliencia para redes móviles inestables (2G/3G)** y **dispositivos de recursos limitados**.

---

## 🚀 Características Principales

* 📶 **Offline-First (Resiliencia en Terreno):** Permite registrar denuncias completas incluso sin conexión a internet. La información se almacena localmente y se sincroniza automáticamente al recuperar señal.
* 📷 **Compresión Client-Side de Evidencias:** Optimización instantánea de fotografías en el navegador mediante Web Workers, reduciendo archivos de 8–12 MB a menos de 180 KB (WebP) para proteger el plan de datos y ancho de banda del usuario.
* 🗺️ **Mapa Interactivo Ligero:** Visualización geoespacial de incidentes usando Leaflet y Supercluster, agrupando automáticamente puntos por densidad sin saturar la memoria del teléfono.
* 🛡️ **Veeduría y Moderación Comunitaria:** Mecanismo *"Yo estuve allí / Atestiguar"* para aportar evidencia complementaria, cálculo dinámico de *Trust Score* y cuarentena automática para reportes malintencionados o falsos.
* 🔒 **Privacidad y Protección:** Opción de reporte anónimo con protección anti-bot invisible (Cloudflare Turnstile) sin captchas invasivos.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend / PWA** | [Next.js 15](https://nextjs.org/) (App Router, React Server Components), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/) |
| **PWA & Offline** | [Serwist](https://github.com/serwist/serwist) (Service Workers, Cache-First), [Dexie.js](https://dexie.org/) (IndexedDB) |
| **Geoespacial & Mapas** | [Leaflet](https://leafletjs.com/), [Supercluster](https://github.com/mapbox/supercluster), [PostGIS](https://postgis.net/) |
| **Backend & Base de Datos** | [Supabase](https://supabase.com/) (PostgreSQL + PostGIS, Row Level Security, Storage, Studio) |
| **Seguridad & Edge** | [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) (Anti-Bot), CDN GeoJSON Caching |

---

## ⚙️ Configuración y Variables de Entorno

1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/colombiadenuncia.git
   cd colombiadenuncia
   ```

2. Copia el archivo de variables de entorno de ejemplo:
   ```bash
   cp .env.example .env.local
   ```

3. Completa los valores en `.env.local`:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Cloudflare Turnstile
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
   TURNSTILE_SECRET_KEY=your-secret-key
   ```

---

## 📦 Puesta en Marcha

Instala las dependencias y corre el servidor de desarrollo:

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador (o emulando un dispositivo móvil en DevTools).

---

## 📄 Licencia

Este proyecto es una iniciativa cívica de código abierto bajo la licencia [MIT](LICENSE).
