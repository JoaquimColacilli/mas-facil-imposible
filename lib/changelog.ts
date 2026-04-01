export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const changelog: ChangelogEntry[] = [
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
