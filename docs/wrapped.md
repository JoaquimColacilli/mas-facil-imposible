# Tu Mes en MFI — Wrapped mensual

Retrospectiva visual del mes, estilo Spotify Wrapped. 10 slides. Experiencia doble: **story mode 9:16** en mobile (auto-advance + tap zones) y **editorial horizontal 16:9** en desktop (nav manual, rail de miniaturas). El usuario puede descargar Excel / PDF / PNG (solo mobile) o PNG (desktop), o publicar el resumen como post en `/comunidad` con la share card como embed vivo.

Referencia de diseño aprobada en [design-refs/wrapped-bundle/](../design-refs/wrapped-bundle/). Los archivos ahí son vanilla JS — la feature está portada a React pero mantiene 1:1 los gradientes, blobs, tipografías y spacing tanto en mobile (`wrapped.slides.js`) como en desktop (`wrapped.desktop.js`).

## Entry point

El chip prominent (gradient sage→copper + shimmer + badge "nuevo") vive en [`components/monthly-summary-banner.tsx`](../components/monthly-summary-banner.tsx), junto a Excel y PDF.

**Visibilidad y mes apuntado** dependen del modo:

| Modo | Cuándo aparece | Mes que se abre |
|------|----------------|-----------------|
| **Prod** (`NEXT_PUBLIC_WRAPPED_DEV=false`) | Días 1–5 del mes (timezone AR) | Mes anterior (el que acaba de cerrar) |
| **Dev / QA** (`NEXT_PUBLIC_WRAPPED_DEV=true`, default en dev) | Siempre (bypass del gate) | Mes actual — para previsualizar contra datos vivos |

El dismiss persiste en `localStorage` bajo `mfi-wrapped-dismissed-<YYYY-MM>` (la key usa el mes objetivo del modo actual).

El chip es **device-agnóstico**: siempre lleva al recorrido completo, sea mobile o desktop. Las exportaciones Excel/PDF del banner **siempre** apuntan al mes anterior (son reportes post-mortem), incluso en dev mode — no se confunden con el mes que muestra el Wrapped.

## Feature flags

Dos switches en env, ambos `NEXT_PUBLIC_*` (bundleados al cliente, leídos en runtime):

| Flag | Rol | Default dev | Default prod |
|------|-----|-------------|--------------|
| `NEXT_PUBLIC_WRAPPED_ENABLED` | Master — apaga chip + overlay + notif | `true` | `false` |
| `NEXT_PUBLIC_WRAPPED_DESKTOP` | Sub — apaga solo la vista editorial 16:9, cae al phone-mockup | `true` | `false` |
| `NEXT_PUBLIC_WRAPPED_DEV` | Dev / QA — bypass del gate de 5 días + apunta al mes actual en lugar del anterior | `true` | `false` |

Leídos desde [`lib/wrapped/feature-flags.ts`](../lib/wrapped/feature-flags.ts). Si el master está off no se monta nada. Si el master está on pero el sub está off, los usuarios desktop (lg+) reciben el phone-mockup legacy — útil mientras se pulen detalles del rediseño horizontal sin apagar el feature en mobile.

## Flujo de datos

```
[ MonthlySummaryBanner ]
        ↓ click "Tu <mes>"
[ fetchMonthlyWrappedData(monthKey) ]  ← server action (app/(app)/dashboard/actions.ts)
        ├─ transactions (mes actual)
        ├─ transactions (mes anterior — para deltas)
        ├─ goals
        ├─ portfolio_logs (para yield)
        └─ profile (nombre + mood_emoji)
        ↓
[ computeWrapped(input) ]              ← pura, sin I/O (lib/wrapped/compute.ts)
        ↓  WrappedData
[ WrappedOverlay ]                      ← portal fullscreen; decide mode via matchMedia('(min-width: 1024px)')
        ├─ WrappedLoading (mientras fetch está en vuelo)
        ├─ WrappedEmpty  (totals.movements === 0)
        ├─ WrappedStory  ← mobile (<lg): 9:16 story mode, auto-advance 7s, tap zones, pausa/play
        └─ WrappedDesktop ← desktop (≥lg, sub-flag on): 16:9 editorial, nav manual, rail + flechas
```

El `slideIndex` vive en el overlay y se pasa como `initialIndex` a cualquiera de los dos modos. Eso permite que un usuario que arrancó en mobile slide 4 y achicó/agrandó la ventana (o movió la URL a la laptop) continúe exactamente donde estaba.

## Desktop vs Mobile

**Breakpoint**: `lg` (≥1024 px). Detectado por `matchMedia` en [`wrapped-overlay.tsx`](../components/wrapped/wrapped-overlay.tsx), no por Tailwind `hidden/block` — eso permite reflow en vivo: si el usuario resiza mid-recorrido, el índice se preserva y el modo cambia sin remontar el fetch.

