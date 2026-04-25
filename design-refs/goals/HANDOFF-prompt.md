# Prompt para agente de implementación · Rediseño de /metas (MFI)

Pegale esto al agente, junto con el archivo `MFI-metas-redesign.html` adjunto como referencia visual e interactiva.

---

## Contexto

Soy parte del equipo de **MFI** (app de finanzas personales). Te comparto un prototipo HTML self-contained con el rediseño completo de `/metas` (la pantalla de objetivos de ahorro). El prototipo está hecho con React + Tailwind para iterar rápido, pero **vos tenés que implementarlo en nuestro stack real** ([completá: Next.js + TypeScript + Tailwind / React Native / etc.]) respetando nuestros patrones, tipos, y diseño existentes.

Tomá el HTML como **referencia visual y de comportamiento, no como código a copiar**. Estudiá:

- La jerarquía visual (hero → filtros → cards activas → cards cumplidas → drilldown)
- Los datos que muestra cada componente
- Las interacciones (sort, filter, abrir detalle, simulador, modal de crear)
- Las micro-decisiones (chip de "en ritmo / atrás del ritmo", confetti en cumplidas, pulse rojo en vencidas, sparkline animado, ring de progreso)
- Los estados (vacío, una meta, varias, cumplidas, vencida, drilldown)

## Lo que tenés que producir

Una versión **dinámica y conectada a datos reales** de `/metas`, no un mock. Específicamente:

### 1. Modelo de datos

Usá nuestros tipos de `Goal` (o creá si no existen) con al menos:

```ts
type Goal = {
  id: string;
  name: string;
  category: 'viaje' | 'auto' | 'casa' | 'emergencia' | 'inversion' | 'otro';
  currency: 'USD' | 'ARS';
  target: number;
  current: number;
  monthlyTarget: number;       // aporte mensual configurado
  deadline: Date | null;
  createdAt: Date;
  auto: { enabled: boolean; amount?: number; day?: number };
  note?: string;
  completedAt?: Date | null;
};
```

Campos derivados que se calculan en el cliente o el server (definí dónde según performance):
- `pct` (% de progreso)
- `remaining` (lo que falta)
- `daysLeft` / `monthsLeft` (en base a `deadline` y hoy)
- `requiredMonthly` (`remaining / monthsLeft`)
- `onTrack` (`monthlyTarget >= requiredMonthly * 0.95`)
- `overdue` (`deadline < hoy && !completedAt`)
- `series` (sparkline de aportes acumulados — vienen del feed de movimientos filtrado por `goalId`)

### 2. Endpoints / queries necesarios

Asumiendo que `Goal` y `GoalDeposit` ya existen en backend o hay que crearlos:

- `GET /api/goals` → listado del usuario
- `GET /api/goals/:id` → detalle con feed de depósitos
- `POST /api/goals` → crear meta (modal del prototipo)
- `PATCH /api/goals/:id` → editar / pausar / reactivar
- `POST /api/goals/:id/deposits` → depositar a meta (puede o no estar conectado al sistema de movimientos existente — confirmalo con el equipo)
- `POST /api/goals/:id/liquidate` → cuando una meta cumplida se "cobra"

Si el sistema de movimientos ya tiene tagging por meta, no dupliques modelos: `GoalDeposit` puede ser una vista derivada de `Movement` con `goalId`.

### 3. Componentes a implementar

Mapealos uno a uno desde el prototipo:

| Prototipo (referencia) | Componente real | Notas |
|---|---|---|
| `GoalsHero` | `<GoalsHero/>` | Total agregado USD-equivalente. Conversión ARS→USD usa **MEP en vivo** (en el prototipo está hardcodeado en 1100 — eso hay que reemplazarlo). |
| `GoalsFilters` | `<GoalsFilters/>` | Filtro por categoría con conteos + sort. Estado en URL (`?cat=viaje&sort=progress`) para que sea linkeable. |
| `GoalCard` | `<GoalCard/>` | Card rica con ring, sparkline, progress, sugerencia mensual, CTAs. Memoizar — la lista puede crecer. |
| `GoalDetail` | Página `/metas/[id]` | Hero + simulador + hitos + feed de movimientos. **El simulador es client-only**, no persiste nada. |
| `CreateGoalModal` | `<CreateGoalModal/>` | Form con preview en vivo. Validación: nombre requerido, target > 0, deadline en el futuro si se elige, autoAmount > 0 si auto está activo. |
| `EmptyState` | `<GoalsEmpty/>` | 3 cards "Idea N" deberían ser **plantillas reales** que pre-llenen el modal de crear (no estáticas). |

### 4. Interacciones críticas

