# Despliegue de producción (GitHub Actions)

Esta guía configura el workflow `.github/workflows/deploy-production.yml`.

`docs/` está en `.gitignore` de este repositorio, así que la documentación de CI queda aquí (ruta versionada) y no en `docs/deploy-github-actions.md`.

El workflow **no usa** la sesión local de `npx supabase` ni de `npx vercel`. Hay que crear Secrets propios en GitHub.

No pegues valores reales en issues, PRs, YAML ni en esta guía.

## Qué hace el workflow

Tras un `push` a `main` (típicamente un merge) o con `workflow_dispatch`:

1. Instala dependencias, corre tests, lint y `npm run build`.
2. Aplica migraciones con Supabase CLI (`db push`).
3. Despliega a producción en Vercel.

Si falla cualquier paso anterior, GitHub Actions detiene el job y **no** despliega. El `build` de CI es solo un control de compilación: **no** copia variables de runtime de Vercel al YAML.

## Secrets de GitHub

En el repositorio: **Settings → Secrets and variables → Actions → New repository secret**.

Nombres exactos:

| Secret | Uso |
| --- | --- |
| `SUPABASE_DB_URL` | URI **Session pooler** (IPv4, puerto `5432`). Nunca Direct ni Transaction. |
| `VERCEL_TOKEN` | Token de API de Vercel |
| `VERCEL_ORG_ID` | ID de equipo/cuenta de Vercel |
| `VERCEL_PROJECT_ID` | ID del proyecto de Vercel |

Nunca subas estos valores al repo (`.env`, YAML, commits).

### `SUPABASE_DB_URL`

Es una URI de Postgres (`postgresql://…` o `postgres://…`), **no** la anon key ni la service role key.

Este workflow corre en **GitHub-hosted runners** (`ubuntu-latest`). Esos runners resuelven el host Direct (`db.<ref>.supabase.co`) a **IPv6**. El endpoint Direct de Supabase no acepta/enruta esa conexión IPv6 desde Actions (`ECONNREFUSED` en `:5432`, a menudo un AAAA como `2600:…`). El **Session pooler** (Supavisor) es IPv4 en todos los planes y sí funciona desde Actions. Por eso `SUPABASE_DB_URL` **debe** ser Session pooler, **nunca** Direct.

Pasos (copia la URI; no inventes el host):

1. En el dashboard del proyecto: botón **Connect** (arriba).
2. Pestaña / método **Session** (Session pooler). **No** elijas Direct ni Transaction.
3. Copia la URI. Comprueba:
   - Host `aws-*.pooler.supabase.com` (este proyecto, región `ca-central-1`: `aws-0-ca-central-1.pooler.supabase.com`).
   - Puerto **`5432`** (session).
   - Usuario `postgres.<project-ref>` (ejemplo: `postgres.uscyiuoqlqvhrfjwixfr`).
4. Sustituye `[YOUR-PASSWORD]` por la database password del rol `postgres`. Si tiene caracteres especiales, **percent-encódala** (requisito de `supabase db push --db-url`).
5. En GitHub: **Settings → Secrets and variables → Actions** → actualiza (o crea) `SUPABASE_DB_URL` con esa URI completa.

Formato de ejemplo (placeholder; **nunca** pegues la password real aquí ni en el YAML):

```
postgresql://postgres.uscyiuoqlqvhrfjwixfr:[YOUR-PASSWORD]@aws-0-ca-central-1.pooler.supabase.com:5432/postgres
```

**Prohibido para este workflow:**

- **Direct** `db.*.supabase.co:5432` (IPv6 → `ECONNREFUSED` desde GitHub Actions).
- **Transaction pooler** puerto `6543` (PgBouncer/Supavisor transaction): no sirve para migraciones DDL (`db push`).
- JWT `anon` / `service_role` como URL.

El workflow no hace `supabase link` ni necesita `SUPABASE_ACCESS_TOKEN`.

Si Session pooler sigue fallando, revisa Network Restrictions / Network Bans en el dashboard (la IP del runner de Actions debe poder salir a `*.pooler.supabase.com:5432`). No vuelvas a Direct para “arreglarlo”.

Comando que ejecuta CI (versión fijada):

```bash
npx --yes supabase@2.114.0 db push --yes --db-url "$SUPABASE_DB_URL"
```

`--db-url` es la forma documentada por la CLI para empujar migraciones contra una base concreta sin vincular el proyecto. `--yes` responde prompts en no interactivo. Si en el futuro la CLI exigiera `supabase link` + `SUPABASE_ACCESS_TOKEN`, no añadas service role al repo: usa token de acceso de la CLI y el secret de URL/password de Postgres, y actualiza esta guía.

