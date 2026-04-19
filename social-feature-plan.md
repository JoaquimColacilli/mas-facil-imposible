# Social Feature — Plan maestro

> Documento vivo. Fuente única de verdad para la implementación de la capa social de MFI (amigos + chat real-time + integración con cobros/deudas).
>
> **Ubicación sugerida en el repo**: `docs/social-feature/PLAN.md`.
>
> **Fuentes canónicas adyacentes**: [AGENT.md](../../AGENT.md), [CLAUDE.md](../../CLAUDE.md), [app/CLAUDE.md](../../app/CLAUDE.md). Este doc NO los reemplaza — los extiende para el scope social.

---

## 0. Cómo usar este documento

### 0.1 Para el agente (Claude Code u otro)

Antes de tocar código, el agente debe:

1. Leer este doc **completo** (no solo la fase en curso).
2. Leer `AGENT.md`, `CLAUDE.md`, `app/CLAUDE.md` en la raíz del repo.
3. Leer los archivos listados en `## Contexto obligatorio` de la fase que va a ejecutar.
4. Verificar que las fases previas están completas (ver `✅ Criterios de aceptación` de cada fase).
5. Ejecutar la fase siguiendo el mismo patrón de trabajo que el resto del repo: exploración → reporte intermedio → aprobación explícita del owner → implementación → sign-off.

El agente **no** avanza a la siguiente fase sin OK explícito.

### 0.2 Para el owner del proyecto

Cada fase produce un commit atómico dentro del mismo PR. El agente reporta al final de cada fase y espera luz verde antes de arrancar la siguiente. Al cerrar la última fase, se corre `scripts/add-changelog.mjs minor "..."` con bullets consolidados por fase.

### 0.3 Regla de oro

> **Lo que no está explícitamente aprobado en este doc o en un reporte intermedio firmado, no se hace.** Si aparece una ambigüedad durante la implementación, el agente para, reporta, y espera.

---

## 1. Contexto y objetivo

MFI es hoy una app **single-user** de finanzas personales. La capa social la convierte en una app **single-user con capa social opcional**: un user puede ignorar toda la feature y la app sigue funcionando igual que hoy.

### 1.1 Job to be done

Los amigos en MFI existen para **dos cosas concretas**:

1. **Intercambio de consejos financieros** vía chat 1:1.
2. **Trackear cobros y deudas entre amigos** (extensión de `loans` y `debts` existentes, con un `friend_id` opcional).

No es un feed social. No es un banco P2P. No es Splitwise. Es un canal de comunicación cerrado entre usuarios que ya usan la app + un shortcut para vincular cobros/deudas existentes a un amigo.

### 1.2 Qué NO es esta feature

- No es una red social abierta. No hay feed, no hay likes, no hay posts.
- No es un sistema de pagos. No se transfiere dinero por MFI.
- No muestra montos de finanzas personales de un amigo, jamás. El perfil público expone streaks y badges, no números.
- No es multi-device sync de cuentas compartidas.

---

## 2. Decisiones congeladas

Lo que está en esta sección está cerrado. No re-discutir durante implementación.

### 2.1 Producto

| Decisión | Valor |
|---|---|
| Job to be done | Consejos (chat) + trackeo de cobros/deudas entre amigos |
| Peso social en la app | Opcional — MFI sin social sigue siendo MFI |
| Tipo de social graph | Simétrico (request → accept, ambos pasan a ser amigos) |
| Discovery | Username exacto + link de invitación (`/add/:username`) |
| Toggle "ser encontrado" | Binario, default `false` (privacy by default) |
| Perfil público visible de no-amigo | Nickname + avatar + streak de ahorro + badges |
| Privacy granular (qué mostrar) | v1: on/off por ítem (streak, badges, bio) |
| Bloqueo | Sí, en MVP. Silencioso (el bloqueado no sabe que fue bloqueado) |
| Límite de amigos | No |
| Chat | 1:1 únicamente. Grupos: v2+ |
| Features de chat en MVP | Mensajes de texto + presence + typing + read receipts |
| Persistencia de mensajes | Permanente. Search en historial: v2 |
| Integración cobros/deudas | Interpretación A (liviana): `friend_id` nullable en `loans` y `debts`; cada user mantiene su registro independiente |
| Feed de actividad | Fuera de scope — nunca en este plan |
| Moderación | Report + block en MVP. Sin moderador humano |

### 2.2 Técnicas

| Decisión | Valor |
|---|---|
| Real-time | Supabase Realtime (channels + presence + broadcast). Full vendor lock-in aceptado |
| Web Push | Fuera de scope (v2). En MVP solo toasts + unread counters con pestaña abierta |
| Ruteo | Rutas dedicadas `/friends`, `/friends/:username`, `/chat`, `/chat/:userId` |
| Stack UI | Reutilizar shadcn + Radix existentes. No introducir libs nuevas |
| Validación forms | React Hook Form + Zod (patrón del repo) |
| Estado client | SWR para reads, `useState`/`useReducer` para chat local, Supabase Realtime para push updates |
| Generación de mockups | Usar Claude con modo de diseño (artifacts HTML) para validar pantallas nuevas ANTES de implementar. No adoptar sistema de diseño nuevo |
| ToS / Privacy Policy | Generar versiones mínimas con Claude al ejecutar Fase 0 |
| Migraciones | Numerar incrementales a partir de `012_*.sql`. Una por fase como mínimo |
| i18n | Todo copy en es-AR |

### 2.3 No negociable

- RLS activo en **toda** tabla nueva con policies `auth.uid() = user_id` (o equivalente simétrico para joins).
- Ningún dato financiero (transactions, goals, montos de loans/debts) es visible para otro user jamás, ni siquiera siendo amigo.
- `is_discoverable` default `false` al crear perfil social.
- Nunca exponer el `email` del user en queries accesibles a otros users.

---

## 3. Mapa de fases

| Fase | Nombre | Objetivo | Migración | Sprints aprox. |
|---|---|---|---|---|
| 0 | Compliance base | Export + delete + ToS/Privacy | 013 | 1 |
| 1 | Identity social base | Username + toggle discoverable + link invitación | 014 | 1 |
| 2 | Social graph | Tablas friendship/requests/blocks + UI hub `/friends` | 015 | 2 |
| 3 | Perfil público + stats | Ruta `/friends/:username` + privacy granular | 016 | 0.5 |
| 4 | Chat text-only | Conversations + messages + Realtime básico | 017 | 2 |
| 5 | Chat real-time UX | Presence + typing + read receipts | (sin migración) | 1 |
| 6 | Integración loans/debts | `friend_id` en tablas existentes + UI | 018 | 0.5 |

Total: ~8 sprints = ~3 meses de calendario al ritmo de fines de semana + algunas horas de semana.

---

## 4. Protocolo del agente

### 4.1 Workflow por fase

```
1. Leer contexto obligatorio de la fase
2. Fase 1 (Exploración) — solo lectura
3. Reportar hallazgos + plan de implementación
4. Esperar OK explícito
5. Implementar según plan aprobado
6. Sign-off: diff resumido + criterios de aceptación tildados + SQL pendiente de aplicar
7. Esperar confirmación
8. Commit atómico de la fase
9. Pasar a la siguiente fase SOLO si hay OK para arrancar
```

