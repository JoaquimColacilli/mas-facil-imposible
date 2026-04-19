export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: '0.22.3',
    date: '2026-04-19',
    changes: [
      'Mejorados los colores de hover del menú de usuario (Ajustes con gris neutro, Cerrar sesión con rojo tenue)'
    ]
  },
  {
    version: '0.22.2',
    date: '2026-04-19',
    changes: [
      'Agregado acceso rápido al detalle de Gastos desde el tile del dashboard (consistencia con Ingresos, Ahorros e Inversiones)'
    ]
  },
  {
    version: '0.22.1',
    date: '2026-04-19',
    changes: [
      'Card del perfil en Ajustes ahora queda sticky en desktop y tablets (md+), para que se vea mientras scrolleás los formularios'
    ]
  },
  {
    version: '0.22.0',
    date: '2026-04-19',
    changes: [
      'Agregado sistema de amigos con búsqueda por username, solicitudes, aceptar, rechazar y bloqueos',
      'Agregado perfil público de amigos con controles de privacidad (mostrar bio, racha de inversión, actividad)',
      'Agregado chat 1:1 en tiempo real con estado en línea, indicador de escritura y confirmación de lectura',
      'Agregada vinculación de préstamos y deudas con amigos: la contraparte confirma y el registro espejo se crea automáticamente',
      'Agregado tab Sugeridos en Amigos con usuarios activos recientes que podés agregar sin buscar',
      'Agregado tiempo real para solicitudes, préstamos vinculados y notificaciones — sin recargar la página',
      'Agregado username único y opción para no aparecer en búsquedas ni sugerencias desde Ajustes',
      'Agregado onboarding con aceptación de Términos y Privacidad, exportar datos personales y eliminar cuenta'
    ]
  },
  {
    version: '0.21.14',
    date: '2026-04-18',
    changes: [
      'Eliminada la sección \'Movimientos recientes\' del buscador Ctrl+K — no funcionaba correctamente'
    ]
  },
  {
    version: '0.21.13',
    date: '2026-04-18',
    changes: [
      'Agregado widget de datos Argentina en el topbar con riesgo país y próximo feriado (clásico y MFI)',
      'Movido el botón de refresh del widget USD adentro del pill para dejar claro que solo refresca la cotización del dólar'
    ]
  },
  {
    version: '0.21.12',
    date: '2026-04-18',
    changes: [
      'Agregado skeleton en el widget de clima del topbar mientras carga la API',
      'Agregado cursor-pointer a los botones Confirmar y Confirmar todos en la barra de gastos pendientes'
    ]
  },
  {
    version: '0.21.11',
    date: '2026-04-18',
    changes: [
      'Corregido hydration mismatch en la tarjeta de mercado del dashboard (guard de montaje antes de renderizar contenido real)',
      'Movido el encabezado de mes al centro del header del dashboard, a la altura del nombre de usuario'
    ]
  },
  {
    version: '0.21.10',
    date: '2026-04-18',
    changes: [
      'Agregado detalle de gastos por categoría en el tooltip del gráfico mensual del dashboard (top 5 agrupadas por categoría y moneda, con contador o nota individual)',
      'Agregado encabezado de mes y año arriba de las KPIs del dashboard',
      'Traducidos \'Monthly Overview\' e \'Income vs. Expenses\' del gráfico a español'
    ]
  },
  {
    version: '0.21.9',
    date: '2026-04-17',
    changes: [
      'Ubicación en Ajustes ahora se guarda automáticamente al seleccionarla (sin botón Guardar)',
      'Corregido tipo de location_lat y location_lng en profiles (NUMERIC a DOUBLE PRECISION) para que el topbar muestre el clima tras guardar'
    ]
  },
  {
    version: '0.21.8',
    date: '2026-04-17',
    changes: [
      'Corregido guardado de ubicación: ahora la card de Ajustes tiene su propio botón \'Guardar ubicación\' y refresca el topbar al guardar'
    ]
  },
  {
    version: '0.21.7',
    date: '2026-04-17',
    changes: [
      'Agregado widget de clima y hora local en el topbar classic y mfi',
      'Agregado selector de ubicación en Ajustes (búsqueda + usar mi ubicación actual)',
      'Agregada migración 011 para campos location_lat, location_lng, location_name y location_timezone en profiles'
    ]
  },
  {
    version: '0.21.6',
    date: '2026-04-16',
    changes: [
      'Retiro de ahorro ahora pide moneda (ARS/USD) — evita retirar en una moneda que no tenés por error',
      'El selector de moneda se autoajusta al portfolio cuando traspasás ahorro a inversión',
      'El default de moneda al retirar es la moneda con mayor saldo positivo en ahorros',
      'Debajo del monto se muestra el saldo disponible por moneda'
    ]
  },
  {
    version: '0.21.5',
    date: '2026-04-16',
    changes: [
      'Modal de Inversiones: skeleton durante la carga al cambiar Mes/Año',
      'Modal de Inversiones: cache por período — switchear entre Mes y Año es instantáneo la segunda vez'
    ]
  },
  {
    version: '0.21.4',
    date: '2026-04-16',
    changes: [
      'Modal de Inversiones: fallback heurístico para logs sin campo type (pre-migración 009) — los colores y el neto del mes vuelven a funcionar',
      'Modal de Ahorros ahora muestra el total acumulado (gran número) y el delta del mes en el subtítulo',
      'Totales de ingresos/ahorros/inversiones muestran signo menos y color rojo cuando son negativos'
    ]
  },
  {
    version: '0.21.3',
    date: '2026-04-16',
    changes: [
      'portfolio_logs ahora tiene campo type (yield/deposit/rescue) — detección exacta sin heurísticas',
      'Aportes desde ahorros se muestran con badge APORTE y color celeste en Movimientos'
    ]
  },
  {
    version: '0.21.2',
    date: '2026-04-16',
    changes: [
      'Modal de Inversiones: selector Mes/Año, neto del período al pie y altura máxima más compacta',
      'Ahorros del dashboard ahora reflejan retiros al instante sin recargar',
      'Corregido display de saldos negativos en tarjetas KPI (muestra signo menos)'
    ]
  },
  {
    version: '0.21.1',
    date: '2026-04-04',
    changes: [
      'Alerta de cierre de mes cuando hay pendientes en los últimos 5 días',
      'Alerta de pendientes arrastrados de meses anteriores en los primeros 5 días del mes',
      'Botón Revisar pendientes hace scroll y expande la barra de pendientes'
    ]
  },
  {
    version: '0.21.0',
    date: '2026-04-04',
    changes: [
      'Command Palette global con Ctrl+K: navegación, acciones rápidas y búsqueda de movimientos',
      'Botón de búsqueda en el sidebar con hint de atajo Ctrl K'
    ]
  },
  {
    version: '0.20.0',
    date: '2026-04-04',
    changes: [
      'Movimientos cancelados excluidos de todos los cálculos de balance, KPIs y gráficos',
      'Balance confirmado visible en la card de Balance Total cuando hay gastos pendientes',
      'Tooltip con detalle de gastos pendientes en la card de Balance Total',
      'Barra de pendientes muestra gastos de todos los meses, agrupados por mes'
    ]
  },
  {
    version: '0.19.2',
    date: '2026-04-04',
    changes: [
      'Toasts estandarizados en toda la app: success verde, error rojo, posición top-right',
      'Toasts de éxito y error en todas las mutaciones (movimientos, metas, deudas, cobros, categorías, inversiones, ajustes)',
      'Toaster agregado al layout MFI',
      'Duración de error toasts: 5 segundos'
    ]
  },
  {
    version: '0.19.1',
    date: '2026-04-04',
    changes: [
      'Agregadas notificaciones toast en todas las mutaciones de Supabase en MFI transacciones'
    ]
  },
  {
    version: '0.19.0',
    date: '2026-04-04',
    changes: [
      'Rediseño completo de la pantalla de Metas: grid responsive de cards con progress rings SVG animados',
      'Agregado resumen global (hero) con total ahorrado, objetivo y progreso general por moneda',
      'Cards de metas con dot de color, ring de progreso animado, barra lineal y menú contextual (pausar, reactivar, completar, eliminar)',
      'Secciones colapsables para Activas, Pausadas y Completadas con headers de sección',
      'Modal de depósito mejorado con saldo actual, cuánto falta y detección automática de meta completada con felicitación',
      'Estado vacío premium centrado con CTA de crear meta',
      'Indicador de deadline: warning amber si vence en menos de 30 días, rojo si ya venció'
    ]
  },
  {
    version: '0.18.6',
    date: '2026-04-04',
    changes: [
      'Cooldown de refresh en Mercado y Dólar MEP ahora muestra contador regresivo en tiempo real (ej: Esperá 25s)'
    ]
  },
  {
    version: '0.18.5',
    date: '2026-04-04',
    changes: [
      'Cobros y deudas: solo se muestran pendientes en la vista principal, los resueltos se ocultan',
      'Agregado botón \'Ver todos\' con modal de historial completo de cobros y deudas',
      'Agregado spinner de carga al marcar un cobro como cobrado o una deuda como pagada'
    ]
  },
  {
    version: '0.18.4',
    date: '2026-04-04',
    changes: [
      'Al eliminar un cobro/deuda resuelto, se elimina también el movimiento asociado',
      'Corregido: el dashboard ahora se refresca automáticamente al marcar cobro/deuda como resuelto',
      'Agregada animación de pulso en las cards de KPI al resolver un cobro o deuda'
    ]
  },
  {
    version: '0.18.3',
    date: '2026-04-04',
    changes: [
      'Cobros y deudas ahora crean movimientos al resolverse (ingreso/gasto)',
      'Idempotencia con resolved_transaction_id para evitar duplicados',
      'Toasts de confirmación al marcar cobro como cobrado o deuda como pagada',
      'Categorías Cobros y Deudas se crean automáticamente si no existen'
    ]
  },
  {
    version: '0.18.2',
    date: '2026-04-03',
    changes: [
      'Fix: error de hydration por botón anidado dentro de botón en barra de pendientes',
      'Fix: proxy de mercado devolvía datos cacheados del CDN — todos los tickers mostraban el mismo precio en prod'
    ]
  },
  {
    version: '0.18.1',
    date: '2026-04-03',
    changes: [
      'Agregado README.md profesional con documentacion completa del proyecto'
    ]
  },
  {
    version: '0.18.0',
    date: '2026-04-03',
    changes: [
      'Rediseño de gastos pendientes: barra colapsable compacta en el dashboard',
      'La barra resume N pendientes con monto total, expandible a lista detallada con confirmación individual',
      'Botón \'Confirmar todos\' con popover de confirmación para acción masiva en dashboard y /transactions',
      'Animaciones suaves: expand/collapse con height transition, fade-out de filas confirmadas',
      'Si hay 0 pendientes la barra no se renderiza; con 1 pendiente muestra el nombre directo'
    ]
  },
  {
    version: '0.17.1',
    date: '2026-04-03',
    changes: [
      'Agregado checkbox \'Agregar otro después de guardar\' en el modal de nuevo movimiento',
      'El formulario se resetea parcialmente al guardar (mantiene categoría, método de pago y moneda)',
      'Toast sutil de confirmación al guardar en modo encadenado',
      'Estado del checkbox persistido en localStorage',
      'Agregado Toaster de Sonner al layout de la app'
    ]
  },
  {
    version: '0.17.0',
    date: '2026-04-03',
    changes: [
      'Agregado soporte para gastos recurrentes mensuales (toggle repetir)',
      'Generación automática on-demand de movimientos recurrentes al abrir el dashboard',
      'Movimientos auto-generados nacen como pendientes para confirmar manualmente',
      'Indicador visual de recurrencia en listas de movimientos',
      'Migración SQL para campos is_recurring y recurring_source_id'
    ]
  },
  {
    version: '0.16.1',
    date: '2026-04-03',
    changes: [
      'Fix: sparklines ahora muestran curvas reales (YAxis con domain dataMin/dataMax en vez de 0 a max)',
      'Reubicada MarketCard en /investments como sidebar sticky al lado del chart de evolución'
    ]
  },
  {
    version: '0.16.0',
    date: '2026-04-03',
    changes: [
      'Fix: YPF ahora aparece correctamente (ticker cambiado de YPF.BA a YPFD.BA)',
      'Agregado tab Crypto en MarketCard con datos de CoinGecko: BTC como hero + ETH, SOL, XRP, ADA, DOGE, DOT, LINK',
      'Tab Acciones/Crypto con persistencia del tab seleccionado en localStorage',
      'Lazy fetch de crypto: solo se activa al seleccionar el tab por primera vez',
      'Expand/collapse independiente para acciones y crypto con persistencia separada',
      'El dot de mercado abierto/cerrado se oculta automáticamente en tab Crypto',
      'Botón refresh aplica al tab activo (acciones o crypto según contexto)',
      'Agregados 6 tests para parseo de respuesta CoinGecko'
    ]
  },
  {
    version: '0.15.0',
    date: '2026-04-03',
    changes: [
      'Ampliada lista de tickers a 10: GGAL, YPF, MELI, BMA, PAMP, TXAR, SUPV, BBAR, LOMA + Merval',
      'Agregado toggle Ver más/Ver menos con persistencia en localStorage para tickers secundarios',
      'Agregadas mini sparklines a cada fila de ticker secundario (40x16px)',
      'Mejorado contraste de badges de variación (opacity y border más pronunciados)',
      'Mejorada jerarquía visual en filas de tickers (nombre muted, precio destacado)',
      'Aumentado grosor de sparkline Merval a 2px con gradient más visible',
      'Integrada MarketCard en /investments expandida por default con chart más alto (48px)',
      'MarketCard ahora acepta props defaultExpanded y chartHeight para adaptarse al contexto'
    ]
  },
  {
    version: '0.14.0',
    date: '2026-04-03',
    changes: [
      'Agregado auto-refresh cada 5 min con polling inteligente (pausa en background, resume en focus) para cotización USD y mercado',
      'Mejorado widget de cotización USD con tooltip detallado (compra/venta, spread, fuente) y botón de refresh manual con cooldown de 30s',
      'Agregada card de Mercado argentino premium en sidebar derecho: MERVAL con mini chart intraday, GGAL, YPF y MELI con variación diaria',
      'Agregado proxy API route para Yahoo Finance (evita CORS) con cache de 60s en el edge',
      'Agregado hook usePolling reutilizable sobre SWR con cache sessionStorage y detección de visibilidad',
      'Agregado indicador de mercado abierto/cerrado con estado contextual (feriado, fin de semana, fuera de horario)',
      'Agregados tests para lógica de mercado, parseo Yahoo Finance y flash de precios'
    ]
  },
  {
    version: '0.13.1',
    date: '2026-04-03',
    changes: [
      'Agregado módulo market-data.ts con lógica de fetching y parsing de datos de mercado argentino desde Yahoo Finance',
      'Incluye detección de estado del mercado (abierto/cerrado), parsing de respuestas Yahoo Chart API, y helpers de UI'
    ]
  },
  {
    version: '0.13.0',
    date: '2026-04-03',
    changes: [
      'Agregado widget de cotización USD (MEP y Blue) en el navbar con cache de 1h y fallback graceful',
      'Agregado widget de racha de inversiones con conteo de días hábiles consecutivos',
      'Los widgets se ocultan automáticamente en mobile',
      'Agregados tests para lógica de parsing de cotización y cálculo de streak'
    ]
  },
  {
    version: '0.12.3',
    date: '2026-04-03',
    changes: [
      'Separado feriado Güemes (17/6) y Bandera (20/6) como entradas independientes',
      'Agregada lógica de traslado al lunes para feriados trasladables (San Martín, Diversidad Cultural, Soberanía Nacional)',
      'Eliminado feriado puente falso del 13/10/2026',
      'Actualizados tests de ar-holidays con cobertura para regla de traslado'
    ]
  },
  {
    version: '0.12.2',
    date: '2026-04-03',
    changes: [
      'Agregado estado de carga visual al navegar entre meses en dashboard, movimientos y MFI',
      'Agregado selector de mes (date picker) en el dashboard para elegir mes directamente',
      'Corregido crash en gráfico cuando transacciones tienen fecha fuera de rango del mes'
    ]
  },
  {
    version: '0.12.1',
    date: '2026-04-03',
    changes: [
      'Badge de feriado/fin de semana ahora aparece debajo del botón de Inversiones'
    ]
  },
  {
    version: '0.12.0',
    date: '2026-04-03',
    changes: [
      'Fix: crash al navegar al mes actual en el dashboard (navegación limpia sin parámetro de mes)',
      'Fix: ahorros ahora muestra el saldo acumulado, no solo los depósitos del mes',
      'Nuevo: retirar ahorros desde el modal de Ahorros',
      'Nuevo: traspasar ahorros a un portfolio de inversión directamente',
      'Retiros de ahorro se muestran diferenciados en naranja en el listado'
    ]
  },
  {
    version: '0.11.3',
    date: '2026-04-03',
    changes: [
      'PDF de inversiones ahora descarga el período activo seleccionado en los chips'
    ]
  },
  {
    version: '0.11.2',
    date: '2026-04-03',
    changes: [
      'Descarga de PDF en pantalla de Inversiones: mes actual, año completo o historial'
    ]
  },
  {
    version: '0.11.1',
    date: '2026-04-03',
    changes: [
      'Fix: doble símbolo \'+\' en rendimiento de portfolios',
      'Simplificado rescate: siempre reduce el saldo del portfolio sin crear movimiento',
      'Acciones de /investments ahora son modales con tooltips explicativos en vez de botones inline'
    ]
  },
  {
    version: '0.11.0',
    date: '2026-04-03',
    changes: [
      'Fix: inversiones ya no muestra /usr/bin/bash en meses sin movimientos — usa saldo acumulado de portfolios',
      'Nuevo: rescate de inversiones desde el modal de portfolios (ingreso en cuenta o solo retirar)',
      'Nuevo: pantalla /investments ahora permite crear portfolios, cargar variación diaria y rescatar',
      'Rescates se muestran diferenciados con badge naranja en la tab de movimientos'
    ]
  },
  {
    version: '0.10.0',
    date: '2026-04-03',
    changes: [
      'Nueva pantalla dedicada de Inversiones en el sidebar',
      'Gráfico de evolución del portfolio con selector de período (1S, 1M, 3M, 6M, YTD, 1A, Máx)',
      'KPIs de valor total y rendimiento del período con colores semánticos',
      'Tabla de holdings con selección de portfolio individual para filtrar el gráfico',
      'Donut de composición por portfolio (visible con 2+ portfolios)',
      'Heatmap de rendimientos mensuales por año con colores de intensidad'
    ]
  },
  {
    version: '0.9.9',
    date: '2026-04-03',
    changes: [
      'Badge de feriado ahora cuelga centrado debajo del grupo de botones del navbar',
      'Agregado botón para marcar gasto pendiente como pagado en la lista de movimientos (check verde al hacer hover)'
    ]
  },
  {
    version: '0.9.8',
    date: '2026-04-03',
    changes: [
      'Fix botón Inversiones sin texto: corregido breakpoint xs a sm',
      'Alertas vuelve a ser ícono sin texto',
      'Agregado cursor-pointer a todos los botones del navbar'
    ]
  },
  {
    version: '0.9.7',
    date: '2026-04-03',
    changes: [
      'Badge de feriado/fin de semana ahora cuelga del navbar como ribbon medieval',
      'Eliminado botón \'Modo rápido\' del navbar',
      'Normalizados estilos de todos los botones del navbar: misma tipografía, tamaño y peso',
      'Agregado chevron al avatar del usuario para indicar que es clickeable',
      'Botones del navbar movidos a la derecha, agrupados cerca de notificaciones y avatar'
    ]
  },
  {
    version: '0.9.6',
    date: '2026-04-03',
    changes: [
      'Fix movimientos no se actualizaban al cambiar de mes: sincronización de state local con props del servidor'
    ]
  },
  {
    version: '0.9.5',
    date: '2026-04-03',
    changes: [
      'Agregados tooltips informativos (ℹ) en cada sección de Análisis explicando qué se visualiza',
      'Fix computeSavingsRates: ahora usa filterByPeriod con normalización de fechas consistente'
    ]
  },
  {
    version: '0.9.4',
    date: '2026-04-03',
    changes: [
      'Tasa de ahorro en modo Todas muestra dos líneas separadas: ARS (azul) y USD (verde) con promedios independientes'
    ]
  },
  {
    version: '0.9.3',
    date: '2026-04-03',
    changes: [
      'Agregada opción \'Todas\' en el filtro de moneda de Análisis que muestra ARS y USD juntas, preseleccionada por defecto',
      'KPI cards muestran ambas monedas cuando \'Todas\' está activo: ARS como valor principal, USD como secundario',
      'Categorías de gastos se etiquetan con (USD) cuando se muestran ambas monedas para no mezclar totales'
    ]
  },
  {
    version: '0.9.2',
    date: '2026-04-03',
    changes: [
      'Fix estado vacío en Análisis cuando hay movimientos en otra moneda: ahora muestra cuántos hay y botón para cambiar',
      'Fix generación de PDF: autoTable se importa como función standalone en vez de extensión de prototipo'
    ]
  },
  {
    version: '0.9.1',
    date: '2026-04-03',
    changes: [
      'Fix textos ilegibles en dark mode: tooltips y labels de charts ahora usan variables del theme',
      'Fix gastos del mes anterior en $0: normalización de fechas con sufijo timestamp',
      'Fix inversiones en $0: la KPI ahora muestra el saldo de portfolios para la moneda seleccionada',
      'Fix color de tasa de ahorro: la línea ahora usa el color semántico de ahorros (azul) en vez de rojo/verde condicional',
      'Agregado tooltip explicativo al toggle \'vs anterior\' con componente shadcn Tooltip',
      'Agregada descarga de PDF con KPIs, categorías y top movimientos usando jsPDF + autoTable en dark theme',
      'Agregados 4 tests nuevos para filterByPeriod y getPeriodRange'
    ]
  },
  {
    version: '0.9.0',
    date: '2026-04-03',
    changes: [
      'Rediseño completo de la pantalla de Análisis con period selector, KPI cards con sparklines, chart de evolución con gradientes, breakdown de categorías con donut interactivo, top movimientos, y tasa de ahorro',
      'Agregado selector de período con chips (Este mes, Mes anterior, 3/6/12 meses, Personalizado) y toggle de moneda ARS/USD',
      'Agregado modo comparación vs período anterior con deltas en KPIs y líneas dashed en el chart',
      'Creado lib/analytics-utils.ts con lógica pura para períodos, agrupaciones, deltas y savings rate',
      'Server page ahora fetchea 25 meses de datos para cubrir todos los rangos y comparaciones',
      'Agregados 27 tests unitarios para analytics-utils'
    ]
  },
  {
    version: '0.8.0',
    date: '2026-04-03',
    changes: [
      'Agregado badge de día no operable en el navbar con mensajes rotativos determinísticos',
      'Refactoreado getHolidays() para retornar { date, name } en lugar de Date[]',
      'Agregada función getHolidayName() para buscar nombre de feriado por fecha',
      'Creado módulo non-trading-messages.ts con selección sin repetición mensual',
      'Agregados 31 tests unitarios para ar-holidays y non-trading-messages'
    ]
  },
  {
    version: '0.7.1',
    date: '2026-04-03',
    changes: [
      'Agregado módulo de feriados argentinos para filtrar días no operables del mercado',
      'Las notificaciones de inversiones ahora se skipean en sábados, domingos y feriados nacionales',
      'Agregados tests unitarios para ar-holidays con vitest'
    ]
  },
  {
    version: '0.7.0',
    date: '2026-04-02',
    changes: [
      'Agregado método de pago (efectivo/débito/crédito) en gastos',
      'Los gastos con tarjeta de crédito se guardan como pendientes automáticamente',
      'Agregado banner de tarjeta pendiente en dashboard con botón para marcar como pagado',
      'Agregado ícono de tarjeta en transacciones recientes y lista de movimientos',
      'Agregado filtro por método de pago en la lista de movimientos'
    ]
  },
  {
    version: '0.6.1',
    date: '2026-04-01',
    changes: [
      'Agregado DatePicker con calendario desplegable en la página de Movimientos',
      'Soporte para saltar a una fecha específica y filtrar por día',
      'Botones rápidos: Hoy y Ver mes completo dentro del calendario',
      'Dropdowns de mes y año en el calendario para navegación rápida'
    ]
  },
  {
    version: '0.6.0',
    date: '2026-04-01',
    changes: [
      'Rediseño completo de la página de Movimientos (/transactions)',
      'Agregado navegador de meses con indicador visual de mes histórico',
      'Agregado resumen mensual con totales por tipo (ingresos, gastos, ahorros, inversiones)',
      'Agregado paginador con 25 movimientos por página',
      'Agregados filtros por moneda (ARS/USD) y estado (confirmado/pendiente/cancelado)',
      'Agregado chip filters con opción de limpiar todos los filtros',
      'Mejorado estado vacío con mensajes contextuales según mes actual o histórico'
    ]
  },
  {
    version: '0.5.1',
    date: '2026-04-01',
    changes: [
      'Agregado selector de moneda (ARS/USD) al crear portfolios de inversión',
      'Creado script de migración para corregir moneda de portfolio COCOS CAPITAL a USD'
    ]
  },
  {
    version: '0.5.0',
    date: '2026-04-01',
    changes: [
      'Rediseño completo de la página de Ajustes con layout de 2 columnas',
      'Agregado upload de avatar con crop circular y Supabase Storage',
      'Agregado campo de apodo/nickname en el perfil',
      'Agregado mood/estado con emoji y texto corto estilo Discord',
      'Agregada sección de seguridad para cambiar contraseña',
      'Avatar real y mood emoji visibles en sidebar y topbar'
    ]
  },
  {
    version: '0.4.1',
    date: '2026-04-01',
    changes: [
      'Rediseñado banner de resumen mensual: ahora aparece compacto junto al navegador de mes en el dashboard',
      'Corregida creación de notificación mensual (filtro JSON mejorado)',
      'Corregido popover de notificaciones que no se mostraba correctamente (overflow del header)',
      'Corregido botón X de cierre del banner de resumen'
    ]
  },
  {
    version: '0.4.0',
    date: '2026-04-01',
    changes: [
      'Agregado banner de resumen mensual con descarga de Excel y PDF (días 1-5 de cada mes)',
      'Agregada notificación automática cuando el resumen mensual está disponible',
      'Agregada descarga de reportes desde notificaciones (popover y página)',
      'Agregado server action para obtener datos del reporte mensual con decryptación'
    ]
  },
  {
    version: '0.3.4',
    date: '2026-04-01',
    changes: [
      'Fix dropdown moneda (ARS/USD) visible por encima del modal al agregar gasto',
      'Corregido mes actual en dashboard usando timezone America/Argentina/Buenos_Aires',
      'Reemplazado window.location.reload() por router.refresh() al agregar transacción'
    ]
  },
  {
    version: '0.3.3',
    date: '2026-03-31',
    changes: [
      'Corregido: popup de novedades ahora persiste el estado localmente y no se repite en cada recarga',
      'Limpieza de entradas de changelog de prueba',
      'Agregado script SQL para columna last_seen_version en profiles'
    ]
  },
  {
    version: '0.3.2',
    date: '2026-03-31',
    changes: [
      'Formateo automático es-AR en todos los inputs de monto: punto como separador de miles, coma para decimales',
      'Widget de Inversiones: movimientos ahora muestran porcentaje de rendimiento y variación absoluta',
      'Corregido: transacciones de inversión mostraban $0 debido al cifrado (ahora se descifran correctamente)',
      'Changelog de novedades ahora aparece también en el dashboard clásico, no solo en modo MFI',
      'Corregido: el popup de novedades aparecía en cada F5 (ahora se muestra una sola vez)'
    ]
  },
  {
    version: '0.2.0',
    date: '2026-03-31',
    changes: [
      'Sistema completo de Novedades (Changelog en pop-up)',
      'Arreglados tipados de KeyboardEvent en el cliente de transacciones',
      'Corrección de guardado de ingresos sin categoría'
    ]
  },
  {
    version: '0.1.1',
    date: '2026-03-31',
    changes: [
      'Agregado sistema de Novedades (Changelog)',
      'Corregido error de navegación (teclas de flechas) al visualizar transacciones',
      'Corregido guardado de transacciones de ingreso (sin categoría)'
    ]
  }
];