### `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

Los tres secrets **tienen que existir** en GitHub (Settings → Secrets and variables → Actions). Si `VERCEL_TOKEN` no está creado o está vacío, el YAML no autentica: el CLI responde `No existing credentials found` (a menudo con `Run vercel deploy --temporary`). Corregir el workflow no sustituye crear el secret.

1. **Token:** [Vercel Account Tokens](https://vercel.com/account/tokens) → crear un token con alcance mínimo sobre el equipo del proyecto. Caducidad corta y rotación periódica. Guardar el valor como secret `VERCEL_TOKEN`. Sin este secret, el paso de deploy falla con el error de credenciales de arriba.
2. **IDs:** en una máquina ya autenticada (`vercel login` **local**, no se transfiere a Actions), en la raíz del repo:

   ```bash
   vercel link
   ```

   Lee `.vercel/project.json` (está en `.gitignore`): `orgId` → `VERCEL_ORG_ID`, `projectId` → `VERCEL_PROJECT_ID`. También aparecen en el dashboard del proyecto (Settings). Ambos IDs son secrets obligatorios junto al token.
3. El runner de Actions no tiene `~/.local/share/com.vercel.cli`. El CLI 59 espera `--token` en argv en ese contexto; solo exportar `VERCEL_TOKEN` no basta. El workflow pasa el secret a env (GitHub lo enmascara) y lo reenvía así:

   ```bash
   npx --yes vercel@59.1.3 deploy --prod --yes --token "$VERCEL_TOKEN"
   ```

   No interpolar `${{ secrets.VERCEL_TOKEN }}` en la línea de comandos.

## Rama de producción en Vercel

En el proyecto de Vercel, la rama de producción debe ser **`main`**.

Este workflow es quien aplica migraciones **antes** del deploy. `vercel.json` tiene `git.deploymentEnabled: false` para que el Git integration de Vercel **no** dispare deploys (producción ni preview). El único camino a producción es este workflow (`vercel deploy --prod` en Actions). No vuelvas a activar auto-deploy de Git mientras el job de migraciones viva aquí.

Las variables de runtime (`NEXT_PUBLIC_*`, secretos de Turnstile, etc.) se configuran **solo en Vercel** (Project → Settings → Environment Variables, entorno Production). No las dupliques en el YAML.

## Orden: migraciones → deploy

El job es secuencial. `vercel deploy` solo corre si tests, lint, build y `db push` salieron bien. Así el código nuevo no llega a producción con un esquema atrasado.

`npm run build` en Actions **no** es el artefacto que sirve Vercel: Vercel vuelve a construir con sus propias env de Production.

## Ejecución manual y logs

1. GitHub → **Actions → Deploy production → Run workflow** (`workflow_dispatch`).
2. Elige `main` si el selector lo pide.
3. Abre la corrida y revisa cada paso. Los secretos de GitHub se enmascaran; no actives debug (`ACTIONS_STEP_DEBUG`, `--debug` de las CLIs) salvo que sepas que la salida puede incluir URLs con password.
4. Si `db push` falla, **no** habrá deploy. Si el error es `ECONNREFUSED` / IPv6 hacia `db.*.supabase.co`, el secret sigue en Direct: cámbialo a Session pooler (`aws-*.pooler.supabase.com:5432`) y relanza. Si el fallo es de SQL, corrige migraciones.
5. Si el deploy de Vercel falla, las migraciones **ya aplicadas no se revierten**. No relances a ciegas: revisa el estado del esquema y el dashboard de Vercel. Si el error es `No existing credentials found`, el secret `VERCEL_TOKEN` falta, está vacío o no llega al paso: créalo o actualízalo (Account → Tokens) y confirma también `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`.

## Rotar o eliminar secretos

1. **Supabase:** rota la database password en el dashboard, vuelve a copiar **Connect → Session** y actualiza `SUPABASE_DB_URL` en GitHub (misma URI Session, password percent-encoded). No sustituyas por Direct. La URI anterior deja de servir.
2. **Vercel:** revoca el token en Account Tokens, crea otro, actualiza `VERCEL_TOKEN`. Los IDs de org/proyecto no son credenciales de login, pero trátalos como secretos de CI.
3. Para **eliminar** un secret: Settings → Actions secrets → Delete. El workflow fallará hasta que vuelvas a crearlo.
4. Tras una filtración, rota en el proveedor **primero** y luego actualiza GitHub. Revisa Actions logs de la ventana expuesta.

## Concurrencia

El grupo `production-deploy` impide dos deploys simultáneos. Una corrida nueva cancela corridas **pendientes** (en cola) del mismo grupo; no cancela la que ya está ejecutándose.