### 4.2 Reglas duras (cross-fase)

- **Un commit por fase** dentro del mismo PR. Mensaje: `feat(social): fase N — <nombre>`.
- **Migraciones SQL se generan en `scripts/`** pero **nunca se aplican automáticamente**. El owner las corre manual en Supabase SQL editor. El agente avisa en el sign-off qué archivo hay que correr.
- **NO tocar** `components/ui/`, `lib/changelog.ts`, `next.config.mjs`, migraciones existentes.
- **NO refactorizar** código existente salvo que la fase lo requiera explícitamente.
- **NO introducir dependencias nuevas** sin flag explícito en el reporte intermedio y aprobación.
- Seguir patrones del repo al pie: alias `@/`, `*-client.tsx`, `actions.ts`, kebab-case, copy es-AR.
- **Estados explícitos**: loading / error / empty. Si un componente depende de N cosas, las N cosas tienen estado loading.

### 4.3 Formato del reporte intermedio (cada fase)

```
## Fase N — Reporte intermedio

### Contexto leído
- [lista]

### Hallazgos de exploración
- [lista]

### Schema propuesto (con SQL exacto)

### Archivos a crear
| Path | Propósito |

### Archivos a modificar
| Path | Cambio puntual |

### RLS policies exactas

### UI / UX — decisiones clave
- [lista]

### Edge cases considerados
- [lista]

### Fuera de scope de ESTA fase (explícito)
- [lista]

### Dudas puntuales que necesitan decisión del owner
```

### 4.4 Formato del sign-off (cada fase)

```
## Fase N — Sign-off

### Criterios de aceptación
- [x] / [ ]

### Archivos creados / modificados
[diff resumido por archivo]

### SQL a correr manual
```sql
[copy-paste ready]
```

### Decisiones tomadas sin preguntar
[lista con justificación]

### Low entropy check
¿Un dev nuevo que cae en este código mañana entiende por qué está acá sin preguntar?
```

---

## 5. Fase 0 — Compliance base

### 5.1 Objetivo

Antes de abrir cualquier feature social, MFI tiene que tener tres cosas mínimas de compliance:

1. **Exportar mis datos** — endpoint que devuelve JSON con todo lo del user.
2. **Borrar mi cuenta** — endpoint que dispara un delete cascade completo.
3. **ToS y Privacy Policy** — páginas estáticas, aceptadas en el onboarding.

Sin esto, abrir chat + perfiles públicos + discovery es un problema legal (Ley 25.326 AR, y por si algún día se mete gente de EU, GDPR).

### 5.2 Dependencias

Ninguna. Es la primera fase.

### 5.3 Contexto obligatorio

- `app/(app)/settings/settings-client.tsx` — donde van a ir los botones "Exportar mis datos" / "Borrar mi cuenta"
- `lib/supabase/server.ts` — patrón de server actions
- `app/onboarding/` — para meter el checkbox de ToS
- `scripts/001_schema.sql` y siguientes — para entender qué tablas hay y armar el cascade
- `lib/types.ts` — interfaces del dominio

### 5.4 Schema

**Migración `013_add_compliance_fields.sql`**:

```sql
-- Campos de compliance en profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tos_accepted_at     TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at          TIMESTAMPTZ;

-- No hay tabla nueva, solo columnas en profiles.
-- RLS: policies existentes (auth.uid() = id) cubren las columnas nuevas.
```

**Delete cascade**: Supabase ya tiene `ON DELETE CASCADE` en la mayoría de FKs desde la migración 001. El agente verifica tabla por tabla en Fase 1 y si alguna FK no tiene cascade, la agrega en esta migración.

### 5.5 Archivos a crear

| Path | Propósito |
|---|---|
| `app/(app)/settings/export-data-action.ts` | Server action: query todas las tablas del user → ZIP/JSON → devuelve download URL |
| `app/(app)/settings/delete-account-action.ts` | Server action: marca `deleted_at` + dispara trigger de delete en cascade + signOut |
| `app/legal/tos/page.tsx` | Ruta pública con Términos y Condiciones (generado por Claude al ejecutar esta fase) |
| `app/legal/privacy/page.tsx` | Ruta pública con Política de Privacidad (generado por Claude) |
| `lib/legal-texts.ts` | Versionado de textos legales (`TOS_VERSION`, `PRIVACY_VERSION` + fecha) |

### 5.6 Archivos a modificar

| Path | Cambio puntual |
|---|---|
| `app/onboarding/page.tsx` | Agregar checkbox "Acepto ToS y Privacy Policy" (con links) antes de `completed = true`. Guardar `tos_accepted_at` y `privacy_accepted_at`. Onboarding bloqueado si no se tildan |
| `app/(app)/settings/settings-client.tsx` | Nueva card "Privacidad y datos" con dos botones: "Exportar mis datos" + "Borrar mi cuenta" (con confirmación doble) |
| `lib/types.ts` | Agregar `tos_accepted_at`, `privacy_accepted_at`, `deleted_at` a `Profile` |

### 5.7 UI / UX

- **Exportar**: click → loading → download de `mfi-export-<timestamp>.json` con shape:
  ```json
  {
    "exported_at": "2026-04-20T12:00:00Z",
    "profile": { ... },
    "transactions": [ ... ],
    "goals": [ ... ],
    "notifications": [ ... ],
    ...todas las tablas del user
  }
  ```
- **Borrar cuenta**: modal doble confirmación. Primer modal: "¿Seguro?". Segundo modal: input "Escribí BORRAR MI CUENTA" + botón destructive. Después del delete, `supabase.auth.signOut()` + redirect a `/auth/login` + toast "Tu cuenta fue eliminada".
- **ToS/Privacy**: textos en es-AR, usables pero minimalistas. Claude los genera al ejecutar la fase. Claramente versionados (`v1.0` + fecha) para que si cambian, el user tenga que re-aceptar.
- **Users existentes** (pre-fase 0): al próximo login, modal obligatorio "Actualizamos nuestros términos — aceptá para continuar". No se puede saltear.

### 5.8 ✅ Criterios de aceptación

- [ ] Migración 013 generada, NO aplicada (el owner la corre manual).
- [ ] Export funciona: descarga JSON con todos los datos del user.
- [ ] Delete funciona: borra cascade todo, signOut, redirect.
- [ ] ToS y Privacy accesibles en `/legal/tos` y `/legal/privacy` sin auth.
- [ ] Onboarding bloquea si no se aceptan los términos.
- [ ] Users existentes reciben modal de re-acceptance al próximo login.
- [ ] Todos los textos en es-AR.

### 5.9 Dudas que necesitan decisión del owner antes de arrancar

- ¿Hard delete (borrado real) o soft delete (marcar `deleted_at` y mantener la data 30 días por si se arrepiente)? **Recomendación**: soft delete con cron que hard-deletea a los 30 días. Pero cron requiere Edge Function — si querés simplificar, hard delete directo.
- ¿ToS y Privacy los genera Claude durante la fase, o el owner los provee? **Recomendación**: Claude los genera y el owner los revisa antes de hacer el commit.

---

## 6. Fase 1 — Identity social base

### 6.1 Objetivo

Agregar identidad social pública a los users:

