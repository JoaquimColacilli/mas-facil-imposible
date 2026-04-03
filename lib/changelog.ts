export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const changelog: ChangelogEntry[] = [
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