- **Sort persistente** en URL.
- **Drilldown** vía `/metas/[id]` (no modal) — slug navegable, shareable, back funciona.
- **Simulador**: al mover el slider, recalcula `monthsToTarget` y `eta` en vivo, sin debounce visible. Si `eta > deadline`, mostrar warning rojo con días de atraso.
- **Confetti** en cards cumplidas: que aparezca solo la primera vez que se ven después de cumplirse (guardar `seenCompletedAt` en localStorage por meta para no animar en cada visita).
- **Pulse dot rojo** en vencidas: animación CSS, no JS.
- **Sparkline**: valores reales de la serie de depósitos acumulados de esa meta. Si no hay depósitos, ocultá la sparkline (no la muestres con una línea recta a 0).
- **Auto-débito chip**: solo mostrar si `auto.enabled === true`. Click → abre la sección de configuración de la meta, no editar inline.

### 5. Diseño y design tokens

Usá los tokens que ya tenemos en MFI. El prototipo usa estos colores como referencia:
- `sage` `oklch(0.50 0.10 155)` / `sageL` `oklch(0.62 0.11 155)` — primario, progreso "en ritmo", cumplidas
- `copper` `oklch(0.62 0.12 65)` — acentos, "atrás del ritmo", CTAs secundarios
- `rose` `oklch(0.62 0.18 25)` — vencidas, warnings
- `ink` `oklch(0.22 0.014 260)` / `parchment` `oklch(0.972 0.006 80)` — texto/bg light
- `charcoal2` `oklch(0.235 0.012 260)` — bg dark
- Categorías: viaje `#3b82f6`, auto `#a855f7`, casa `#10b981`, emergencia `#ef4444`, inversión `#f59e0b`, otro `#64748b`

Tipografías:
- `Sora` para display y UI
- `DM Sans` para body
- `DM Mono` para números (con `font-feature-settings: 'tnum' 1`)

Si tenemos equivalentes en nuestro design system, mapealos. **No hardcodees colores en componentes**.

### 6. Accesibilidad

- Ring de progreso: `role="progressbar"` con `aria-valuenow` / `aria-valuemax`.
- Chips de filtro: `role="radio"` dentro de `role="radiogroup"`.
- Modal de crear: focus trap, `aria-modal="true"`, escape cierra, click fuera cierra.
- Confetti: `aria-hidden="true"`.
- Reduced-motion: respetá `prefers-reduced-motion` (el prototipo ya lo hace — replicalo).

### 7. Estados a soportar (todos están en el prototipo, abrilos desde el panel "Tweaks" abajo a la derecha)

- **Empty**: usuario sin metas → CTA grande + 3 plantillas
- **One**: una sola meta activa
- **Many**: 5-7 metas activas, mostradas en grid 2-col en desktop
- **Mixed**: activas + cumplidas + vencidas (sección separada para cumplidas)
- **Completed**: solo metas cumplidas
- **Overdue**: con al menos una vencida (chip rojo + pulse)
- **Detail**: drilldown de una meta

### 8. Lo que NO está en el prototipo y deberías clarificar con producto antes de implementar

- Compartir meta con otra persona (¿requisito?)
- Notificaciones push cuando se cumple un hito
- Conectar la meta con una inversión que rinda (¿integramos con `/inversiones`?)
- Cómo "liquidar" una meta cumplida: ¿transfiere a cuenta principal? ¿genera movimiento?
- Reglas tipo "redondeá cada gasto a la meta" — fuera de scope inicial, dejá un `TODO` en el modal de crear

### 9. Performance

- Cards usan sparkline SVG inline — fine para hasta ~30 metas. Si llegamos a más, virtualizá la lista.
- Hero hace agregación cliente; si se vuelve pesado, movelo a un endpoint `/api/goals/summary`.
- Conversión MEP: cacheá la cotización 5 min en SWR/React Query.

### 10. Tests

- Unit: cálculo de `requiredMonthly`, `onTrack`, `overdue` con casos edge (sin deadline, deadline = hoy, target = 0).
- Component: `GoalCard` renderiza correctamente cada estado (active/completed/overdue).
- E2E: crear meta → aparece en listado → entrar al detalle → simular → volver.

---

## Entregable

PR con:
1. Componentes nuevos en su carpeta correspondiente
2. Página `/metas` y `/metas/[id]`
3. Tipos + queries
4. Migration si hay cambios de schema
5. Storybook (o equivalente) con todos los estados del prototipo
6. Screenshots del antes / después en la descripción del PR

Cualquier desviación visual del prototipo, justificala. Si algo no se entiende del HTML adjunto, abrilo en el browser, jugá con el panel de Tweaks (toggle abajo a la derecha) para ver todos los estados, y volvé con preguntas concretas antes de empezar.