- `username` único global.
- Toggle `is_discoverable` (default `false`).
- Link de invitación `mfi.app/add/:username` (ruta pública, previsualiza al perfil público + botón "Agregar como amigo" que requiere login).

Nadie puede agregar a nadie todavía — eso es Fase 2. Esta fase deja la base.

### 6.2 Dependencias

Fase 0 completa.

### 6.3 Contexto obligatorio

- `app/onboarding/page.tsx` — meter paso de elección de username
- `app/(app)/settings/settings-client.tsx` — card "Perfil social"
- `lib/types.ts` — extender `Profile`
- `scripts/001_schema.sql` — entender `profiles` actual

### 6.4 Schema

**Migración `014_add_social_identity.sql`**:

```sql
-- Username único, case-insensitive
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username             TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username_changed_at  TIMESTAMPTZ;  -- NULL en onboarding, NOW() en cambios posteriores. Ver 6.11
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_discoverable      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio                  TEXT;

-- Constraint: username válido (3-20 chars, lowercase alfanumérico + underscore)
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format
  CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$');

-- Unicidad case-insensitive
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique
  ON public.profiles (LOWER(username));

-- RLS adicional: cualquiera puede leer username + avatar + bio + discoverable=true
-- Ver sección 6.6 para el detalle.
```

### 6.5 RLS adicional

Hoy `profiles` tiene RLS con `auth.uid() = id`. Con la feature social, tiene que ser posible leer el perfil de **otros** users bajo ciertas condiciones. La nueva policy:

```sql
-- Policy: select público de campos públicos si is_discoverable = true
-- Idea: permitimos SELECT sobre profiles a cualquier authenticated user,
-- pero los clients sólo deben seleccionar los campos públicos.
-- Para evitar leaks, armamos una VIEW pública.

CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  id,
  username,
  nickname,
  avatar_url,
  bio,
  is_discoverable,
  created_at
FROM public.profiles
WHERE is_discoverable = TRUE OR id = auth.uid();

-- La view hereda RLS de la tabla, pero filtra columnas sensibles.
-- Los clients usan esta view para lookups de otros users.
GRANT SELECT ON public.profiles_public TO authenticated;
```

### 6.6 Archivos a crear

| Path | Propósito |
|---|---|
| `app/add/[username]/page.tsx` | Ruta PÚBLICA (sin auth). Preview del perfil público + CTA "Iniciá sesión para agregar a @username" |
| `app/(app)/settings/username-picker.tsx` | Componente client: input con validación (regex + availability check debounced) |
| `app/(app)/settings/username-action.ts` | Server action: `setUsername(newUsername)` con check de unicidad |
| `lib/social/validate-username.ts` | Pure: valida regex + longitud + palabras reservadas (`admin`, `mfi`, `api`, etc.) |

### 6.7 Archivos a modificar

| Path | Cambio puntual |
|---|---|
| `app/onboarding/page.tsx` | Nuevo paso "Elegí tu username" después del nickname. Obligatorio (no se puede saltear) |
| `app/(app)/settings/settings-client.tsx` | Nueva card "Perfil social" con: input username (editable), toggle `is_discoverable`, textarea bio (opcional, max 160 chars), link de invitación copiable |
| `lib/types.ts` | Agregar `username: string \| null`, `is_discoverable: boolean`, `bio: string \| null` a `Profile` + crear interfaz `PublicProfile` para la view |

### 6.8 UI / UX

- **Onboarding**: paso nuevo entre "Nickname" y "Moneda preferida". Input con placeholder "joaquim_colacilli" + helper "3-20 caracteres, letras, números y guión bajo". Mientras tipea, debounced check de disponibilidad → ícono ✓/✗ a la derecha.
- **Settings**: la card "Perfil social" tiene su propio botón "Guardar" (no está atado al de Perfil — siguiendo el fix que hicimos en el ticket anterior).
- **Toggle `is_discoverable`**: acompañado de texto explicativo: "Si lo activás, cualquiera puede encontrarte buscando tu username y enviarte solicitudes de amistad. Si lo desactivás, solo te podés agregar mediante link directo."
- **Link de invitación**: `<app-url>/add/{username}`. Botón "Copiar" + "Compartir" (si está disponible `navigator.share`).
- **Ruta pública `/add/:username`**: si el username no existe → 404 con mensaje "Este usuario no existe o no permite ser encontrado". Si existe pero `is_discoverable=false` y el viewer no está autenticado → mismo 404 (no filtrar existencia). Si existe y es encontrable → preview: avatar + nickname + @username + bio + CTA.

### 6.9 Lista de palabras reservadas

Bloquear estos usernames:
```
admin, administrator, mfi, api, www, root, help, support, contact, legal, tos, privacy, about, login, signup, auth, dashboard, settings, onboarding, add, friends, chat, blog, news, docs, staff, team, official
```

Mantener la lista en `lib/social/reserved-usernames.ts` como export para fácil extensión.

### 6.10 ✅ Criterios de aceptación

- [ ] Migración 014 generada.
- [ ] Users nuevos eligen username en onboarding (obligatorio).
- [ ] Users existentes reciben modal obligatorio "Elegí tu username" al próximo login.
- [ ] Username validado: regex, longitud, unicidad case-insensitive, palabras reservadas.
- [ ] Toggle `is_discoverable` funciona, default `false`.
- [ ] Ruta pública `/add/:username` muestra preview o 404 según corresponda.
- [ ] `profiles_public` view creada, accesible a authenticated users.
- [ ] No hay leak de campos sensibles (email, etc.) desde la view.

### 6.11 Decisiones tomadas sin necesidad de preguntar

- `username` es inmutable después de setearlo: **FALSO**, es editable desde Settings.
- **Rate limit de cambio de username (decidido por owner)**: máximo **1 cambio cada 30 días** por user. Frena squatting/abuso sin bloquear cambios legítimos.
  - Se enforced con una columna nueva `profiles.username_changed_at TIMESTAMPTZ`, set en cada cambio (incluyendo el primer set en onboarding — opcional, alternativa: dejar NULL en el set inicial y solo setear en cambios posteriores; **decisión: NULL en onboarding, NOW() solo en cambios posteriores**, para no penalizar al user que tipeó mal en onboarding y quiere arreglarlo en el primer login).
  - El server action `setUsername` chequea `username_changed_at IS NULL OR NOW() - username_changed_at >= INTERVAL '30 days'` antes de aceptar el cambio. Si rechaza, retorna error con mensaje "Podés cambiar tu username el {fecha}" en es-AR.
  - La migración 014 agrega esta columna en el mismo ALTER que `username` y `is_discoverable`.
  - `username_history` (tabla de historial) y redirect del link viejo siguen siendo v2.
- Al cambiar un username, el link viejo `/add/old_name` devuelve 404 (no redirect). Mantiene simpleza.

---

## 7. Fase 2 — Social graph

### 7.1 Objetivo

Sistema completo de amistad: request → accept/reject → lista de amigos → remove → block.

### 7.2 Dependencias

Fases 0 y 1 completas.

### 7.3 Contexto obligatorio

- `lib/supabase/server.ts` y `client.ts`
- `components/app-topbar.tsx` y `components/mfi-shell.tsx` (para los íconos nuevos)
- Todo lo generado en Fase 1

