# MFI — Más Fácil Imposible

![version](https://img.shields.io/badge/version-1.0.0-1a1a2e)
![Next.js](https://img.shields.io/badge/Next.js-16-0a0a0a)
![React](https://img.shields.io/badge/React-19-1a1a2e)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-2b3a42)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-2b3a42)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-1a1a2e)

Gestor de finanzas personales pensado para Argentina. Registra ingresos, gastos, ahorros e inversiones en ARS y USD, con cotización del dólar en tiempo real, datos del mercado argentino y crypto, escaneo de tickets/PDFs con IA, comunidad social, chat 1-a-1, resumen mensual estilo Wrapped, y reportes descargables. Datos sensibles cifrados at-rest. UI 100% en español rioplatense.

---

## Tabla de contenidos

- [Sobre el proyecto](#sobre-el-proyecto)
- [Características principales](#características-principales)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Requisitos previos](#requisitos-previos)
- [Configuración local](#configuración-local)
- [Variables de entorno](#variables-de-entorno)
- [Migraciones de base de datos](#migraciones-de-base-de-datos)
- [Scripts disponibles](#scripts-disponibles)
- [Tests](#tests)
- [Privacidad y seguridad](#privacidad-y-seguridad)
- [Integraciones externas](#integraciones-externas)
- [Roadmap](#roadmap)
- [Autor](#autor)

---

## Sobre el proyecto

MFI es una app web de finanzas personales diseñada para el contexto económico argentino, donde conviven dos monedas (ARS y USD) y la cotización del dólar es información crítica.

El proyecto cubre el ciclo completo de gestión financiera personal y suma capas sociales:

- Registro y categorización de movimientos (ingresos, gastos, ahorros, inversiones)
- Gastos recurrentes con generación automática mensual
- Portfolios de inversión con tracking de rendimiento (TWR) y heatmap mensual
- Cotización del dólar MEP y Blue en tiempo real
- Mercado argentino (MERVAL + acciones) y criptomonedas con sparklines
- Feriados argentinos integrados con detección de días no operables
- Análisis financiero con comparación vs período anterior
- Reportes descargables en Excel y PDF
- **Carga de movimientos desde imagen o PDF con IA** (escaneo de tickets, transferencias, resúmenes de tarjeta)
- **Cifrado AES-256-GCM** at-rest para campos sensibles
- **Comunidad** estilo Reddit con posts, comentarios, votos y embeds de movimientos / metas / wrapped
- **Chat 1-a-1** entre amigos con presence y replies
- **Resumen mensual** estilo Wrapped con personalidades, daily expense chart y share card exportable
- Onboarding multi-paso para usuarios nuevos
- Dos modos de UI (`classic` y `mfi`) sobre los mismos datos
- Light / dark mode

ARS y USD se tratan como monedas independientes en todo el sistema. **No existe conversión automática entre ellas**.

---

## Características principales

### Dashboard

- 5 KPIs principales: balance total, ingresos, gastos, ahorros, inversiones
- Gráfico de área mensual (income vs expenses ARS vs expenses USD) con tres ejes Y
- Distribución de gastos por categoría (donut chart)
- Navegador de meses con date picker
- Barra colapsable de gastos pendientes con confirmación individual o masiva
- FAB scanner mobile con onboarding tour para escanear tickets / PDFs

### Movimientos

- Lista paginada agrupada por fecha con búsqueda y filtros múltiples
- Filtros por tipo, moneda, estado (confirmado / pendiente / cancelado), método de pago y fecha
- Calendario desplegable para saltar a una fecha específica
- Modal de creación con combobox de categorías (búsqueda + creación inline)
- Modal de edición con soporte para eliminar
- Checkbox "Agregar otro" para carga encadenada sin cerrar el modal
- Gastos recurrentes mensuales (toggle en el formulario, generación automática on-demand)
- Método de pago: efectivo, débito, crédito (crédito marca como pendiente)

### Carga desde imagen o PDF (IA)

- Escaneo con **Gemini 2.5 Flash** (free tier de Google AI Studio)
- Mobile: cámara directa o file picker (fotos, screenshots, PDFs)
- Desktop: drag & drop, file picker, paste de clipboard
- Soporta PNG, JPG, WebP (≤4 MB) y PDF (≤10 MB)
- Multi-extracción: si subís un resumen de tarjeta con 20 movimientos, los procesa todos de una llamada
- Bulk review con checkbox por fila para descartar lo que no quieras cargar
- Rate limit: 20 análisis por usuario por día (1 PDF con 20 movimientos = 1 análisis)
- La imagen / PDF nunca se almacenan — solo se procesan en memoria

### Inversiones

- Pantalla dedicada con gráfico de evolución del portfolio
- Selector de período: 1S, 1M, 3M, 6M, YTD, 1A, Max
- KPIs de valor total y rendimiento del período (TWR — Time-Weighted Return) con colores semánticos
- Holdings por portfolio con filtrado individual
- Donut de composición por portfolio
- Heatmap de rendimientos mensuales
- Creación de portfolios, carga de variación diaria, rescate
- Descarga de PDF del período seleccionado
- Widget de racha de inversiones

### Análisis

- Period selector con chips (este mes, anterior, 3/6/12 meses, personalizado)
- Toggle de moneda ARS / USD / Todas
- KPI cards con sparklines y deltas vs período anterior
- Chart de evolución con gradientes y líneas de comparación
- Breakdown de categorías con donut interactivo
- Top movimientos del período
- Tasa de ahorro mensual (ARS y USD independientes)
- Descarga de PDF

### Mercado en tiempo real

- USD: dólar MEP y Blue con compra / venta y spread
- Mercado argentino: MERVAL + 9 acciones (GGAL, YPFD, MELI, BMA, PAMP, TXAR, SUPV, BBAR, LOMA) con sparklines
- Crypto: BTC + ETH, SOL, XRP, ADA, DOGE, DOT, LINK con sparklines de 7 días
- Auto-refresh cada 5 minutos con pausa en background
- Indicador de mercado abierto / cerrado con próxima apertura
- Flash de precios ante cambios

### Resumen mensual (Wrapped)

- Recorrido de 10 diapositivas estilo Spotify Wrapped
- Personalidad del mes: ahorrista, inversor, social, equilibrado o austero
- Gráfico de gastos diarios y top categorías
- Vista mobile 9:16 con tap zones, hold-to-pause
- Vista desktop 16:9 con auto-advance y rail de miniaturas
- Compartir como post en /comunidad o exportar como PDF de 10 páginas

### Comunidad

- Feed estilo Reddit con 8 categorías (Inversiones, Ahorros, Dólar, Plazos fijos, Cripto, Gastos, Metas, Preguntas)
- Posts con embeds vivos: movimientos, metas, wrapped del mes
- Comentarios con threading, mentions con `@username`, votos
- Editor rich text (TipTap) con upload de imágenes
- Notificaciones de votos, comentarios, replies y mentions

### Chat 1-a-1

- Mensajes en tiempo real entre amigos con Supabase Realtime
- Typing indicator y presence dot
- Reply con quote, soft delete, read receipts
- Inbox con previews de últimos mensajes y unread count

### Amigos

- Búsqueda por username, sugerencias, requests, blocks
- Perfil público con privacy flags configurables (mostrar / ocultar streak, badges, bio)
- Préstamos y deudas vinculados entre amigos con propagación de status

### Automatizaciones

- Gastos recurrentes: generación automática al abrir el dashboard en un nuevo mes
- Detección de feriados argentinos (fijos, trasladables, puente, calculados por Pascua)
- Badge de día no operable en el navbar con mensajes rotativos
- Resumen mensual automático con notificación (días 1-5 de cada mes)

### Metas

- Categorización (viaje, auto, casa, emergencia, inversión, otro)
- Aporte mensual configurable, auto-débito declarativo
- Barra de progreso con confetti al completar
- Liquidación: transforma la meta cumplida en un movimiento de income

### Notificaciones

- Centro con polling de 30 segundos
- Tipos: info, warning, success, alert
- Payloads JSON para friend requests, community votes, comments, mentions

### Ajustes

- Perfil: nombre, apodo, avatar con crop circular
- Mood / estado con emoji
- Privacy flags: discoverable, show streak / badges / bio
- Moneda por defecto (ARS / USD)
- Cambio de contraseña

### Otros

- Onboarding multi-paso para nuevos usuarios
- Préstamos y deudas con tracking de estado
- Modo MFI alternativo (UI estilo planilla mensual)
- Formulario de feedback integrado
- Sistema de novedades (changelog en popup)

---

## Stack tecnológico

| Capa | Tecnología | Rol |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | Server components, routing, una API route |
| Runtime | React 19 | UI reactiva |
| Lenguaje | TypeScript 5.7 | Tipado estático |
| Base de datos | Supabase (PostgreSQL + Auth + RLS) | Persistencia, autenticación, row-level security |
| Estilos | Tailwind CSS 4 | Utility-first CSS |
| UI Primitives | Radix UI (shadcn/ui) | Componentes accesibles |
| Charts | Recharts 2.15 | Área, donut, sparklines, heatmap |
| Forms | React Hook Form + Zod | Validación |
| Data fetching | SWR | Polling y cache cliente |
| Tours | driver.js 1.4 | Onboarding interactivo |
| Rich text | TipTap 3 | Editor de community + chat |
| IA | Google Gemini 2.5 Flash (REST) | Escaneo de tickets / PDFs |
| Cifrado | Node.js `crypto` (AES-256-GCM) | Datos sensibles at-rest |
| Reportes | jsPDF + jspdf-autotable, xlsx | PDF y Excel |
| Iconos | Lucide React | Iconografía |
| Theming | next-themes | Modo claro / oscuro |
| Notificaciones | Sonner | Toasts |
| Analytics | Vercel Analytics | Métricas de uso |
| Testing | Vitest 4 | Tests unitarios |
| Fuentes | Sora, DM Sans, DM Mono | Tipografía (Google Fonts) |
| Gestor paquetes | pnpm | Lockfile usado por Netlify |

---

## Estructura del proyecto

```
mas-facil-imposible/
├── app/
│   ├── (app)/                  # Rutas protegidas
│   │   ├── dashboard/          # Inicio
│   │   ├── transactions/       # Lista de movimientos
│   │   ├── investments/        # Portfolios
│   │   ├── analytics/          # Análisis financiero
│   │   ├── goals/              # Metas
│   │   ├── notifications/      # Centro de notificaciones
│   │   ├── settings/           # Ajustes
│   │   ├── friends/            # Amigos
│   │   ├── chat/               # Chat 1-a-1
│   │   ├── comunidad/          # Feed social
│   │   └── admin/              # Panel admin (sugerencias)
│   ├── auth/                   # Login, registro, recuperación
│   ├── mfi/                    # Modo MFI alternativo
│   ├── onboarding/             # Onboarding nuevos usuarios
│   ├── legal/                  # Privacidad y TOS
│   ├── add/[username]/         # Landing pública de invitación
│   ├── api/market-proxy/       # Única API route (Yahoo Finance)
│   ├── tour.css                # Theming driver.js
│   └── page.tsx                # Redirect según auth + onboarding + modo
├── components/
│   ├── ui/                     # 57 primitivas Radix/shadcn
│   ├── scan-transaction-dialog.tsx     # Escaneo Gemini
│   ├── bulk-review-transactions.tsx    # Revisión multi-tx
│   ├── feature-tour.tsx                # Onboarding tours (driver.js)
│   ├── quick-add-transaction.tsx       # Carga manual
│   ├── nav.tsx                         # Sidebar + bottom nav
│   ├── market-card.tsx, usd-cotizacion-widget.tsx
│   └── …                       # ~50 componentes feature
├── lib/
│   ├── supabase/               # Clientes (browser, SSR, middleware)
│   ├── types.ts                # Interfaces y enums
│   ├── crypto.ts               # AES-256-GCM
│   ├── gemini.ts               # Wrapper REST Gemini
│   ├── changelog.ts            # Historial de versiones
│   ├── social/                 # Chat, friendships, presence
│   ├── wrapped/                # Lógica del resumen mensual
│   └── *.test.ts               # Specs Vitest
├── hooks/                      # 9 hooks (mobile, polling, presence, etc.)
├── scripts/
│   ├── 001…029_*.sql           # 36 migraciones (ver más abajo)
│   ├── add-changelog.mjs       # Bump versión + changelog
│   ├── release.mjs             # Commit + push interactivo
│   └── migrate-encrypt.ts      # Migración legacy → enc_data
├── middleware.ts                # Auth guard
└── public/                     # Assets
```

---

## Requisitos previos

- **Node.js 20** o superior (declarado en `package.json` `engines`)
- **pnpm** (el lockfile usado por Netlify es `pnpm-lock.yaml`)
- Cuenta de [Supabase](https://supabase.com) con un proyecto creado
- Cuenta de [Google AI Studio](https://aistudio.google.com/app/apikey) para obtener una API key gratis de Gemini (free tier sin billing requerido)

---

## Configuración local

```bash
git clone https://github.com/joaquimcolacilli/mas-facil-imposible.git
cd mas-facil-imposible

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con los valores reales

# Aplicar migraciones en Supabase (SQL Editor)
# Ver sección "Migraciones de base de datos"

# Generar la clave de cifrado
openssl rand -hex 32   # copiar el output a ENCRYPTION_KEY en .env.local

# Levantar el dev server
pnpm dev
```

La app queda en `http://localhost:3000`.

---

## Variables de entorno

Crear `.env.local` en la raíz:

### Obligatorias

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima (pública) de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (privada) de Supabase |
| `ENCRYPTION_KEY` | 64 caracteres hex para AES-256-GCM. Generar con `openssl rand -hex 32`. **Única env var sensible no-Supabase**. |
| `GEMINI_API_KEY` | API key de Google AI Studio (Gemini 2.5 Flash, free tier sin billing) |

### Opcionales

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | Override del redirect URL en dev |
| `NEXT_PUBLIC_SITE_URL` | Base URL para construir links de email |
| `NEXT_PUBLIC_DEBUG_PANELS` | `'true'` muestra paneles de debug en goals |
| `NEXT_PUBLIC_WRAPPED_ENABLED` | Activa el resumen mensual Wrapped |
| `NEXT_PUBLIC_WRAPPED_DESKTOP` | Activa Wrapped en desktop (default: solo mobile) |
| `NEXT_PUBLIC_WRAPPED_DEV` | Activa Wrapped en dev sin importar fecha |

Ninguna de estas variables debe commitearse al repositorio.

---

## Migraciones de base de datos

Aplicar **en orden** en el SQL Editor de Supabase. Todas son idempotentes (`IF NOT EXISTS` / `IF EXISTS`).

> **Numeración**: el repo tiene **duplicados históricos** de número (003×3, 004×3, 005×2, 006×2, 020×2) por paralelismo de features. Aplicar siempre todas, ordenando alfabéticamente las que comparten prefijo numérico. **De ahora en más, las migraciones nuevas empiezan en 030 y siguen secuenciales sin reusar números.**

| Archivo | Qué hace |
|---|---|
| `001_schema.sql` | Tablas core: profiles, categories, transactions, goals, notifications + RLS |
| `002_seed_categories.sql` | Seed de categorías por defecto |
| `003_add_enc_columns.sql` | Columna `enc_data text` en transactions, goals, loans, debts |
| `003_community.sql` | Tablas community_posts, community_comments, community_votes, community_saves |
| `003_recurring_transactions.sql` | Columnas `is_recurring` y `recurring_source_id` en transactions |
| `004_ai_usage.sql` | Tabla `ai_usage` para rate limit del escaneo IA |
| `004_community_media.sql` | Imágenes en posts y comentarios |
| `004_profiles_last_seen_version.sql` | `profiles.last_seen_version` para popup de novedades |
| `005_ai_usage_n_extracted.sql` | `ai_usage.n_extracted` (analytics) |
| `005_profiles_mood_nickname.sql` | `profiles.nickname / mood_emoji / mood_text` |
| `006_fix_cocos_currency.sql` | Fix histórico de currency en transactions |
| `006_profiles_tours_seen.sql` | `profiles.tours_seen JSONB` para onboarding tours |
| `007_add_payment_method.sql` | `transactions.payment_method` (cash / debit / credit) |
| `008_resolved_transaction_id.sql` | FK `loans.resolved_transaction_id`, `debts.resolved_transaction_id` |
| `009_portfolio_log_type.sql` | Tipo de log de portfolio (yield / deposit / rescue) |
| `010_fix_savings_withdraw_currency.sql` | Fix histórico |
| `011_add_user_location.sql` | Geo en profiles |
| `012_fix_location_lat_lng_type.sql` | Fix tipo numeric |
| `013_add_compliance_fields.sql` | TOS / privacy timestamps + cascade FK |
| `014_add_social_identity.sql` | Username, bio, is_discoverable |
| `015_social_graph.sql` | friend_requests, friendships, blocks |
| `016_profile_privacy.sql` | show_streak / show_badges / show_bio |
| `017_chat.sql` | conversations, messages |
| `018_chat_presence.sql` | Presence en messages + last_seen_at |
| `019_loans_debts_friend.sql` | Tablas loans + debts con FK a friend |
| `020_suggested_users.sql` | Sugerencias de amigos |
| `020_wrapped_embed_kind.sql` | Embed `wrapped` en community_posts |
| `021_chat_replica_identity.sql` | `messages REPLICA IDENTITY FULL` (realtime) |
| `022_chat_reply.sql` | `messages.reply_to_message_id` |
| `023_client_message_id.sql` | Idempotencia de mensajes |
| `024_community_notifications.sql` | Tipos de notificación community |
| `025_community_posts_edited_at.sql` | Edited timestamp |
| `026_community_karma.sql` | `profiles.karma` |
| `027_community_mentions.sql` | `@mentions` |
| `028_goals_redesign.sql` | Categoría, monthly_target, auto-débito declarativo, encrypted data |
| `029_goals_liquidation.sql` | Liquidación de metas |

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `pnpm dev` | Servidor de desarrollo con Turbopack |
| `pnpm build` | Build de producción |
| `pnpm start` | Servidor de producción |
| `pnpm lint` | Ejecutar ESLint |
| `pnpm release` | Commit + push interactivo (solo si querés publicar) |
| `node scripts/add-changelog.mjs <patch\|minor\|major> "<msg>"` | Registrar cambio en changelog y bumpear versión |

---

## Tests

Vitest 4. **No hay script `npm test`** declarado — se usa el binario directamente:

```bash
npx vitest run                    # one-shot
npx vitest                        # watch
npx vitest run lib/foo.test.ts    # archivo específico
```

Specs ubicadas junto a sus módulos en `lib/`:

| Archivo | Cobertura |
|---|---|
| `analytics-utils.test.ts` | Períodos, deltas, agrupaciones, savings rate |
| `ar-holidays.test.ts` | Feriados, traslados, días no operables |
| `crypto-data.test.ts` | Parseo de respuestas CoinGecko |
| `goals.test.ts` | Lógica de metas |
| `investment-streak.test.ts` | Cálculo de racha de inversiones |
| `market-data.test.ts` | Parseo de Yahoo Finance, estado del mercado |
| `non-trading-messages.test.ts` | Selección determinística de mensajes |
| `usd-cotizacion.test.ts` | Parseo de cotización USD |
| `wrapped/compute.test.ts` | Cálculos del resumen mensual |

---

## Privacidad y seguridad

- **Row Level Security** habilitado en todas las tablas de Supabase. Política base: `auth.uid() = user_id`. Tablas de relaciones (friendships, blocks) usan policies más complejas.
- **Cifrado at-rest** con AES-256-GCM en campos sensibles (`amount`, `note` de transactions; `monthly_target`, `auto_amount`, `current_amount`, `note` de goals; análogos en loans / debts). Las columnas plaintext quedan en placeholder (0 / null); los valores reales viven cifrados en `enc_data text`.
- **Imágenes de escaneo IA**: las fotos / PDFs subidos para escaneo con Gemini se procesan en memoria. **No se almacenan** en MFI ni en Supabase Storage. Solo el resultado JSON viaja al cliente.
- **Free tier de Gemini sin billing**: no compartimos tarjeta con Google AI Studio. Si Google nos rate-limita, devolvemos un error genérico al usuario sin afectar su cuota interna.
- **Rate limit propio**: 20 análisis IA por usuario por día (rolling 24 h). Un PDF con 20 movimientos cuenta como 1 análisis.

---

## Integraciones externas

| Servicio | Propósito | Autenticación |
|---|---|---|
| Google Gemini 2.5 Flash | Escaneo de tickets / PDFs (server-side) | `GEMINI_API_KEY` |
| Yahoo Finance | Acciones argentinas (vía proxy con whitelist) | sin clave |
| DolarAPI | Cotización USD MEP / Blue | sin clave |
| CoinGecko | Precios de criptomonedas | sin clave |
| datos.gob.ar | Datos públicos AR | sin clave |
| Open-Meteo | Clima | sin clave |

El proxy de Yahoo Finance (`/api/market-proxy`) cachea respuestas por 60 segundos y solo admite tickers de un whitelist predefinido.

---

## Roadmap

- Transferencias entre cuentas
- Reportes financieros descargables más completos (PDF / CSV con más cortes)
- Notificaciones server-side (triggers o cron en Supabase)
- Tour de bienvenida para `/comunidad` y `/chat`
- Soporte para múltiples portfolios con divisas mixtas
- App mobile nativa (PWA-first hoy, native eventualmente)

---

## Autor

**Joaquim Colacilli** — [GitHub](https://github.com/joaquimcolacilli)