### Mobile (<lg)

| Concepto | Detalle |
|----------|---------|
| Layout | 9:16 flush edge-to-edge, una slide por vez |
| Navegación | Tap zones (35% prev / 65% next), auto-advance 7 s por slide, flechas ←/→, Esc |
| Pausa | Hold 220 ms o botón explícito ⏸/▶ en el top bar |
| Slide 1 | **No auto-advanza** hasta el primer tap ("Tocá para empezar") |
| CTAs slide 10 | Compartir + Excel + PDF (+ PNG secundario) — toda la sesión pasa adentro del Wrapped, los 3 exports tienen sentido |
| Archivos | [`wrapped-story.tsx`](../components/wrapped/wrapped-story.tsx), [`slides.tsx`](../components/wrapped/slides.tsx) |

### Desktop (≥lg, sub-flag on)

| Concepto | Detalle |
|----------|---------|
| Layout | 16:9 editorial, grid 12 columnas por slide (col-span-5/6/7 según slide) |
| Navegación | Flechas flotantes ←/→ (48 px, `bg-black/30 backdrop-blur`), teclado (`Space` toggle pausa), rail de miniaturas clickeables. **Auto-advance 9 s** con botón ⏸/▶ |
| Progress | 10 segmentos finos arriba (animados con `pg-fill scaleX`) + contador mono `01/10` |
| Rail | 10 tiles clickeables debajo del stage, `número + título + chip de color` (paleta de cada slide). El activo tiene `border-white/80 + bg-white/10`. Sin mini-preview (lightweight intencional — si se necesita, el comentario en [`desktop-rail.tsx`](../components/wrapped/desktop/desktop-rail.tsx) explica cómo escalarlo) |
| Stage sizing | `width: min(100%, 1280px, calc(height * 16/9))`, `height: clamp(420px, calc(100vh - 220px), 720px)` — mantiene 16:9 reduciendo ancho en lugar de scrollear |
| Hero scale | `ResizeObserver` setea `--wrapped-hero-scale: 0.85` en el stage cuando su alto queda <520 px (laptops 13" con sidebar + topbar). Los hero numbers usan `calc(var(--wrapped-hero-scale, 1) * clamp(...))` vía el helper `<ScaledHero>` |
| CTAs slide 10 | Solo **Publicar en Comunidad** + **Descargar PNG**. Excel/PDF no viven acá — ya están a un clic en el dashboard del desktop. El Wrapped desktop es ceremonial, no centro de descargas |
| Archivos | [`wrapped-desktop.tsx`](../components/wrapped/desktop/wrapped-desktop.tsx), [`desktop-slides.tsx`](../components/wrapped/desktop/desktop-slides.tsx), [`desktop-rail.tsx`](../components/wrapped/desktop/desktop-rail.tsx), [`desktop-slide-primitives.tsx`](../components/wrapped/desktop/desktop-slide-primitives.tsx) |

### Qué se comparte

| Pieza | Ubicación |
|-------|-----------|
| Contrato de datos + formatters | `lib/wrapped/*` |
| Banner chip + entry point | `components/monthly-summary-banner.tsx` |
| Modal de publicación + lógica de post en `/comunidad` | `components/wrapped/share-to-community-dialog.tsx` |
| Share card (embed + PNG) | `components/wrapped/share-card.tsx`, `share-card-png.tsx` |
| Loading + Empty | `components/wrapped/wrapped-loading.tsx`, `wrapped-empty.tsx` |
| Personalidad + paleta | `lib/wrapped/personalities.ts` |

### Qué diverge

Las 10 slides son **dos sets distintos** — cada plataforma tiene su layout. No comparten render. La navegación tampoco: auto-advance + tap en mobile vs flechas/rail/teclado en desktop.

## Persistencia de progreso

El `slideIndex` se persiste en `localStorage` bajo `mfi_wrapped_progress_<YYYY>_<MM>` ([`lib/wrapped/progress-storage.ts`](../lib/wrapped/progress-storage.ts)). Clampeado a `[0, total-1]` en la lectura.

Casos de uso:
- Usuario arranca en mobile en slide 4, cierra, abre la laptop → desktop arranca en slide 4.
- Usuario rompe el flow y vuelve otro día del mismo mes → retoma donde dejó.
- Cambia el mes → key nuevo, arranca en 0 naturalmente.

No se sincroniza al servidor — es deliberadamente per-device (ninguna preferencia, es solo para retomar y la inversión de side-table + RLS no vale el UX delta).

## Analytics

Se emiten vía `@vercel/analytics` en [`lib/wrapped/analytics.ts`](../lib/wrapped/analytics.ts). Dedupe por sesión (una apertura del overlay).

| Evento | Props | Cuándo |
|--------|-------|--------|
| `wrapped_slide_viewed` | `{ index, device: 'mobile'\|'desktop', monthYear: 'MM-YYYY' }` | Primera vez que cada índice se ve en la sesión. Rewind no refire |
| `wrapped_completed` | `{ device, monthYear }` | Primera vez que se llega al índice final en la sesión |

El `monthYear` es el del data que se está revisando, no el reloj — importante porque se puede abrir retroactivamente. Es la única forma de medir si el rediseño desktop mueve el funnel vs el phone-mockup: filtrando por `device` en el dashboard de Vercel se compara completion rate lado a lado.

## Personalidades

Derivadas en [`lib/wrapped/personality.ts`](../lib/wrapped/personality.ts). Prioridad arriba → abajo:

| Regla | Condición |
|-------|-----------|
| **Austero** | `expenseDeltaVsPrev <= -18%` AND `movementCount < 25` AND hay mes anterior |
| **Inversor** | `investment > savings` AND `(investment + savings) > 0` |
| **Ahorrista** | `(savings + investment) / income >= 0.20` |
| **Social** | `socialSpend / expense >= 0.25` |
| **Equilibrado** | default |

`socialSpend` suma transacciones cuya categoría contiene alguno de los keywords definidos en `SOCIAL_CATEGORY_KEYWORDS` (delivery, salidas, bar, cine, entretenimiento, viajes, regalos, etc.). Case-insensitive. Si querés agregar/quitar, editá esa constante.

Cada personalidad tiene su par de `oklch()` para gradientes, emoji y copy. Todos conviven en [`lib/wrapped/personalities.ts`](../lib/wrapped/personalities.ts). El mapeo `personality → categoría de /comunidad` (para el post publicado) también vive ahí:

- `ahorrista` → `ahorros`
- `inversor` → `inversiones`
- `social`, `equilibrado`, `austero` → `ahorros` (default semántico)

## Catálogo de equivalencias ("qué pudiste haber comprado")

Slide 5 traduce el gasto top en items concretos AR. El catálogo vive en [`lib/wrapped/equivalents.json`](../lib/wrapped/equivalents.json):

```json
{
  "asado": { "label": "asados", "emoji": "🥩", "avgARS": 25000 }
}
```

### Agregar un ítem nuevo

1. Abrí `lib/wrapped/equivalents.json`.
2. Agregá una entry con `label` (plural), `emoji`, `avgARS` (precio promedio en pesos argentinos).
3. No hace falta tocar código — la función `pickEquivalents()` los descubre automáticamente.

### Cómo se eligen los 3 ítems

`pickEquivalents(amount)` en [`lib/wrapped/equivalents.ts`](../lib/wrapped/equivalents.ts):

- Calcula `n = round(amount / item.avgARS)` para cada ítem.
- Filtra los que caen en `n ∈ [5, 400]` — evita "0,3 asados" o "8000 subtes".
- Ordena por `avgARS` descendente (prefiere bigger-ticket primero).
- Prioriza variedad: no repite emojis.
- Fallback: si el filtro queda vacío, amplía a `[2, 2000]` y después `[1, 20000]`.

Para ajustar los rangos globalmente (ej: mes con inflación alta), cambiá los defaults en `pickEquivalents()`.

### Cuándo actualizar precios

Los precios son "referenciales" — si la inflación los desactualiza mucho (equivalentes empiezan a salir ridículos), subilos en el JSON. La app muestra `ref. $ 25.000 c/u` debajo de cada equivalencia, así que el usuario entiende que es una estimación.

## Integración con /comunidad

Al hacer click en "Compartir" en la slide 10:

1. Se abre `ShareToCommunityDialog` con título + mensaje editables (prellenados).
2. La categoría del post se deriva de la personalidad (ver tabla arriba).
3. Los hashtags `#wrapped #<mes><año> #<personalidad>` se agregan al final del body.
4. Al confirmar se inserta un `community_posts` con `embed.kind = 'wrapped'` (snapshot completo — el post no se actualiza si el usuario edita transacciones después).
5. Redirige a `/comunidad/<postId>`.

El snapshot se renderea con `WrappedEmbed` ([`app/(app)/comunidad/wrapped-embed.tsx`](../app/(app)/comunidad/wrapped-embed.tsx)) — componente vivo, respeta light/dark y es compacto/rich según si el post es thread o feed.

## Export a PNG

Botón secundario debajo de los 3 principales. Renderiza la `ShareCard` en un host off-screen a 1080×1350 (feed) o 1080×1920 (story) y usa `html-to-image` para bajarla como PNG. Archivo: [`components/wrapped/share-card-png.tsx`](../components/wrapped/share-card-png.tsx).

## Performance

- Las 10 slides se montan una por vez (solo la activa está en el DOM).
- El overlay usa `createPortal` al `body` — no se re-renderiza con cambios de estado del dashboard.
- `WrappedOverlay` se importa **estáticamente** desde el banner (no dynamic import) porque el banner ya solo existe los primeros 5 días del mes — el costo es irrelevante para el resto del mes.
- `html-to-image` sí se carga dinámicamente (solo cuando el usuario toca "Descargar PNG").

## Accesibilidad

- `prefers-reduced-motion`: deshabilita blobs, shimmer, count-up, pulse ring y auto-advance. Navegación queda puramente manual.
- Contraste: todos los big numbers son white/95 sobre gradientes oklch con L <= 0.55 — verificado AA.
- Teclado: `←`/`→` navegan, `Esc` cierra. El overlay tiene `role="dialog"` + `aria-modal`.
- Botones tap tienen `aria-label` y el banner chip tiene `title`.

## Tests

```bash
npx vitest run lib/wrapped
```

Cubre: mes positivo típico, mes negativo, empty state, solo cancelled, mes con 1 movimiento, selección de meta más cercana, yield de portfolio, y las 5 personalidades.

## Archivos

| Path | Responsabilidad |
|------|-----------------|
| `lib/wrapped/types.ts` | `WrappedData` y sub-tipos |
| `lib/wrapped/formatters.ts` | `fmtARS`, `fmtARSd`, `fmtUSD`, `fmtNum`, `fmtPct` (es-AR) |
| `lib/wrapped/personalities.ts` | Registro de las 5 personalidades |
| `lib/wrapped/personality.ts` | `derivePersonality()` + keywords "social" |
| `lib/wrapped/equivalents.json` | Catálogo editable |
| `lib/wrapped/equivalents.ts` | `pickEquivalents()` |
| `lib/wrapped/compute.ts` | `computeWrapped()` pura |
| `lib/wrapped/compute.test.ts` | Tests |
| `app/(app)/dashboard/actions.ts` | `fetchMonthlyWrappedData()` server action |
| `app/(app)/comunidad/wrapped-embed.tsx` | Render del embed en feed |
| `components/wrapped/wrapped-styles.css` | Grain, blobs, shimmer, progress bars (scoped) |
| `components/wrapped/slide-primitives.tsx` | `SlideWrap`, `BlobBg`, `GradientBg`, `Sparkline` |
| `components/wrapped/count-up.tsx` | Animación number count-up |
| `components/wrapped/slides.tsx` | Las 10 slides |
| `components/wrapped/wrapped-story.tsx` | Shell (progress + tap + hold) |
| `components/wrapped/wrapped-loading.tsx` | Loading screen |
| `components/wrapped/wrapped-empty.tsx` | Empty state |
| `components/wrapped/share-card.tsx` | Share card (slide 10 + PNG export) |
| `components/wrapped/share-card-png.tsx` | Export a PNG con `html-to-image` |
| `components/wrapped/share-to-community-dialog.tsx` | Edit-then-publish |
| `components/wrapped/wrapped-overlay.tsx` | Portal fullscreen, decide mobile vs desktop vía matchMedia, dueño del `slideIndex` |
| `components/wrapped/desktop/wrapped-desktop.tsx` | Shell editorial 16:9 (progress + stage + flechas + rail) |
| `components/wrapped/desktop/desktop-slides.tsx` | Las 10 slides desktop (ports de `wrapped.desktop.js`) |
| `components/wrapped/desktop/desktop-rail.tsx` | Rail de miniaturas clickeables |
| `components/wrapped/desktop/desktop-slide-primitives.tsx` | `DesktopSlideWrap` + `ScaledHero` + `DesktopEyebrow` |
| `components/wrapped/desktop/desktop-loading.tsx` | Loading 16:9 editorial (cubre fetch + hidratación de `slideIndex`) |
| `lib/wrapped/use-auto-advance.ts` | Hook compartido — timer + progress fill + pausa/resume; mobile y desktop corren acá |
| `lib/wrapped/feature-flags.ts` | `NEXT_PUBLIC_WRAPPED_ENABLED` + `NEXT_PUBLIC_WRAPPED_DESKTOP` |
| `lib/wrapped/progress-storage.ts` | Resume per mes vía `localStorage` |
| `lib/wrapped/analytics.ts` | `wrapped_slide_viewed` + `wrapped_completed` |
| `components/monthly-summary-banner.tsx` | Chip entry (device-agnóstico, bajo master flag) |