### 7.4 Schema

**Migración `015_social_graph.sql`**:

```sql
-- ============================================================
-- Tabla: friend_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT friend_requests_no_self CHECK (sender_id <> receiver_id),
  CONSTRAINT friend_requests_unique_pending UNIQUE (sender_id, receiver_id, status)
    -- Nota: UNIQUE con status='pending' se refuerza con índice parcial abajo
);

-- Solo una request pendiente simultánea entre dos users (en cualquier dirección).
-- Índice parcial para enforcing en DB:
CREATE UNIQUE INDEX IF NOT EXISTS friend_requests_no_dup_pending
  ON public.friend_requests (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id))
  WHERE status = 'pending';

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- RLS: el user ve requests donde es sender o receiver
CREATE POLICY "friend_requests_select" ON public.friend_requests
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- INSERT: solo el sender puede crear (sender_id = auth.uid())
CREATE POLICY "friend_requests_insert" ON public.friend_requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- UPDATE: el receiver puede cambiar status a accepted/rejected. El sender puede cancelar.
CREATE POLICY "friend_requests_update" ON public.friend_requests
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- DELETE: el sender puede borrar una request propia (cleanup opcional)
CREATE POLICY "friend_requests_delete" ON public.friend_requests
  FOR DELETE USING (auth.uid() = sender_id);

-- ============================================================
-- Tabla: friendships
-- ============================================================
-- Almacena la amistad CONSUMADA (simétrica).
-- Convención: user_a_id < user_b_id siempre (orden canónico).
CREATE TABLE IF NOT EXISTS public.friendships (
  user_a_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_a_id, user_b_id),
  CONSTRAINT friendships_canonical_order CHECK (user_a_id < user_b_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- RLS: ambos lados de la friendship pueden leer
CREATE POLICY "friendships_select" ON public.friendships
  FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- INSERT: solo se inserta vía server action al aceptar una request (usando service role).
-- No hay policy de INSERT para authenticated. Los clients no insertan directo.

-- DELETE: cualquiera de los dos puede eliminar la friendship
CREATE POLICY "friendships_delete" ON public.friendships
  FOR DELETE USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- ============================================================
-- Tabla: blocks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.blocks (
  blocker_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT blocks_no_self CHECK (blocker_id <> blocked_id)
);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- RLS: solo el blocker lee/escribe
CREATE POLICY "blocks_all" ON public.blocks
  FOR ALL USING (auth.uid() = blocker_id);
```

### 7.5 Server actions

**Archivo nuevo**: `app/(app)/friends/actions.ts`

```typescript
'use server'

// Todas devuelven { ok: true } | { ok: false, error: string }
// Las que llevan receiver/target chequean bloqueos bidireccionales antes.

export async function sendFriendRequest(targetUsername: string): Promise<Result>
export async function acceptFriendRequest(requestId: string): Promise<Result>
export async function rejectFriendRequest(requestId: string): Promise<Result>
export async function cancelFriendRequest(requestId: string): Promise<Result>
export async function removeFriend(friendId: string): Promise<Result>
export async function blockUser(targetId: string): Promise<Result>
export async function unblockUser(targetId: string): Promise<Result>
```

**Lógica crítica del `acceptFriendRequest`**:

1. Verificar que `request.receiver_id === auth.uid()`.
2. Verificar que `status === 'pending'`.
3. En una transacción:
   - UPDATE request a `accepted`.
   - INSERT en `friendships` con orden canónico (`LEAST`/`GREATEST`).
4. Si falla cualquiera, rollback.
5. Retornar ok.

Como los clients no tienen INSERT policy sobre `friendships`, este action corre con `SUPABASE_SERVICE_ROLE_KEY` **solo en el server action** (nunca en el client).

### 7.6 Archivos a crear

| Path | Propósito |
|---|---|
| `app/(app)/friends/page.tsx` | Server component: fetch lista de amigos + requests pendientes + sugerencias |
| `app/(app)/friends/friends-client.tsx` | Client: tabs "Amigos \| Solicitudes \| Buscar" |
| `app/(app)/friends/actions.ts` | Server actions (ver 7.5) |
| `lib/social/friendships.ts` | Helpers puros: `canonicalOrder(a,b)`, `isFriends(a,b)`, `isBlocked(a,b)` |
| `components/friend-request-button.tsx` | Botón con estados: `send`, `pending`, `friends`, `blocked` |

### 7.7 Archivos a modificar

| Path | Cambio puntual |
|---|---|
| `components/app-topbar.tsx` | Nuevo ícono `Users` con badge de requests pendientes. Link a `/friends`. Posición: entre `ArDatos` y `Weather` (o donde el flow visual cierre mejor) |
| `components/mfi-shell.tsx` | Mismo ícono replicado |
| `components/nav.tsx` | Link "Amigos" en `DesktopSidebar` + `MobileBottomNav` |
| `app/add/[username]/page.tsx` | Agregar CTA "Enviar solicitud" (si authenticated) / "Iniciá sesión" (si no) |

### 7.8 UI / UX

- **Tab Amigos**: grid responsive de cards. Cada card: avatar, `@username`, nickname, botón `•••` con opciones (Ver perfil / Enviar mensaje [disabled hasta fase 4] / Eliminar / Bloquear).
- **Tab Solicitudes**: dos sub-secciones: "Recibidas" (con botones Aceptar / Rechazar) y "Enviadas" (con botón Cancelar).
- **Tab Buscar**: input con search por `@username` exacto. Resultados: card de perfil público + botón `FriendRequestButton` que muestra estado correcto.
- **Empty states**: dibujitos + copy simpático. "Todavía no agregaste a nadie. Buscá por username o compartí tu link de invitación."
- **Toasts** en cada acción (send / accept / reject / remove / block).

### 7.9 Edge cases a manejar

- A envía request a B. B bloquea a A. La request se elimina automáticamente (trigger DB o cleanup en `blockUser` action).
- A ya es amigo de B. A no puede enviar otra request (UI lo bloquea + DB lo rechaza).
- A bloquea a B. A no ve a B en ninguna query (friends list, search, perfil). B tampoco ve a A. Bloqueo silencioso.
- A remove a B de amigos. Las friendship se borra, pero no bloquea — pueden re-enviarse request.
- Username changes: si B cambia su username, A sigue viendo a B en su friends list (la friendship es por UUID, no por username).

### 7.10 ✅ Criterios de aceptación

- [ ] Migración 015 generada.
- [ ] Todas las tablas con RLS activa y policies correctas.
- [ ] Server actions cubren los 8 verbos listados en 7.5.
- [ ] `/friends` renderiza los 3 tabs.
- [ ] Badge de requests pendientes en topbar funciona y se actualiza después de accept/reject.
- [ ] Todos los edge cases de 7.9 cubiertos con tests manuales documentados.
- [ ] Bloqueo silencioso: el bloqueado no ve al blocker en ninguna query.

### 7.11 Dudas que necesitan decisión del owner

- ¿Mostrar "sugerencias de amigos" en el tab Amigos (friends of friends)? **Recomendación**: no en MVP. Agrega complejidad (privacy: ¿un user quiere que sus amigos vean su lista?) y no es crítico.
- ¿Notificar al receiver cuando le llega una request? **Recomendación**: sí, vía la tabla `notifications` existente. Tipo `friend_request_received`. Badge en bell + entrada en dropdown.

