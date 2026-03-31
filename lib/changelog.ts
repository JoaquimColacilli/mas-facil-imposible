export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const changelog: ChangelogEntry[] = [
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
