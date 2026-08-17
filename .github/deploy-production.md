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
| `SUPABASE_DB_URL` | Connection string de Postgres para migraciones |
| `VERCEL_TOKEN` | Token de API de Vercel |
| `VERCEL_ORG_ID` | ID de equipo/cuenta de Vercel |
| `VERCEL_PROJECT_ID` | ID del proyecto de Vercel |

Nunca subas estos valores al repo (`.env`, YAML, commits).

### `SUPABASE_DB_URL`

Es una URI de Postgres (`postgresql://…` o `postgres://…`), **no** la anon key ni la service role key.

1. En el dashboard de Supabase: **Project Settings → Database → Connection string**.
2. Elige un modo **compatible con migraciones (DDL)**:
   - **Direct** (puerto `5432` hacia `db.<ref>.supabase.co`), o
   - **Session pooler** (también puerto `5432` en el host `pooler`).
3. **No uses transaction pooler** (suele ser puerto `6543` / modo transaction de PgBouncer): puede fallar con migraciones.
4. Sustituye la contraseña del rol `postgres` (Database password). Si la contraseña tiene caracteres especiales, **percent-encódala** en la URI (requisito de `supabase db push --db-url`).
5. Crea el secret `SUPABASE_DB_URL` en GitHub con esa URI completa.

No uses JWT `anon` / `service_role` como URL. El workflow no hace `supabase link` ni necesita `SUPABASE_ACCESS_TOKEN`.

Comando que ejecuta CI (versión fijada):

```bash
npx --yes supabase@2.114.0 db push --yes --db-url "$SUPABASE_DB_URL"
```

`--db-url` es la forma documentada por la CLI para empujar migraciones contra una base concreta sin vincular el proyecto. `--yes` responde prompts en no interactivo. Si en el futuro la CLI exigiera `supabase link` + `SUPABASE_ACCESS_TOKEN`, no añadas service role al repo: usa token de acceso de la CLI y el secret de URL/password de Postgres, y actualiza esta guía.

### `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

1. **Token:** [Vercel Account Tokens](https://vercel.com/account/tokens) → crear un token con alcance mínimo sobre el equipo del proyecto. Caducidad corta y rotación periódica. Guardar como secret `VERCEL_TOKEN`.
2. **IDs:** en una máquina ya autenticada (`vercel login` **local**, no se transfiere a Actions), en la raíz del repo:

   ```bash
   vercel link
   ```

   Lee `.vercel/project.json` (está en `.gitignore`): `orgId` → `VERCEL_ORG_ID`, `projectId` → `VERCEL_PROJECT_ID`. También aparecen en el dashboard del proyecto (Settings).
3. El workflow autentica con la variable de entorno `VERCEL_TOKEN` (recomendación oficial de la CLI para CI) en lugar de `--token` en la línea de comandos, y usa `npx --yes vercel@59.1.3 deploy --prod --yes`.

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
4. Si `db push` falla, **no** habrá deploy. Corrige migraciones o la URI y vuelve a lanzar.
5. Si el deploy de Vercel falla, las migraciones **ya aplicadas no se revierten**. No relances a ciegas: revisa el estado del esquema y el dashboard de Vercel.

## Rotar o eliminar secretos

1. **Supabase:** rota la database password en el dashboard, actualiza `SUPABASE_DB_URL` en GitHub (URI nueva, password percent-encoded). La URI anterior deja de servir.
2. **Vercel:** revoca el token en Account Tokens, crea otro, actualiza `VERCEL_TOKEN`. Los IDs de org/proyecto no son credenciales de login, pero trátalos como secretos de CI.
3. Para **eliminar** un secret: Settings → Actions secrets → Delete. El workflow fallará hasta que vuelvas a crearlo.
4. Tras una filtración, rota en el proveedor **primero** y luego actualiza GitHub. Revisa Actions logs de la ventana expuesta.

## Concurrencia

El grupo `production-deploy` impide dos deploys simultáneos. Una corrida nueva cancela corridas **pendientes** (en cola) del mismo grupo; no cancela la que ya está ejecutándose.