---

## 8. Fase 3 — Perfil público + stats

### 8.1 Objetivo

Ruta `/friends/:username` con el perfil público completo del user + privacy granular sobre qué exponer.

### 8.2 Dependencias

Fases 0, 1, 2.

### 8.3 Contexto obligatorio

- `lib/investment-streak.ts` — cómo se calcula el streak actual
- Badges (si existen) — localizar dónde se definen
- `profiles_public` view de Fase 1

### 8.4 Schema

**Migración `016_profile_privacy.sql`**:

```sql
-- Flags granulares de privacidad: qué mostrar en el perfil público
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_streak   BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_badges   BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_bio      BOOLEAN NOT NULL DEFAULT TRUE;

-- Recrear profiles_public con los flags aplicados
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public AS
SELECT
  id,
  username,
  nickname,
  avatar_url,
  CASE WHEN show_bio      THEN bio      ELSE NULL END AS bio,
  show_streak,
  show_badges,
  is_discoverable,
  created_at
FROM public.profiles
WHERE is_discoverable = TRUE OR id = auth.uid();

GRANT SELECT ON public.profiles_public TO authenticated;
```

### 8.5 Archivos a crear

| Path | Propósito |
|---|---|
| `app/(app)/friends/[username]/page.tsx` | Server component: fetch perfil público + streak + badges (respetando flags) |
| `app/(app)/friends/[username]/profile-client.tsx` | Client: layout del perfil + botones Agregar/Mensaje/Bloquear según relationship state |
| `lib/social/public-stats.ts` | Helpers: `getPublicStreak(userId)`, `getPublicBadges(userId)` — respetan flags server-side |

### 8.6 Archivos a modificar

| Path | Cambio puntual |
|---|---|
| `app/(app)/settings/settings-client.tsx` | Card "Privacidad del perfil público" con 3 toggles (`show_streak`, `show_badges`, `show_bio`). Guarda junto al resto del perfil social |
| `lib/types.ts` | Agregar 3 flags a `Profile` |

### 8.7 UI / UX

- **Layout del perfil**: header con avatar grande + nickname + `@username` + bio (si `show_bio`). Debajo: stats cards (streak, badges) según flags. Al costado derecho (desktop) o arriba (mobile): card con estado de relación + botones CTA.
- **Relationship state → botón CTA**:
  - Stranger: "Enviar solicitud de amistad"
  - Request sent: "Solicitud enviada" (disabled) + "Cancelar"
  - Request received: "Aceptar" + "Rechazar"
  - Friends: "Enviar mensaje" [disabled hasta Fase 4] + menú `•••` (Eliminar / Bloquear)
  - Blocked (por mí): "Desbloquear"
  - Blocked (por el otro): 404 (bloqueo silencioso)
- **Stats nunca incluyen montos**. Streak = "15 días de inversión consecutivos". Badges = "🎯 Metita completa", etc. Nada más.

### 8.8 ✅ Criterios de aceptación

- [ ] Migración 016 generada.
- [ ] `profiles_public` view actualizada con flags aplicados.
- [ ] Ruta `/friends/:username` funciona con todos los relationship states.
- [ ] Los 3 toggles en Settings persisten y afectan el perfil público.
- [ ] Si `show_streak=false`, el streak no se expone ni siquiera al inspector de red.
- [ ] Bloqueo silencioso se respeta (blocked viewer recibe 404).

---

## 9. Fase 4 — Chat text-only

### 9.1 Objetivo

Chat 1:1 funcional con mensajes de texto y actualización real-time vía Supabase Realtime. Sin adornos (sin typing, sin presence, sin read receipts — eso es Fase 5).

### 9.2 Dependencias

Fases 0–3.

### 9.3 Contexto obligatorio

- Documentación oficial de Supabase Realtime sobre `postgres_changes`
- `hooks/use-polling.ts` — para entender patrones de subscripciones
- `lib/supabase/client.ts` y `server.ts`
- Fases previas

### 9.4 Schema

**Migración `017_chat.sql`**:

```sql
-- ============================================================
-- conversations: una fila por par de users (1:1).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT conversations_canonical_order CHECK (user_a_id < user_b_id),
  CONSTRAINT conversations_unique_pair UNIQUE (user_a_id, user_b_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select" ON public.conversations
  FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- INSERT: solo vía server action (valida que sean amigos antes).

CREATE INDEX IF NOT EXISTS conversations_user_a_idx ON public.conversations (user_a_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversations_user_b_idx ON public.conversations (user_b_id, last_message_at DESC);

-- ============================================================
-- messages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body            TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 4000),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,   -- soft delete del sender
  edited_at       TIMESTAMPTZ    -- para v2
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- SELECT: si el user es parte de la conversation
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (auth.uid() = c.user_a_id OR auth.uid() = c.user_b_id)
    )
  );

-- INSERT: solo el sender puede insertar, y tiene que ser parte de la conversation
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (auth.uid() = c.user_a_id OR auth.uid() = c.user_b_id)
    )
  );

-- UPDATE: el sender puede marcar deleted_at (soft delete) de su propio mensaje
CREATE POLICY "messages_update_own" ON public.messages
  FOR UPDATE USING (auth.uid() = sender_id);

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON public.messages (conversation_id, created_at DESC);

-- ============================================================
-- Trigger: update conversations.last_message_at al insertar un mensaje
-- ============================================================
CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER messages_bump_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_last_message();

-- ============================================================
-- Realtime: habilitar publicación para ambas tablas
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
```

### 9.5 Server actions

**Archivo nuevo**: `app/(app)/chat/actions.ts`

```typescript
'use server'

// Crea la conversation si no existe (debe haber amistad)
export async function ensureConversation(withUserId: string): Promise<{ conversationId: string }>

// Envía un mensaje. Valida amistad + no-bloqueo antes.
export async function sendMessage(conversationId: string, body: string): Promise<Message>

// Soft delete de un mensaje propio
export async function deleteMessage(messageId: string): Promise<Result>
```

### 9.6 Archivos a crear

| Path | Propósito |
|---|---|
| `app/(app)/chat/page.tsx` | Server component: lista de conversations del user ordenadas por `last_message_at desc` |
| `app/(app)/chat/chat-inbox-client.tsx` | Client: lista de conversations + search por nickname |
| `app/(app)/chat/[userId]/page.tsx` | Server component: fetch conversation + primeros 50 mensajes |
| `app/(app)/chat/[userId]/conversation-client.tsx` | Client: vista de conversación + Realtime subscription + input |
| `app/(app)/chat/actions.ts` | Server actions (ver 9.5) |
| `hooks/use-messages.ts` | Hook: SWR para mensajes iniciales + Realtime subscription para nuevos |
| `lib/social/chat.ts` | Helpers: `getOrCreateConversation`, `canSendMessage(senderId, receiverId)` |

### 9.7 Archivos a modificar

| Path | Cambio puntual |
|---|---|
| `components/app-topbar.tsx` | Ícono `MessageCircle` con badge de mensajes no leídos (calculado del `notifications` + Realtime) |
| `components/mfi-shell.tsx` | Mismo |
| `components/nav.tsx` | Link "Mensajes" en sidebar/bottom nav |
| `app/(app)/friends/[username]/profile-client.tsx` | Habilitar botón "Enviar mensaje" (deshabilitado en Fase 3) → navega a `/chat/:userId` |

### 9.8 UI / UX

**`/chat` (inbox)**:
- Lista vertical de conversations. Cada item: avatar + nickname + último mensaje (truncado) + timestamp relativo ("hace 3m").
- Ordenadas por `last_message_at desc`. Conversations sin mensajes no aparecen.
- Empty state: "Todavía no hay conversaciones. Entrá al perfil de un amigo y enviale un mensaje."

**`/chat/:userId` (conversación)**:
- Header: avatar pequeño + nickname + `@username` (link al perfil). Back button en mobile.
- Feed: burbujas de mensajes. Mensajes propios alineados a la derecha (fondo primario), del otro a la izquierda (fondo muted).
- Agrupación por día (separador "Hoy", "Ayer", "15 de abril").
- Input fijo abajo: textarea auto-grow + botón enviar (Enter para enviar, Shift+Enter para nueva línea).
- Scroll infinito hacia atrás al llegar al top (carga 50 más).
- Nuevos mensajes entran por Realtime → scroll automático al bottom si ya estaba ahí.

**Realtime pattern (crítico)**:
```typescript
// En conversation-client.tsx
useEffect(() => {
  const channel = supabase.channel(`conversation:${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => {
      // Optimistic: ignorar si el mensaje ya está en el state (echo propio)
      setMessages(prev => dedupById([...prev, payload.new as Message]))
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [conversationId])
```

### 9.9 Edge cases

- Envío mientras el otro está en la misma conversation → Realtime lo empuja inmediatamente a ambos lados.
- Envío con la pestaña cerrada del otro → sin push (es Fase 6 que no hacemos). El mensaje queda guardado, el otro lo ve al abrir.
- Mensaje en flight cuando A bloquea a B → el server action rechaza el INSERT (chequea bloqueo antes).
- Conversation sin amistad (amistad removida) → `canSendMessage` devuelve false, botón de enviar deshabilitado con tooltip "Ya no son amigos".
- Mensajes largos (>4000 chars) → el textarea tiene maxLength + contador visible cerca del límite.
- Spam: rate limit de 10 mensajes/minuto por user (enforced en el server action con una query a `messages` del último minuto).

### 9.10 Unread counters

Para el badge en el topbar:
- Agregar columna `last_read_at` en `conversations` **por user** — necesita desdoblar en dos campos (`user_a_last_read_at`, `user_b_last_read_at`) o una tabla aparte `conversation_reads`. 
- **Decisión**: dos columnas en `conversations` (simpler, menos JOINs). Agregarlas en la misma migración 016.
- Unread count = `SELECT count(*) FROM messages WHERE conversation_id=... AND created_at > my_last_read_at AND sender_id != auth.uid()`.

**Ajuste a la migración 017**: agregar a `conversations`:
```sql
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS user_a_last_read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS user_b_last_read_at TIMESTAMPTZ;
```

Y un server action `markConversationRead(conversationId)` que actualiza el campo correspondiente al viewer.

### 9.11 ✅ Criterios de aceptación

- [ ] Migración 017 generada (tablas + triggers + publicación Realtime + campos de last_read).
- [ ] `/chat` muestra conversations ordenadas por actividad.
- [ ] `/chat/:userId` permite enviar y recibir mensajes en real-time (abrir dos ventanas, verificar).
- [ ] Scroll infinito funciona hacia atrás.
- [ ] Rate limit de 10 msg/min funciona.
- [ ] Soft delete de mensaje propio aparece como "Mensaje eliminado" en ambos lados.
- [ ] Unread counter en topbar se actualiza en real-time.
- [ ] Bloqueo silencioso: mensajes enviados a un bloqueador fallan silenciosamente; no aparece el botón de chat hacia un bloqueado.

### 9.12 Dudas que necesitan decisión del owner

- ¿Permitir enviar mensajes a un **ex-amigo** (relación terminada pero había chat previo)? **Recomendación**: no — al eliminar amistad, el botón de chat se deshabilita. La conversation existente se mantiene visible read-only. Evita harassment post-unfriend.

---

## 10. Fase 5 — Chat real-time UX

### 10.1 Objetivo

Agregar presence, typing indicator y read receipts al chat de Fase 4.

### 10.2 Dependencias

Fase 4 completa.

### 10.3 Contexto obligatorio

- Doc de Supabase Presence y Broadcast
- Fase 4 (conversation-client.tsx en particular)

### 10.4 Schema

Sin migración nueva — todo lo de Fase 5 usa Broadcast (ephemeral) o campos ya existentes.

**Ajuste menor** (puede ir en migración 017 si no se aplicó aún, o en una 017b): agregar en `messages`:
```sql
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
```

Para read receipts. Updated cuando el receiver abre la conversation.

### 10.5 Implementación

**Presence** (online/offline/ausente):
- Cada `conversation-client.tsx` se une a un channel Presence general del user: `presence:user:${userId}`.
- El topbar y la inbox listen a los presences de los amigos y muestran dot verde/gris.
- `last_seen_at` almacenado en `profiles` (columna nueva, migración separada si no cabe en 017).

**Typing indicator**:
- Broadcast channel por conversation: `typing:${conversationId}`.
- On input change (debounced 500ms), enviar `{ typing: true }` al channel.
- Después de 3 segundos sin updates, inferir stopped typing.
- Mostrar "@username está escribiendo..." debajo del último mensaje del otro.

**Read receipts**:
- Al abrir la conversation, `markMessagesRead(conversationId)` actualiza `read_at = NOW()` de todos los mensajes unread del otro.
- En la UI, los mensajes propios leídos muestran doble tilde. Unread: un tilde.

### 10.6 ✅ Criterios de aceptación

- [ ] Dot de presence en avatar de amigos (friends list, chat inbox, conversation header).
- [ ] Typing indicator funciona en tiempo real.
- [ ] Read receipts (doble tilde) se actualizan en tiempo real.
- [ ] Todo tolera reconexiones: si el channel cae, reconecta transparentemente.

---

## 11. Fase 6 — Integración con loans/debts

### 11.1 Objetivo

Vincular cobros y deudas existentes a un amigo (opcional). Cuando se salda, se sincroniza el estado en ambos lados.

### 11.2 Dependencias

Fases 0–5 (solo necesita 0–2 estrictamente, pero se deja al final para no mezclar).

### 11.3 Contexto obligatorio

- Schema actual de `loans` y `debts` (buscar en migraciones)
- `components/pending-loans.tsx` y `pending-debts.tsx`
- Fases 1 y 2

### 11.4 Schema

**Migración `019_loans_debts_friend.sql`**:

```sql
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS friend_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS linked_debt_id   UUID REFERENCES public.debts(id) ON DELETE SET NULL;

ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS friend_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS linked_loan_id   UUID REFERENCES public.loans(id) ON DELETE SET NULL;

-- linked_*_id: referencia CROSS-TABLE al registro contrapartida del otro lado.
-- Cuando A crea un loan vinculado al amigo B, al aceptarlo B se crea un debt en su lado.
-- Resultado:
--   loans.linked_debt_id (lado A)  → apunta al id del debt en el lado B
--   debts.linked_loan_id (lado B)  → apunta al id del loan en el lado A
-- Naming = "el id de la tabla a la que apunto", no "mi propio tipo".
-- Sin cifrar: ambos campos son UUIDs FK estructurales, no PII.

-- RLS: las policies existentes con auth.uid() = user_id siguen aplicando.
-- El friend_id es informativo para el dueño del registro.
```

### 11.5 Server actions

**Archivo nuevo**: `app/(app)/loans/social-actions.ts` (o extendiendo el actions.ts existente):

```typescript
'use server'

// Al crear un loan con friend_id, opcionalmente notifica al amigo para que cree su debt contrapartida
export async function createLoanWithFriend(data: { ... , friendId?: string, notifyFriend?: boolean }): Promise<Loan>

// Cuando B acepta la solicitud, se crea el debt en su lado y se linkea
export async function acceptLinkedLoan(notificationId: string): Promise<Debt>

// Al saldar, propaga el estado al linked
export async function settleLoan(loanId: string): Promise<void>
```

### 11.6 UI / UX

- **Al crear cobro/deuda**: nuevo campo opcional "Asignar a un amigo" (dropdown con amigos). Si se elige, checkbox "Notificar a @amigo para que confirme".
- **Notificación al amigo**: entrada en `notifications` tipo `friend_loan_request` con CTA Aceptar/Rechazar. Si acepta, se crea el debt contrapartida en su lado, linkeado al loan del otro.
- **Al saldar**: si el registro tiene `linked_*_id`, el settle se propaga (opcional, con confirmación: "¿Marcar también como saldado en el lado de @amigo?").
- **Perfil del amigo** (`/friends/:username`): nueva tab "Cuentas abiertas" que lista loans/debts mutuos **resumidos** (solo cantidad, nunca montos del amigo — solo los del viewer).

### 11.7 ✅ Criterios de aceptación

- [ ] Migración 019 generada.
- [ ] Crear loan/debt con `friend_id` funciona.
- [ ] Notificación al amigo + aceptación + creación de contrapartida + link bidireccional.
- [ ] Saldar propaga al lado linkeado con confirmación.
- [ ] Tab "Cuentas abiertas" en perfil de amigo.
- [ ] Nunca se exponen montos del amigo.

---

## 12. Schema SQL consolidado (referencia rápida)

Resumen de todas las migraciones que genera este plan. **No es el archivo a correr** — cada migración va en su propio archivo numerado.

```
013 — Compliance:
   profiles + (tos_accepted_at, privacy_accepted_at, deleted_at)

014 — Identity social:
   profiles + (username, username_changed_at, is_discoverable, bio)
   view profiles_public
   unique index username lower, constraint formato

015 — Social graph:
   table friend_requests (sender, receiver, status)
   table friendships (canonical order)
   table blocks (blocker, blocked)
   RLS + policies

016 — Privacy granular:
   profiles + (show_streak, show_badges, show_bio)
   recreate profiles_public con flags

017 — Chat:
   table conversations (canonical order, last_message_at, last_read_at per user)
   table messages (body, sender, soft delete)
   trigger bump_conversation_last_message
   ALTER PUBLICATION supabase_realtime
   (bloque 11 post-debug) policy profiles_select_discoverable_or_friends

018 — Chat presence (Fase 5):
   messages + (read_at)                  -- read receipts granulares ✓✓
   profiles + (last_seen_at)             -- heartbeat para presence derivada
   RPC touch_last_seen()                 -- heartbeat 60s
   RPC mark_conversation_read (extendida para batch-update messages.read_at)

019 — Loans/Debts social:
   loans + (friend_id, linked_debt_id)   -- linked_debt_id apunta cross-table al debt contrapartida
   debts + (friend_id, linked_loan_id)   -- linked_loan_id apunta cross-table al loan contrapartida
```

---

## 13. Gotchas generales (cross-fase)

Estos son errores que un agente típicamente comete en features de este tipo. Tenerlos en cabeza durante toda la implementación.

### 13.1 RLS con JOINs
Las policies que hacen `EXISTS (SELECT ... FROM otra_tabla)` se evalúan una vez por fila. En tablas grandes (messages), esto puede ser lento. Índices correctos en FKs son obligatorios. Si una query se pone lenta, crear índice compuesto ANTES de complicar la policy.

### 13.2 Canonical order en pares
Toda tabla que represente una relación simétrica (friendships, conversations, blocks opcionalmente) usa **user_a_id < user_b_id** como orden canónico. Esto garantiza que no haya duplicados invertidos. Siempre que se haga un lookup, ordenar primero.

Helper: `lib/social/canonical-pair.ts`:
```typescript
export function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}
```

### 13.3 Realtime subscriptions: cleanup estricto
Toda subscription hecha en `useEffect` tiene que tener cleanup (`removeChannel`). Si no, las conexiones se acumulan y el browser eventualmente las limita. Además, el dependency array del useEffect tiene que incluir todo lo que usa (conversationId típicamente).

### 13.4 Bloqueo silencioso es costoso
Cada query sobre users/profiles/messages/friendships tiene que filtrar a los bloqueados **en ambas direcciones**. Un user que me bloqueó tampoco aparece para mí. Implementar un helper `filterBlocked(query, viewerId)` y usarlo consistentemente.

Preferible: crear una view o function `visible_profiles_for(viewer_id)` que ya filtre. Evita el gotcha de olvidarse en una query.

### 13.5 Service role vs authenticated
Server actions que necesiten saltar RLS (ej: `acceptFriendRequest` insertando en friendships) usan `SUPABASE_SERVICE_ROLE_KEY`. **Nunca** exponer esa key al cliente. Crear un helper `createAdminClient()` en `lib/supabase/admin.ts` y usarlo solo en server actions.

### 13.6 Username case-insensitive
Lookups por username siempre `LOWER(username) = LOWER($1)`. El almacenamiento es lowercase enforced por el CHECK constraint, pero el lookup es defensivo.

### 13.7 Copy es-AR consistente
Algunos términos que se repiten, fijar traducción para toda la feature:
- Friend request → **Solicitud de amistad**
- Accept / Reject → **Aceptar** / **Rechazar**
- Block / Unblock → **Bloquear** / **Desbloquear**
- Remove friend → **Eliminar de amigos**
- Online / Offline → **En línea** / **Desconectado**
- Typing → **Escribiendo...**
- Read receipt (doble tilde) → ✓✓ (sin palabra)
- Unread → **Sin leer**
- Unfriend → **Eliminar** (no "desamigar")

### 13.8 Privacy-first en server components
Todo server component que renderice datos de otro user **debe** usar `profiles_public` (la view) o explicitar los campos en el SELECT. Nunca `select('*')` de profiles para otro user — garantiza que si se agrega una columna sensible, no se filtre por accidente.

### 13.9 Mobile 360px
El flow de agregar amigo + chat tiene que funcionar a 360px. Priorizar testing mobile desde Fase 2. Para el chat específicamente, el input + botón enviar no pueden tapar mensajes.

### 13.10 Re-render storms en inbox y chat
Una conversation activa genera un Realtime event por mensaje → si el inbox está abierto en otra tab y escucha todos los conversation updates, puede generar re-renders innecesarios. Debounce las actualizaciones de last_message_at si aparece lag.

### 13.11 RLS de `profiles` bloquea lectura cross-user por default
Las policies originales de `profiles` (migración 001) solo permiten SELECT con `auth.uid() = id`. Cualquier feature que necesite leer profiles ajenos via una view con `security_invoker=true` (como `friends_visible_profiles` o `profiles_public`) depende de la policy `profiles_select_discoverable_or_friends` agregada en la migración 017 post-debug.

La policy permite SELECT si: es uno mismo, o el profile es `is_discoverable=true`, o existe una friendship entre caller y el profile target.

Si una feature futura necesita un nuevo caso de lectura (ej: exposición a users bloqueados, exposición a staff/admin, exposición via mensaje directo sin amistad), hay que agregar policy adicional o extender la existente.

Debugging de este bug es particularmente hostil porque la view no tira error — simplemente devuelve vacío. Cuando un server component hace `.from('profiles_public').select(...)` y devuelve null silencioso, revisar RLS antes que código.

### 13.12 Presence online se expone a todo amigo/discoverable
`profiles.last_seen_at` (migración 018) queda visible bajo la policy `profiles_select_discoverable_or_friends` — o sea, cualquier amigo o cualquier user con `is_discoverable=true` puede leer cuándo te viste por última vez. No hay toggle `show_online` en Fase 5.

El threshold de 90s (heartbeat 60s + 30s grace) mitiga la paranoia razonable: el timestamp exacto no queda expuesto en la UI, solo el boolean online/offline derivado.

v2.1 sumar `show_online` en `profiles` (mirror de `show_streak`, `show_badges`, `show_bio` de Fase 3) si algún user lo pide explícitamente. Mientras tanto, no inventar el toggle.

---

## 14. Fuera de scope explícito (v2+)

Listado canónico de lo que **no** se hace en este PR. Si el agente siente la tentación de agregar algo de esta lista "de paso", la respuesta es no.

| Feature | Fase propuesta para v2 |
|---|---|
| Web Push (notificaciones con pestaña cerrada) | v2.1 |
| Grupos de chat (N>2 users) | v2.2 |
| Feed de actividad (posts, likes, comments) | v3 |
| Splits automáticos tipo Splitwise (Interpretación B) | v2.2 |
| Mensajes de voz / archivos / imágenes | v2.3 |
| Edición de mensajes enviados | v2.1 |
| Búsqueda en historial de chat | v2.1 |
| Stickers / reacciones | v2.3 |
| Llamadas de video/audio | v3+ |
| Notificaciones in-app mejoradas (ring, unread modal) | v2.1 |
| Moderación con moderadores humanos | v3+ |
| Username history + redirect de viejos | v2.1 |
| Sugerencias de amigos (friends of friends) | v2.2 |
| Estado de "ocupado"/"no molestar" | v2.2 |
| Themes de chat / backgrounds | nunca |
| Federación / export de chat | nunca |

---

## 15. Sign-off global del PR

Al completar todas las fases, antes de mergear:

### 15.1 Checklist de QA manual

- [ ] Crear 2 users de prueba (A y B) desde cero.
- [ ] A acepta ToS y Privacy en onboarding.
- [ ] A elige username `test_a`.
- [ ] A activa `is_discoverable`.
- [ ] B repite lo mismo con `test_b`.
- [ ] A busca `@test_b` desde `/friends` → encuentra → envía solicitud.
- [ ] B ve la solicitud (badge + entrada en tab Solicitudes) → acepta.
- [ ] A y B se ven en sus respectivas listas de amigos.
- [ ] A entra a `/friends/test_b` → perfil público con streak y badges (si los hay).
- [ ] A abre chat con B desde el perfil → envía mensaje → B lo recibe en real-time.
- [ ] B responde → A lo ve en real-time.
- [ ] A crea un cobro vinculado a B con notificación → B lo acepta → se crea debt contrapartida.
- [ ] A marca cobro como saldado → propaga a B con confirmación.
- [ ] A bloquea a B → B no ve a A en ningún lado → conversation queda read-only.
- [ ] A exporta sus datos → descarga JSON con todo.
- [ ] A borra su cuenta → B ve que la amistad/conversation quedó huérfana (o eliminada, según cascade).

### 15.2 Checklist técnico

- [ ] 6 migraciones SQL generadas (013–018), todas aplicadas manualmente y verificadas.
- [ ] Todas las tablas nuevas con RLS activa y policies revisadas.
- [ ] `profiles_public` view expone solo campos públicos.
- [ ] Service role key NO expuesta al cliente en ningún lugar.
- [ ] Ningún `select('*')` sobre profiles de otros users.
- [ ] Realtime channels con cleanup en `useEffect`.
- [ ] Rate limits implementados (mensajes, requests).
- [ ] Bloqueo silencioso verificado en todas las queries relevantes.
- [ ] Copy es-AR consistente con la tabla de 13.7.
- [ ] Mobile 360px testeado al menos en las rutas críticas (`/friends`, `/chat/:userId`).
- [ ] Types de `Profile` extendidos en `lib/types.ts`.
- [ ] Cambios en `lib/types.ts` consistentes con lo que devuelve `profiles_public`.

### 15.3 Changelog final

Al mergear el PR, correr:

```bash
node scripts/add-changelog.mjs minor \
  "Agregamos el sistema de amigos: podés elegir tu username único, activar tu perfil público y conectarte con gente que también use MFI." \
  "Chat 1:1 en tiempo real con tus amigos, con presencia, typing indicator y confirmaciones de lectura." \
  "Cobros y deudas vinculables a un amigo: si ambos lo confirman, se refleja automáticamente en la cuenta del otro." \
  "Exportá todos tus datos en JSON desde Ajustes." \
  "Nueva opción para borrar tu cuenta con todos tus datos asociados." \
  "Agregamos Términos y Política de Privacidad actualizados."
```

### 15.4 Low entropy final

Antes de mergear, el agente responde:

1. ¿Qué fase quedó con más riesgo? ¿Por qué?
2. ¿Qué decisión tomada durante implementación diferiría si empezaras de cero hoy?
3. ¿Qué parte del flow es más probable que confunda a un user de prueba?
4. ¿Qué dependencia externa (Supabase Realtime en particular) introduce más fragilidad al MVP?

Las respuestas van al PR description como "Notas para revisores".

---

## 16. Apéndice — Referencias de diseño para mockups

Cuando se arme cada fase, antes de implementar pantallas nuevas, generar mockups con Claude en modo diseño (artifact HTML) y validar con el owner. Referencias visuales para inspiración (no copiar):

- **Beli** (app de restaurantes social): para el hub de amigos, vibe low-key.
- **iMessage**: para el chat — burbujas, simpleza, agrupado por día.
- **Telegram Desktop**: para inbox + conversation split view en desktop.
- **Linear** (settings de perfil): para la card de identidad social en Settings.
- **Vercel dashboard**: para density y tipografía en `/friends`.

No adoptar colores, tipografías o componentes de ninguna de esas apps. El lenguaje visual de MFI (Sora + shadcn + neutral) se mantiene.

---

**Fin del plan maestro.**

Última actualización: al generar este doc. Versión 1.0.
